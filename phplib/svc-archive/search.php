<?php
// (c) Copyright 2008,2014 voyc.com
/**
 * A web service to search for records.
 */

/**
 *
 */
require_once(dirname(__FILE__).'/../../phplib/config.php');
require_once(dirname(__FILE__).'/../../phplib/jlog.php');
include("../../phplib/decDate.php");
include("../../phplib/parseQuery.php");

openjlog(basename(__FILE__));

// inputs
$taint_q = isset($_REQUEST['q']) ? $_REQUEST['q'] : false;
$taint_begin = isset($_REQUEST['begin']) ? $_REQUEST['begin'] : -3000;
$taint_end = isset($_REQUEST['end']) ? $_REQUEST['end'] : 2000;
$taint_n = isset($_REQUEST['n']) ? $_REQUEST['n'] : 90;
$taint_s = isset($_REQUEST['s']) ? $_REQUEST['s'] : -90;
$taint_e = isset($_REQUEST['e']) ? $_REQUEST['e'] : 180;
$taint_w = isset($_REQUEST['w']) ? $_REQUEST['w'] : -180;
$taint_queryMode = isset($_REQUEST['qm']) ? $_REQUEST['qm'] : "filter";  // search or filter
$taint_method = isset($_REQUEST['method']) ? $_REQUEST['method'] : "image";  // image or polygon
$taint_ctime = isset($_REQUEST['ctime']) ? $_REQUEST['ctime'] : false;
$taint_maplevel = isset($_REQUEST['ml']) ? $_REQUEST['ml'] : 0;
$taint_timelevel = isset($_REQUEST['tl']) ? $_REQUEST['tl'] : 0;
$taint_rf = isset($_REQUEST['rf']) ? $_REQUEST['rf'] : 0;
$taint_stg = isset($_REQUEST['stg']) ? $_REQUEST['stg'] : 0;
$taint_sd = isset($_REQUEST['sd']) ? $_REQUEST['sd'] : 0;
$taint_bf = isset($_REQUEST['bf']) ? $_REQUEST['bf'] : 0;
$taint_max = isset($_REQUEST['max']) ? $_REQUEST['max'] : 500;

// validate inputs TODO
$q = $taint_q;
$begin = $taint_begin;
$end = $taint_end;
$n = $taint_n;
$s = $taint_s;
$e = $taint_e;
$w = $taint_w;
if ($taint_queryMode == "search" || $taint_queryMode == "filter") {
	$queryMode = $taint_queryMode;
}
else {
	jlog(JLOG_DEBUG,"invalid qm value"); 
	return;
}
$method = $taint_method;
$ctime = $taint_ctime;
$maplevel = $taint_maplevel;
$timelevel = $taint_timelevel;
$rf = $taint_rf;
$stg = $taint_stg;
$max = $taint_max;

// screen dimensions sd=600-400-800-150
$a = split('-', $taint_sd);
$timeWidthInPixels  = isset($a[0]) && $a[0] ? $a[0] : 800;
$timeHeightInPixels = isset($a[1]) ? $a[1] : 150;
$geoWidthInPixels   = isset($a[2]) ? $a[2] : 600;
$geoHeightInPixels  = isset($a[3]) ? $a[3] : 400;

// balancing factors bf=1-8-100-100-100-10-10
$a = split('-', $taint_bf);
$balancing	          = ($a[0] > 0) ? true : false;
$balancingTest			= ($a[0] > 1) ? true : false;
$maxTimeRank			= isset($a[1]) ? $a[1] : 10;
$maxTimeRank			= 100;
$maxGeoRank             = isset($a[2]) ? $a[2] : 10;
$timeChunkWidthInPixels = isset($a[3]) ? $a[3] : 200;
$geoChunkWidthInPixels  = isset($a[4]) ? $a[4] : 200;
$geoChunkHeightInPixels = isset($a[5]) ? $a[5] : 200;

$minNumChunks = 3;

$timeHeightInPixels = isset($a[1]) ? $a[1] : 150;


if ($balancingTest) {
	echo "begin: $begin<br/>";	
	echo "end: $end<br/>";	
	echo "n: $n<br/>";	
	echo "s: $s<br/>";	
	echo "e: $e<br/>";	
	echo "w: $w<br/>";	
	echo "stg: $stg<br/>";	
	echo "timeWidthInPixels: $timeWidthInPixels<br/>";	
	echo "timeHeightInPixels: $timeHeightInPixels<br/>";	
	echo "geoWidthInPixels: $geoWidthInPixels<br/>";	
	echo "geoHeightInPixels: $geoHeightInPixels<br/>";	
	echo "balancing: $balancing<br/>";	
	echo "timeChunkWidthInPixels: $timeChunkWidthInPixels<br/>";	
	echo "geoChunkWidthInPixels: $geoChunkWidthInPixels<br/>";	
	echo "geoChunkHeightInPixels: $geoChunkHeightInPixels<br/>";	
	echo "maxTimeRank: $maxTimeRank<br/>";	
	echo "maxGeoRank: $maxGeoRank<br/>";	
}

