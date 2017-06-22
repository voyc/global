<?php
/**
 * A web service to geocode a placename.
 */
require_once(dirname(__FILE__).'/../../config.php');
require_once(dirname(__FILE__).'/jlog.php');
require_once(dirname(__FILE__).'/dbUtilities.php');

// globals
$paramnum = 1;
$params = array();

function geocode() {
	global $dbport,$dbname,$dbuser,$dbpassword;
	global $paramnum, $params;

	openjlog(basename(__FILE__));
	$executionTime = microtime(true);
	$state = 'ok';
	
	// inputs
	$taint_q = isset($_REQUEST['q']) ? $_REQUEST['q'] : false;
	$taint_rf = isset($_REQUEST['rf']) ? $_REQUEST['rf'] : false;
	$taint_callback = isset($_REQUEST['callback']) ? $_REQUEST['callback'] : 'ready';
	$taint_token = isset($_REQUEST['t']) ? $_REQUEST['t'] : '';

	// validate inputs
	$q = validateQuery($taint_q);
	$rf = validateInt($taint_rf);
	$callback = validateJSName($taint_callback);
	$token = validateToken($taint_token);

	// validate parameter set
	if (!$q || !$rf || !$callback || !$token) {
		jlog(JLOG_DEBUG,'invalid parameter set');
		return;
	}
	
	// the query
	$sql = 'select st_xmin(the_geom), st_ymin(the_geom) from geo.placename where name = $1';
	$params = [$q];
	
	//establish a connection to database 
	$conn = getConnection();
	if (!$conn) return false;

	//execute SQL query 
	$result = pg_query_params($conn, $sql, $params);
	if (!$result) {
		jlog(JLOG_DEBUG,"Query error ".pg_last_error()." $sql");
		return;
	}
	
	// get the number of rows in the resultset
	$numrows = pg_num_rows($result);
	if ($numrows != 1) {
		jlog(JLOG_DEBUG,"Query error. numrows != 1 " . $sql);
		return;
	}
	
	$row = pg_fetch_array($result, 0, PGSQL_ASSOC);
	$lat = $row['st_xmin'];
	$lng = $row['st_ymin'];
	
	// begin the output
	echo $callback.'({record:{';
	
	// write the output
	echo 'lat:'.$lat.',';
	echo 'lng:'.$lng.',';
	
	// finish the output
	$executionTime = microtime(true) - $executionTime;
	echo "},rf:$rf,state:\"$state\",executionTime:$executionTime});";
	return;
}

//---------------------------------------

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
function validateToken($s) {
	$r = '';
	if (!$s) {
	}
	else {
		$pattern = '~^[A-Za-z0-9]+$~i';
		preg_match($pattern, $s, $matches);
		if (count($matches) > 0) {
			$r = $matches[0];
		}
		else {
			jlog(JLOG_DEBUG,"invalid token input"); 
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
?>
