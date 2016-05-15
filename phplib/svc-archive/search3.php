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
$taint_queryMode = isset($_REQUEST['qm']) ? $_REQUEST['qm'] : 'f';  // search or filter
$taint_begin = isset($_REQUEST['begin']) ? $_REQUEST['begin'] : false;
$taint_end = isset($_REQUEST['end']) ? $_REQUEST['end'] : false;
$taint_ctime = isset($_REQUEST['ctime']) ? $_REQUEST['ctime'] : false;
$taint_timelevel = isset($_REQUEST['tl']) ? $_REQUEST['tl'] : false;
$taint_n = isset($_REQUEST['n']) ? $_REQUEST['n'] : false;
$taint_s = isset($_REQUEST['s']) ? $_REQUEST['s'] : false;
$taint_e = isset($_REQUEST['e']) ? $_REQUEST['e'] : false;
$taint_w = isset($_REQUEST['w']) ? $_REQUEST['w'] : false;
$taint_maplevel = isset($_REQUEST['ml']) ? $_REQUEST['ml'] : false;
$taint_rf = isset($_REQUEST['rf']) ? $_REQUEST['rf'] : false;
$taint_max = isset($_REQUEST['max']) ? $_REQUEST['max'] : 50;
$taint_callback = isset($_REQUEST['callback']) ? $_REQUEST['callback'] : 'ready';

// validate inputs
$q = validateQuery($taint_q);
$begin = validateFloat($taint_begin);
$end = validateFloat($taint_end);
$n = validateFloat($taint_n);
$s = validateFloat($taint_s);
$e = validateFloat($taint_e);
$w = validateFloat($taint_w);
$queryMode = validateQueryMode($taint_queryMode);
$ctime = validateFloat($taint_ctime);
$maplevel = validateInt($taint_maplevel);
$timelevel = validateInt($taint_timelevel);
$rf = validateInt($taint_rf);
$max = validateInt($taint_max);
$callback = validateJSName($taint_callback);

// build the sql
$columnList = "id, timebegin, timeend, forebear, translate(headline,chr(10),';') as headline, abstract, xmin(the_geom), xmax(the_geom), ymin(the_geom), ymax(the_geom), maptype, maplvlhi, maplvllo, timetype, timelvlhi, timelvllo, color, imageurl, thumburl, magnitude, datatype, AsText(the_geom)";
$params = array();
$paramnum = 1;
$whereClause = '';

// start with search keywords, if any
if (substr($q,0,9) == 'datatype:') {
	$a = processCommand(substr($q,9));
	$whereClause = $a['s'];
	$params = $a['a'];
}
elseif (strlen($q) > 0) {
	$whereClause = "tsfulltext @@ plainto_tsquery(".nextParam().")";
	array_push($params, $q);
}

// for a search request, we search all space and time
if ($queryMode == 's') {
}

// for a filter request, we search within specified space and time coordinates
elseif ($queryMode == 'f') {
	// add begin and end boundaries to the where clause
	// TODO: put index on timeend, timebegin
	if ($whereClause) { $whereClause .= " and "; };
	$whereClause .= "timeend >= ".$begin;
	if ($whereClause) { $whereClause .= " and "; };
	$whereClause .= "timebegin <= ".$end;

	// geo boundaries
	$whereClause .= " and ";
	$whereClause .= "the_geom is not null";

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

	// map and time zoom levels
	if ($timelevel) {
		if ($whereClause) { $whereClause .= " and "; };
		$whereClause .= "timelvllo <= $timelevel and timelvlhi >= $timelevel";
	}
	if ($maplevel) {
		if ($whereClause) { $whereClause .= " and "; };
		$whereClause .= "maplvllo <= $maplevel and maplvlhi >= $maplevel";
	}
}

$limitclause = '';
if ($max) {
	$limitclause = 'limit '.nextParam();
	array_push($params, $max);
}

// the query
$sql = "select $columnList from fpd.fpd ".
       "where $whereClause ".
       "order by magnitude desc ".
       $limitclause;

// sql is finished
jlog(JLOG_DEBUG,$sql);
	
//establish a connection to database 
$conn = @pg_connect("port=$dbport dbname=$dbname user=$dbuser password=$dbpassword");
if (!$conn) {
	jlog(JLOG_DEBUG,"unable to connect");
	return false;
}