// constants
$eol = "\n";
$baseAltitude = 30000;
$labelScale = 1.5;
$mincolor = 1;
$maxcolor = 6;

//establish a connection to database 
$conn = @pg_connect("port=$dbport dbname=$dbname user=$dbuser password=$dbpassword");
if (!$conn) {
	jlog(JLOG_DEBUG,"unable to connect");
	return false;
}

// build the sql. start with search keywords, if any
$queryClause = parseQuery("fulltext", $q);

// for now, we're doing only events
if ($timelevel < 4) {
	if ($queryClause) {$queryClause .= ' and';}
	$queryClause .= ' datatype = 11';
	$queryClause .= ' and editstatus = 0';
}
else {
	if ($queryClause) {$queryClause .= ' and';}
	$queryClause .= ' editstatus <> 42';
}

// for a search request, find the boundaries of the smallest area that contains all the requested records
if ($queryMode == "search") {
	$sql =  'select min(xmin(the_geom)) as w, min(xmax(the_geom)) as e, min(ymin(the_geom)) as s, min(ymax(the_geom)) as n,'.
			' min(timebegin) as begin, max(timeend) as end'.
			' from fpd.fpd'.
			' where ' . $queryClause;

	jlog(JLOG_DEBUG,$sql);
	if ($balancingTest) {
		echo "$sql\n";
	}
	
	//execute SQL query 
	$result = @pg_query($conn, $sql);
	if (!$result) {
		jlog(JLOG_DEBUG,"Query error ".pg_last_error()." $sql");
		return;
	}
	
	// get the number of rows in the resultset
	$numrows = pg_num_rows($result);

	if ($numrows != 1) {
		jlog(JLOG_DEBUG,"Row count not one ".pg_last_error()." $sql");
		return;
	}
			
	// read the one row.  These values replace the input parameters of the same name.
	$row = pg_fetch_array($result, 0, PGSQL_ASSOC);
	$begin = $row['begin'];
	$end = $row['end'];
	$n = $row['n'];
	$s = $row['s'];
	$e = $row['e'];
	$w = $row['w'];

	$ctime = $begin + (($end - $begin) / 2);
	jlog(JLOG_DEBUG,"$begin - $end");
}

// prepare chunks for time balancing
if ($balancing) {
	// divide the timeline into chunks
	$timeChunks = array();
	$numTimeChunks = floor($timeWidthInPixels / $timeChunkWidthInPixels);
	$numTimeChunks = max($numTimeChunks, $minNumChunks);
	$timeChunkWidthInDecDate = ($end - $begin) / $numTimeChunks;
	for ($i=0; $i<$numTimeChunks; $i++) {
		$timeChunks[] = array( 'begin'=> $begin+($i*$timeChunkWidthInDecDate), 'end'=>$begin+(($i+1)*$timeChunkWidthInDecDate), 'count'=>0, 'take'=>0, 'maxRank'=>$maxTimeRank);
	}

	if ($balancingTest) {
		echo "numTimeChunks: $numTimeChunks<br/>";	
		echo "timeChunkWidthInDecDate: $timeChunkWidthInDecDate<br/>";	
		echoarray($timeChunks);
	}
}

// get the coordinates only if using polygon method
$columnList = "id, timebegin, timeend, forebear, translate(headline,chr(10),';') as headline, abstract, xmin(the_geom), xmax(the_geom), ymin(the_geom), ymax(the_geom), maptype, maplvlhi, maplvllo, timetype, timelvlhi, timelvllo, color, imageurl, thumburl, magnitude, datatype";
if ($method  == "polygon") {
	$columnList .= ", AsText(the_geom)";
}

// if international dateline is onscreen, the west boundary is numerically greater than the east boundary
$longitudeClause = "";
if ($w && $e) {
	if ($w < $e) {
		$longitudeClause = "xmin(the_geom) <= $e and xmax(the_geom) > $w";
	}
	else {
		$longitudeClause = "((xmin(the_geom) <= 180 and xmax(the_geom) > $w)".
	       				   " or (xmin(the_geom) <= $e and xmax(the_geom) > -180))";
	}
}

