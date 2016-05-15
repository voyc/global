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
$executionTime = microtime(true);

// inputs
$taint_q = isset($_REQUEST['q']) ? $_REQUEST['q'] : false;
$taint_begin = isset($_REQUEST['begin']) ? $_REQUEST['begin'] : -3000;
$taint_end = isset($_REQUEST['end']) ? $_REQUEST['end'] : 2000;
$taint_n = isset($_REQUEST['n']) ? $_REQUEST['n'] : 90;
$taint_s = isset($_REQUEST['s']) ? $_REQUEST['s'] : -90;
$taint_e = isset($_REQUEST['e']) ? $_REQUEST['e'] : 180;
$taint_w = isset($_REQUEST['w']) ? $_REQUEST['w'] : -180;
$taint_queryMode = isset($_REQUEST['qm']) ? $_REQUEST['qm'] : "filter";  // search or filter
$taint_ctime = isset($_REQUEST['ctime']) ? $_REQUEST['ctime'] : false;
$taint_maplevel = isset($_REQUEST['ml']) ? $_REQUEST['ml'] : 0;
$taint_timelevel = isset($_REQUEST['tl']) ? $_REQUEST['tl'] : 0;
$taint_rf = isset($_REQUEST['rf']) ? $_REQUEST['rf'] : 0;
$taint_stg = isset($_REQUEST['stg']) ? $_REQUEST['stg'] : 0;
$taint_bf = isset($_REQUEST['bf']) ? $_REQUEST['bf'] : 0;
$taint_max = isset($_REQUEST['max']) ? $_REQUEST['max'] : 500;
$taint_callback = isset($_REQUEST['callback']) ? $_REQUEST['callback'] : 'ready';

// validate inputs TODO
$q = validateQuery($taint_q);
$begin = $taint_begin;
$end = $taint_end;
$n = $taint_n;
$s = $taint_s;
$e = $taint_e;
$w = $taint_w;
$queryMode = validateQueryMode($taint_queryMode);
$ctime = $taint_ctime;
$maplevel = $taint_maplevel;
$timelevel = $taint_timelevel;
$rf = $taint_rf;
$bf = $taint_bf;
$max = $taint_max;
$callback = $taint_callback;



// balancing factors bf=7-3.534
$a = split('-', $bf);
$numTimeRows = $a[0];
$pctTimeWidth = $a[1];  // remember the time span requested is double what's on screen
$maxDataPoints = floor($numTimeRows * (1/($pctTimeWidth/100)));
$maxDataPoints *= 2;  // double it to be safe

// build the sql
$columnList = "id, timebegin, timeend, forebear, translate(headline,chr(10),';') as headline, abstract, xmin(the_geom), xmax(the_geom), ymin(the_geom), ymax(the_geom), maptype, maplvlhi, maplvllo, timetype, timelvlhi, timelvllo, color, imageurl, thumburl, magnitude, datatype, AsText(the_geom)";

// start with search keywords, if any
$whereClause = parseQuery("fulltext", $q);

// for a search request, we search all space and time
if ($queryMode == "search") {
}

// for a filter request, we search within specified space and time coordinates
if ($queryMode == "filter") {

	// for now, we're doing only events
	if ($timelevel < 4) {
		if ($whereClause) {$whereClause .= ' and';}
		$whereClause .= ' datatype = 11';
		$whereClause .= ' and editstatus = 0';
	}
	else {
		if ($whereClause) {$whereClause .= ' and';}
		$whereClause .= ' editstatus <> 42';
	}
	
	// If international dateline is onscreen, the west boundary is numerically greater than the east boundary.
	// TODO: If an object straddles the international date line, or is close to the poles, cartesian calculations are invalid.
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

	if ($longitudeClause) {
		if ($whereClause) { $whereClause .= " and "; };
		$whereClause .= $longitudeClause;
	}
	if ($n && $s) {
		if ($whereClause) { $whereClause .= " and "; };
		$whereClause .= "ymin(the_geom) <= $n and ymax(the_geom) > $s";
	}
//	if ($timelevel) {
//		if ($whereClause) { $whereClause .= " and "; };
//		$whereClause .= "timelvllo <= $timelevel and timelvlhi >= $timelevel";
//	}
//	if ($maplevel) {
//		if ($whereClause) { $whereClause .= " and "; };
//		$whereClause .= "maplvllo <= $maplevel and maplvlhi >= $maplevel";
//	}
}

// add begin and end to the where clause
if ($whereClause) { $whereClause .= " and "; };
$whereClause .= "the_geom is not null";
$whereClause .= " and ";
$whereClause .= "timeend >= ".$begin;
$whereClause .= " and ";
$whereClause .= "timebegin <= ".$end;
$whereClause = "where $whereClause ";

// the query
$sql = "select ".$columnList." from fpd.fpd ".
       $whereClause.
       "order by magnitude desc ";
//       "limit ".$maxDataPoints;

// sql is finished
jlog(JLOG_DEBUG,$sql);
	
//establish a connection to database 
$conn = @pg_connect("port=$dbport dbname=$dbname user=$dbuser password=$dbpassword");
if (!$conn) {
	jlog(JLOG_DEBUG,"unable to connect");
	return false;
}

//execute SQL query 
$result = @pg_query($conn, $sql);
if (!$result) {
	jlog(JLOG_DEBUG,"Query error ".pg_last_error()." $sql");
	return;
}

// get the number of rows in the resultset
$numrows = pg_num_rows($result);

// begin the output
echo $callback.'({data:{';

// allocate storage for use inside the loop
$mincolor = 1;
$maxcolor = 6;
$c = $mincolor -1;
$previousForebear = -1;
$outcount = 0;
$a = convertUnixTimestampToDecimalDate( time());
$currentTime = $a['decidate'];
$bounds = array('q' => $q, 'qm' => $queryMode, 'n' => -90, 's'=>90, 'w' => 180, 'e' => -180, 'begin' => 7777, 'end' => -3000, 'cid' => 0, 't' => 0);
$minimumDistanceFromCenter = 1000000;

// iterate through resultset
for ($i=0; $i<$numrows; $i++) {
	$row = pg_fetch_array($result, $i, PGSQL_ASSOC);
	$id = $row['id'];
	
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

	// finish the placemark
	echo "]}\n";
	$outcount++;
}

// finish the output
$executionTime = microtime(true) - $executionTime;
$sbounds = "{q:'".$bounds['q']."',qm:'".$bounds['qm']."',begin:".$bounds['begin'].",end:".$bounds['end'].",n:".$bounds['n'].",s:".$bounds['s'].",w:".$bounds['w'].",e:".$bounds['e'].",cid:".$bounds['cid']."}";
echo "},rf:$rf,count:$outcount,bounds:$sbounds,executionTime:$executionTime});";
return;

//---------------------------------------

function validateQueryMode($taint_queryMode) {
	if ($taint_queryMode == "search" || $taint_queryMode == "filter") {
		return $taint_queryMode;
	}
	else {
		jlog(JLOG_DEBUG,"invalid qm value"); 
		exit;
	}
}

function validateQuery($taint_query) {
	if ($taint_queryMode == "search" || $taint_queryMode == "filter") {
		return $taint_queryMode;
	}
	else {
		jlog(JLOG_DEBUG,"invalid qm value"); 
		exit;
	}
}
?>