//execute SQL query 
$result = pg_query_params($conn, $sql, $params);
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
$bounds = array('q' => $q, 'qm' => $queryMode, 'n' => -90, 's'=>90, 'w' => 180, 'e' => -180, 'begin' => 7777, 'end' => -3000, 'cid' => 0);
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

	// find the centermost point on the timeline
	$distance = abs($b - $ctime);
	if ($distance < $minimumDistanceFromCenter) {
		$minimumDistanceFromCenter = $distance;
		$bounds["cid"] = $id;
	}

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

function validateQueryMode($s) {
	$r = '';
	if ($s === 's' || $s === 'f') {
		$r = $s;
	}
	else {
		jlog(JLOG_DEBUG,"invalid qm input"); 
		exit;
	}
	return $r;
}
function validateFloat($s) {
	if (!$s) {
	}
	else {
		$r = '';
		if (is_numeric($s)) {
			$r = $s;
		}
		else {
			jlog(JLOG_DEBUG,"invalid float input"); 
			exit;
		}
	}
	return $r;
}
function validateInt($s) {
	$r = '';
	if (!$s) {
	}
	else {
		if (is_numeric($s)) {
			$r = $s;
		}
		else {
			jlog(JLOG_DEBUG,"invalid int input"); 
			exit;
		}
	}
	return $r;
}
function validateJSName($s) {
	$r = '';
	if (!$s) {
	}
	else {
		$pattern = '~^[A-Za-z0-9_\.]+$~i';
		preg_match($pattern, $s, $matches);
		if (count($matches) > 0) {
			$r = $matches[0];
		}
		else {
			jlog(JLOG_DEBUG,"invalid jsname input"); 
			exit;
		}
	}
	return $r;
}
function validateQuery($s) {
	$r = '';
	if (!$s) {
	}
	else {
		$pattern = '~^[A-Za-z0-9_\.\:\ \'\|\&\!]+$~i';
		preg_match($pattern, $s, $matches);
		if (count($matches) > 0) {
			$r = $matches[0];
			if (containsSQL($r)) {
				jlog(JLOG_DEBUG,"invalid q input"); 
				exit;
			}
		}
		else {
			jlog(JLOG_DEBUG,"invalid q input"); 
			exit;
		}
	}
	return $r;
}
function containsSQL($s) {
	$dangerwords = array('insert','update','delete','drop','truncate','insert','create','select');
	foreach ($dangerwords as $wrd) {
		if (strpos($s, $wrd) !== false) {
			return true;
		}
	}
	return false;
}

//---------------------------------------

function nextParam() {
	global $paramnum;
	return '$' . $paramnum++;
}

//---------------------------------------

function processCommand($s) {
	$sql = 'datatype='.nextParam().' and timelvllo='.nextParam().' and timelvlhi='.nextParam().' and maplvllo='.nextParam().' and maplvlhi='.nextParam();
	$a = array();
	switch ($s) {
		case '2.1':
			$a = array(2,5,6,10,13);
			break;
		case '2.2':
			$a = array(2,5,6,14,18);
			break;
		case '2.3':
			$a = array(2,5,7,14,18);
			break;
		case '2.4':
			$a = array(2,7,7,14,18);
			break;
		case '3.1':
			$a = array(3,5,6,10,13);
			break;
		case '3.2':
			$a = array(3,5,6,14,18);
			break;
		case '6.1':
			$a = array(6,4,5,12,18);
			break;
		case '6.2':
			$a = array(6,6,6,1,14,);
			break;
		case '7.1':
			$a = array(7,5,5,1,18,);
			break;
		case '8.1':
			$a = array(8,4,5,12,18);
			break;
		case '10.1':
			$a = array(10,4,7,1,18);
			break;
		case '11.1':
			$a = array(11,0,0,1,18);
			break;
		case '11.2':
			$a = array(11,1,3,0,10000);
			break;
		case '11.3':
			$a = array(11,1,3,1,18);
			break;
		case '11.4':
			$a = array(11,1,5,1,18);
			break;
		case '11.5':
			$a = array(11,4,4,1,18);
			break;
		}
	return array('s'=>$sql,'a'=>$a);
}
?>