// TODO: What if an object straddles the international date line, or is close to the poles?
// Cartesian calculations are invalid

$whereClauseBase = $queryClause;

if ($queryMode == "filter") {
	if ($longitudeClause) {
		if ($whereClauseBase) { $whereClauseBase .= " and "; };
		$whereClauseBase .= $longitudeClause;
	}
	if ($n && $s) {
		if ($whereClauseBase) { $whereClauseBase .= " and "; };
		$whereClauseBase .= "ymin(the_geom) <= $n and ymax(the_geom) > $s";
	}
//	if ($timelevel) {
//		if ($whereClauseBase) { $whereClauseBase .= " and "; };
//		$whereClauseBase .= "timelvllo <= $timelevel and timelvlhi >= $timelevel";
//	}
//	if ($maplevel) {
//		if ($whereClauseBase) { $whereClauseBase .= " and "; };
//		$whereClauseBase .= "maplvllo <= $maplevel and maplvlhi >= $maplevel";
//	}
}

// begin the script
echo 'g.data.ready({';

// allocate storage for use inside the loop
$previousForebear = -1;
$c = $mincolor -1;
$timePointCount = 0;
$outcount = 0;
$a = convertUnixTimestampToDecimalDate( time());
$currentTime = $a['decidate'];
$st = (strlen($queryClause) > 0) ? 1 : 0;
$bounds = array('q' => $q, 'qm' => $queryMode, 'n' => -90, 's'=>90, 'w' => 180, 'e' => -180, 'begin' => 7777, 'end' => -3000, 'cid' => 0);
$minimumDistanceFromCenter = 1000000;

// save a stack of ids to eliminate dupes in the result set
$aIds = array();

