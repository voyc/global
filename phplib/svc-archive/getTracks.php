<?php
// (c) Copyright 2011 voyc.com
//----------------------------------------------------------

/**
 * A web service to read tracks.
 *
 * Querystring parameters
 *    token
 */

/**
 *
 */
require_once(dirname(__FILE__).'/../../phplib/config.php');
require_once(dirname(__FILE__).'/../../phplib/jlog.php');
openjlog(basename(__FILE__));
jlog(JLOG_DEBUG,"getTracks");

// Grant access to specified domains
if(isset($_SERVER['HTTP_ORIGIN']) && ($_SERVER['HTTP_ORIGIN'] == "http://www.voyc.com" || $_SERVER['HTTP_ORIGIN'] == "http://www.huxleysparrot.com")) {
    header('Access-Control-Allow-Origin: http://www.huxleysparrot.com');
    header('Content-type: application/xml');
}
//else {
//	return;
//}
jlog(JLOG_DEBUG,"1");

// quarantine inputs
$hostile = &$_GET;

// validate inputs  // '4a860f1fab2d8a6b3d9f7172cf3f21e1';
$token = validateToken('token', $hostile);
$format = validateFormat('format', $hostile);
$sort = validateSort('sort', $hostile);

//establish a connection to database 
$conn = @pg_connect("port=$dbport dbname=$dbname user=$dbuser password=$dbpassword");
if (!$conn) {
	jlog(JLOG_DEBUG,"unable to connect");
    writeError();
	return;
}

// get tracks
$sql = 'select trk.id, trk.sourceid, trk.composerkey, co.name, co.timebegin, co.timeend, co.place, trk.title, trk.description'.
		' from music.track trk, music.composer co'.
		' where trk.composerkey is not null'.
		' and trk.composerkey=co.key'.
		' and trk.genre=\'classical\''.
		' and trk.title <> \'?\'';
if ($sort == 'date') {
	$sql .= ' order by co.timebegin, co.timeend, trk.composerkey, trk.genre, trk.title';
}
else {
	$sql .= ' order by trk.composerkey, trk.genre, trk.title';
}

$result = @pg_query($conn, $sql);
if (!$result) {
	jlog(JLOG_DEBUG,"Query error ".pg_last_error()." $sql");
	writeError();
    return;
}
$numrows = pg_num_rows($result);
if ($numrows < 1) {
	jlog(JLOG_DEBUG,"Query error. numrows != 1 " . $sql);
    writeError();
	return;
}

if ($format == 'xml') {
	// write output xml
	$dom = new DOMDocument('1.0', 'iso-8859-1');
	$response = $dom->createElement('response');
	$dom->appendChild($response);
	
	for ($i=0; $i<$numrows; $i++) {
		$lineout = $dom->createElement( "row");
	
		$row = pg_fetch_array($result, $i, PGSQL_ASSOC);
		$id = $row['id'];
		$sourceid = $row['sourceid'];
		$name = $row['name'];
		$timebegin = $row['timebegin'];
		$timeend = $row['timeend'];
		$title = $row['title'];
		$place = $row['place'];
		$description = $row['description'];
	
	
		$sub = $dom->createElement( "id", $id);
		$lineout->appendChild($sub);
	
		$sub = $dom->createElement( "sourceid", $sourceid);
		$lineout->appendChild($sub);
	
		$sub = $dom->createElement( "name");
		$cdata = $dom->createCDATASection($name);
		$sub->appendChild($cdata);
		$lineout->appendChild($sub);
	
		$sub = $dom->createElement( "timebegin", $timebegin);
		$lineout->appendChild($sub);
	
		$sub = $dom->createElement( "timeend", $timeend);
		$lineout->appendChild($sub);
	
		$sub = $dom->createElement( "place", $place);
		$lineout->appendChild($sub);
	
		$sub = $dom->createElement( "title");
		$cdata = $dom->createCDATASection($title);
		$sub->appendChild($cdata);
		$lineout->appendChild($sub);
	
		$sub = $dom->createElement( "description");
		$cdata = $dom->createCDATASection($description);
		$sub->appendChild($cdata);
		$lineout->appendChild($sub);
	
		$response->appendChild($lineout);
	}
	
	echo $dom->saveXML();
}
else if ($format == 'json') {
	
	// write output json
	echo "var g = [";
	
	for ($i=0; $i<$numrows; $i++) {
		echo '{';
	
		$row = pg_fetch_array($result, $i, PGSQL_ASSOC);
		$id = $row['id'];
		$sourceid = $row['sourceid'];
		$name = $row['name'];
		$timebegin = $row['timebegin'];
		$timeend = $row['timeend'];
		$place = $row['place'];
		$title = $row['title'];
		$description = $row['description'];

		echo 'id:'.$id.',';
		echo 'sourceid:"'.$sourceid.'",';
		echo 'name:"'.$name.'",';
		echo 'timebegin:'.$timebegin.',';
		echo 'timeend:'.$timeend.',';
		echo 'place:"'.$place.'",';
		echo 'title:"'.$title.'",';
		echo 'description:"'.$description.'"';
		echo '}';
		if ($i < $numrows-1) {
			echo ",\n";
		}
	}
	
	echo "];onData(g);";
}

return;


// token is optional, alphameric characters, default empty string
function validateToken($key, $hostile) {
	return (isset($hostile[$key])) ? $hostile[$key] : '';
}

// format must by xml or json
function validateFormat($key, $hostile) {
	if ($key == 'format' && isset($hostile[$key])) {
		if ($hostile[$key] == 'json' || $hostile[$key] == 'xml') {
			return $hostile[$key];
		}
	}
	return 'json';
}

// sort must by alpha or date
function validateSort($key, $hostile) {
	if ($key == 'sort' && isset($hostile[$key])) {
		if ($hostile[$key] == 'alpha' || $hostile[$key] == 'date') {
			return $hostile[$key];
		}
	}
	return 'alpha';
}

// write output in case of error
function writeError() {
	$dom = new DOMDocument('1.0', 'iso-8859-1');
	
	$response = $dom->createElement('response');
	$dom->appendChild($response);
	
	$sub = $dom->createElement( "status", "error");
	$response->appendChild($sub);

	echo $dom->saveXML();
	return;
}

//----------------------------------------------------------
// (c) Copyright 2011 voyc.com
?>
