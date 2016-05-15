<?php
// (c) Copyright 2008 voyc.com
//----------------------------------------------------------

/**
 * A web service to read one record.
 *
 * Querystring parameters
 *    id
 *    state
 *    rf
 *    token
 */

/**
 *
 */
require_once(dirname(__FILE__).'/../../phplib/config.php');
require_once(dirname(__FILE__).'/../../phplib/jlog.php');
openjlog(basename(__FILE__));

// quarantine inputs
$hostile = &$_GET;

// validate inputs
$id = validateId('id', $hostile);
$state = validateState('state', $hostile);
$rf = validateRf('rf', $hostile);
$token = validateToken('token', $hostile);

if (!$id) {
	echo "invalid input.  Security violation.";
	return;
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
    echo "unable to connect";
    return;
}

// the query
$columnList = "s.id, s.timebegin, s.timeend, s.forebear, translate(s.headline,chr(10),';') as headline, s.abstract, xmin(s.the_geom), xmax(s.the_geom), ymin(s.the_geom), ymax(s.the_geom), s.maptype, s.maplvlhi, s.maplvllo, s.timetype, s.timelvlhi, s.timelvllo, s.color, s.imageurl, s.thumburl, s.magnitude, s.datatype";
$columnList .= ", s.abstract, s.storyurl, s.tags, s.timeprecision, s.datatype, s.bibid, s.placename, s.author, s.imageurl, s.version, tv.vote";

// a three-file join to get the vote column
$sql = ' select '.$columnList.
	' from fpd.fpd s'.
	' left join'.
	' (select *'.
	' from voyc.token t, voyc.vote v'.
	" where t.token = '$token'".
	' and v.userid = t.userid) as tv'.
	' on tv.storyid = s.id'.
	" where s.id = $id";

//execute SQL query 
$result = @pg_query($conn, $sql);
if (!$result) {
    echo "Query error ".pg_last_error()." $sql";
    return;
}

// get the number of rows in the resultset
$numrows = pg_num_rows($result);
if ($numrows != 1) {
    echo "Query error. numrows != 1 " . $sql;
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

$vote = (pg_field_is_null($result, 0, 'vote')) ? 0 : $row['vote'];

// write the output
echo 'g.data.onDetailLoaded({';
echo 'id:'.$id.',';
echo 'b:'.$row['timebegin'].',';
echo 'e:'.$row['timeend'].',';
echo 'h:"'.addslashes($row['headline']).'",';
echo 'c:'.$row['color'].',';
echo 'f:'.$row['forebear'].',';
echo 'gn:'.$row['ymax'].',';
echo 'gs:'.$row['ymin'].',';
echo 'ge:'.$row['xmax'].',';
echo 'gw:'.$row['xmin'].',';
echo 'mlh:'.$row['maplvlhi'].',';
echo 'mll:'.$row['maplvllo'].',';
echo 'tlh:'.$row['timelvlhi'].',';
echo 'tll:'.$row['timelvllo'].',';
echo 'mt:'.$row['maptype'].',';
echo 'tt:'.$row['timetype'].',';
echo 'tu:"'.((isset($row['thumburl'])) ? $row['thumburl'] : $row['imageurl']).'",';
echo 'mag:'.$row['magnitude'].',';

echo 'p:[';
echo "[".round($row['ymin'],6).",".round($row['xmin'],6)."],";  // sw
echo "[".round($row['ymax'],6).",".round($row['xmax'],6)."]";  // ne
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
echo "},$rf,\"$state\");";
return;


// id must be a single integer
function validateId($key, $hostile) {
	return (isset($hostile[$key])) ? validateInt($hostile[$key]) : false;
}

// rf is optional, must be a single integer, default is 0
function validateRf($key, $hostile) {
	return (isset($hostile[$key])) ? validateInt($hostile[$key]) : 0;
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

//----------------------------------------------------------
// (c) Copyright 2008 voyc.com
?>