// make one sql call for each timechunk
for ($chunk=0; $chunk<$numTimeChunks; $chunk++) { 

	// add begin and end to the where clause
	$whereClause = $whereClauseBase;
	if ($whereClause) { $whereClause .= " and "; };
	$whereClause .= "the_geom is not null";
	$whereClause .= " and ";
	$whereClause .= "timeend >= ".$timeChunks[$chunk]['begin'];
	$whereClause .= " and ";
	$whereClause .= "timebegin <= ".$timeChunks[$chunk]['end'];
	$whereClause = "where $whereClause ";
	
	// the query
	$sql = "select ".$columnList." from fpd.fpd ".
	       $whereClause.
	       "order by magnitude desc ".
	       "limit $maxTimeRank";
	if ($chunk == 0) {
		jlog(JLOG_DEBUG,$sql);
	}
	
	//execute SQL query 
	$result = @pg_query($conn, $sql);
	if (!$result) {
		jlog(JLOG_DEBUG,"Query error ".pg_last_error()." $sql");
		return;
	}
	
	// get the number of rows in the resultset
	$numrows = pg_num_rows($result);

	// iterate through resultset
	for ($i=0; $i<$numrows; $i++) {
		$row = pg_fetch_array($result, $i, PGSQL_ASSOC);
		$id = $row['id'];
		
		// test for dupes
		if (isset($aIds[$id])) {
			continue;
		}
		$aIds[$id] = 1;
		
		$h = addslashes($row['headline']);
		$b = $row['timebegin'];
		$e = $row['timeend'];
		$f = $row['forebear'];
	
		$gn = $row['ymax'];
		$gs = $row['ymin'];
		$ge = $row['xmax'];
		$gw = $row['xmin'];
		$mlh = $row['maplvlhi'];
		$mll = $row['maplvllo'];
		$tlh = $row['timelvlhi'];
		$tll = $row['timelvllo'];
		$mt = $row['maptype'];
		$tt = $row['timetype'];
		$c = $row['color'];
		$tu = (isset($row['thumburl'])) ? $row['thumburl'] : $row['imageurl'];
		$mag = $row['magnitude'];
	
	
		if ($e == 7777) {
			$e = $currentTime;
		}
	
		// calc time/space boundaries of the result set
		if ($row['datatype'] == 11) {
			if ($bounds["n"] < $gn) {
				$bounds["n"] = $gn;
			}
			if ($bounds["s"] > $gs) {
				$bounds["s"] = $gs;
			}
			if ($bounds["w"] > $gw) {
				$bounds["w"] = $gw;
			}
			if ($bounds["e"] < $ge) {
				$bounds["e"] = $ge;
			}
			if ($bounds["begin"] > $b) {
				$bounds["begin"] = $b;
			}
			if ($bounds["end"] < $e) {
				$bounds["end"] = $e;
			}
		}
	
		// find the centermost point on the timeline
		$distance = abs($b - $ctime);
		if ($distance < $minimumDistanceFromCenter) {
			$minimumDistanceFromCenter = $distance;
			$bounds["cid"] = $id;
		}
	
		// assign a color - for someday when we do dynamic polygon drawing
		//if ($previousForebear != $row['forebear'] || $row['forebear'] <= 0) {
		//	$c++;
		//	if ($c >= $maxcolor) {
		//		$c = $mincolor;
		//	}
		//	$previousForebear = $row['forebear'];
		//}
	
		// put a comma between records
		if ($outcount > 0) {
			echo ",";
		}
	
		// begin the placemark
		echo $id.":{b:$b,e:$e,h:\"$h\",c:$c,f:$f,gn:$gn,gs:$gs,ge:$ge,gw:$gw,mlh:$mlh,mll:$mll,tlh:$tlh,tll:$tll,mt:$mt,tt:$tt,tu:\"$tu\",mag:$mag,p:[";
	
		switch ($mt) {
			case 2:  // polygon
				$pattern = "/POLYGON\(\((.*?)\)\)/";
				$items;
				$matchcount = preg_match( $pattern, $row['astext'], $items);
	
				// $matchcount will always be one.  We are not doing multi-polygons now.
				if ($matchcount) {
					$polygons = split("\)\),\(\(", $items[1]);
					$polygonCount = count($polygons);
					for ($p=0; $p<$polygonCount; $p++) {
				
						// draw the coordinates
						$coords = split(",", $polygons[$p]);
						$coordCount = count($coords);
						for ($j=0; $j<$coordCount; $j++) {
							if ($j > 0) {
								echo ",";
							}
							$co = split(" ",$coords[$j]);
							echo "[".round($co[1],6).",".round($co[0],6)."]";
						}
					}
				}
				break;
			case 5:  // point
				echo "[".round($row['ymin'],6).",".round($row['xmin'],6)."],";  // sw
				echo "[".round($row['ymax'],6).",".round($row['xmax'],6)."]";  // ne
				break;			
		}
/*		
		switch ($method) {
			case "polygon":
				// draw the polygons
				$pattern = "/POLYGON\(\((.*?)\)\)/";
				$items;
				$matchcount = preg_match( $pattern, $row['astext'], $items);
	
				// $matchcount will always be one.  We are not doing multi-polygons now.
				if ($matchcount) {
					$polygons = split("\)\),\(\(", $items[1]);
					$polygonCount = count($polygons);
					for ($p=0; $p<$polygonCount; $p++) {
				
						// draw the coordinates
						$coords = split(",", $polygons[$p]);
						$coordCount = count($coords);
						for ($j=0; $j<$coordCount; $j++) {
							if ($j > 0) {
								echo ",";
							}
							$co = split(" ",$coords[$j]);
							echo "[".round($co[1],6).",".round($co[0],6)."]";
						}
					}
				}
				break;
			case "image":
				echo "[".round($row['ymin'],6).",".round($row['xmin'],6)."],";  // sw
				echo "[".round($row['ymax'],6).",".round($row['xmax'],6)."]";  // ne
				break;			
		}
*/	
		// finish the placemark
		echo "]}\n";
		$outcount++;
	}
}

// finish the script
$sbounds = "{stage:$stg,q:'".$bounds['q']."',qm:'".$bounds['qm']."',begin:".$bounds['begin'].",end:".$bounds['end'].",n:".$bounds['n'].",s:".$bounds['s'].",w:".$bounds['w'].",e:".$bounds['e'].",cid:".$bounds['cid']."}";

//echo "}; g.data.ready($rf,$outcount,$sbounds);";
echo "},$rf,$outcount,$sbounds);";

if ($balancing && $balancingTest) {
	echo "<br/><br/>";
	echoarray($timeChunks);
	//echoarray($geoChunks);
}
return;  // done


//---------------------------------------
// Comparison function for uasort()
function cmp($a, $b) {
	if ($a['count'] == $b['count']) {
		return 0;
	}
	return ($a['count'] < $b['count']) ? -1 : 1;
}

function echoarray($a) {
	$totcount = 0;
	$tottake = 0;
	$m = 0;
	foreach ($a as $value) {
		echo "$m : ";
		$m++;
		print_r($value);
		echo "<br/>";
		$totcount += $value['count'];
		$tottake += $value['take'];
	}
	echo "total count: $totcount, take: $tottake<br/><br/>";
}

//----------------------------------------------------------
// (c) Copyright 2008 voyc.com
?>
