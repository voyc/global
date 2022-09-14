<?php
// (c) Copyright 2008,2014 voyc.com
/**
 * A web service to read one record.
 */
require_once(dirname(__FILE__).'/../../config.php');
require_once(dirname(__FILE__).'/jlog.php');
require_once(dirname(__FILE__).'/dbUtilities.php');

// globals
$paramnum = 1;
$params = array();

function get() {
	global $dbport,$dbname,$dbuser,$dbpassword;
	global $paramnum, $params;

	openjlog(basename(__FILE__));
	$executionTime = microtime(true);
	
	// quarantine inputs
	$hostile = &$_GET;
	
	// validate inputs
	$id = validateId('id', $hostile);
	$state = validateState('state', $hostile);
	$rf = validateRf('rf', $hostile);
	$token = validateToken('token', $hostile);
	$callback = validateCallback('callback', $hostile);
	
	if (!$id) {
		return;
	}
	
	// constants
	$eol = "\n";
	$baseAltitude = 30000;
	$labelScale = 1.5;
	$mincolor = 1;
	$maxcolor = 6;
	
	// the query
	$columnList = "s.id, s.timebegin, s.timeend, s.forebear, translate(s.headline,chr(10),';') as headline, s.abstract, st_xmin(s.the_geom), st_xmax(s.the_geom), st_ymin(s.the_geom), st_ymax(s.the_geom), s.maptype, s.maplvlhi, s.maplvllo, s.timetype, s.timelvlhi, s.timelvllo, s.color, s.imageurl, s.thumburl, s.magnitude, s.datatype";

	#$columnList .= ", s.abstract, s.storyurl, s.tags, s.timeprecision, s.datatype, s.bibid, s.placename, s.author, s.imageurl, s.version, tv.vote";
	$columnList .= ", s.abstract, s.storyurl, s.tags, s.timeprecision, s.datatype, s.bibid, s.placename, s.author, s.imageurl, s.version";
	
	// a three-file join to get the vote column
	#$sql = ' select '.$columnList.
	#	' from fpd.fpd s'.
	#	' left join'.
	#	' (select *'.
	#	' from voyc.token t, voyc.vote v'.
	#	" where t.token = ".nextParam($token).
	#	' and v.userid = t.userid) as tv'.
	#	' on tv.storyid = s.id'.
	#	" where s.id = ".nextParam($id);

	// skip vote for now
	$sql = ' select '.$columnList.
		' from fpd.fpd s'.
		" where s.id = ".nextParam($id);

	// for debugging only
	//$tsql = debugSQL($sql,$params);
	//jlog(JLOG_DEBUG,$tsql);
	jlog(JLOG_DEBUG,'online get svc');

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
	$abstract = $row['abstract'];
	$storyurl = $row['storyurl'];
	$tags = $row['tags'];
	
	$tags = str_replace('"', '\"', $tags);
	$abstract = str_replace('"', '\"', $abstract);
	$abstract = str_replace("\n", '', $abstract);
	$abstract = str_replace("\r", '', $abstract);
	$abstract = strip_tags($abstract);
	
	$vote = 0; #(pg_field_is_null($result, 0, 'vote')) ? 0 : $row['vote'];
	
	// begin the output
	echo $callback.'({record:{';
	
	// write the output
	echo 'id:'.$id.',';
	echo 'b:'.$row['timebegin'].',';
	echo 'e:'.$row['timeend'].',';
	echo 'h:"'.addslashes($row['headline']).'",';
	echo 'c:'.$row['color'].',';
	echo 'f:'.$row['forebear'].',';
	echo 'gn:'.$row['st_ymax'].',';
	echo 'gs:'.$row['st_ymin'].',';
	echo 'ge:'.$row['st_xmax'].',';
	echo 'gw:'.$row['st_xmin'].',';
	echo 'mlh:'.$row['maplvlhi'].',';
	echo 'mll:'.$row['maplvllo'].',';
	echo 'tlh:'.$row['timelvlhi'].',';
	echo 'tll:'.$row['timelvllo'].',';
	echo 'mt:'.$row['maptype'].',';
	echo 'tt:'.$row['timetype'].',';
	echo 'tu:"'.((isset($row['thumburl'])) ? $row['thumburl'] : $row['imageurl']).'",';
	echo 'mag:'.$row['magnitude'].',';
	
	echo 'p:[';
	echo "[".round($row['st_ymin'],6).",".round($row['st_xmin'],6)."],";  // sw
	echo "[".round($row['st_ymax'],6).",".round($row['st_xmax'],6)."]";  // ne
	echo '],';
	
	echo 'v:'.$row['version'].',';
	echo 's:"'.$abstract.'",';
	echo 'su:"'.$storyurl.'",';
	echo 't:"'.$tags.'",';
	echo 'src:"'.$row['bibid'].'",';
	echo 'plc:"'.$row['placename'].'",';
	echo 'iu:"'.$row['imageurl'].'",';
	echo 'aut:"'.$row['author'].'",';
	echo 'dt:'.$row['datatype'].',';
	echo 'prec:'.$row['timeprecision'].',';
	echo 'vote:'.$vote.'';
	
	// finish the output
	$executionTime = microtime(true) - $executionTime;
	echo "},rf:$rf,state:\"$state\",executionTime:$executionTime});";
	return;
}

// id must be a single integer
function validateId($key, $hostile) {
	return (isset($hostile[$key])) ? validateInt($hostile[$key]) : false;
}

// rf is optional, must be a single integer, default is 0
function validateRf($key, $hostile) {
	return (isset($hostile[$key])) ? validateNumber($hostile[$key]) : 0;
}

// token is optional, alphameric characters, default empty string
function validateToken($key, $hostile) {
	return (isset($hostile[$key])) ? $hostile[$key] : '';
}

// state is optional, valid values are "read" and "edit", default is "read"
function validateState($key, $hostile) {
	$state = "read";
	$input = (isset($hostile[$key])) ? $hostile[$key] : false;
	if ($input == "read" || $input == "edit") {
		$state = $input;
	}
	return $state;
}

// callback is required, valid javascript function name, with periods
function validateCallback($key, $hostile) {
	return (isset($hostile[$key])) ? $hostile[$key] : '';
}

function validateInt($input) {
	$id = false;
	if (!is_numeric($input)) {
		return false;
	}
	// range check
	$minid = 1;
	$maxid = 2147483647;
	$id = (integer) $input;
	$id = ($id >= $minid) ? $id : 0;
	$id = ($id <= $maxid) ? $id : 0;
	return $id;
}
function validateNumber($input) {
	$id = $input;
	if (!is_numeric($input)) {
		return false;
	}
	return $id;
}

function nextParam($value) {
	global $paramnum, $params;
	array_push($params, $value);
	return '$' . $paramnum++;
}

function debugSql($sql,$params) {
	$debug = preg_replace_callback( 
        '/\$(\d+)\b/',
        function($match) use ($params) { 
            $key=($match[1]-1); 
            return ( is_null($params[$key])?'NULL':pg_escape_string($params[$key]) ); 
        },
        $sql);
	return $debug;
}

?>
