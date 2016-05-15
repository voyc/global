<?php
// (c) Copyright 2011 voyc.com
//----------------------------------------------------------

/**
 * A web service to read one record.
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

// Grant access to specified domains
if(isset($_SERVER['HTTP_ORIGIN']) && ($_SERVER['HTTP_ORIGIN'] == "http://www.voyc.com" || $_SERVER['HTTP_ORIGIN'] == "http://www.huxleysparrot.com")) {
    header('Access-Control-Allow-Origin: http://www.huxleysparrot.com');
    header('Content-type: application/xml');
}
//else {
//	return;
//}

// quarantine inputs
$hostile = &$_GET;

// validate inputs  // '4a860f1fab2d8a6b3d9f7172cf3f21e1';
$token = validateToken('token', $hostile);

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
    writeError();
	return;
}

// get user id and last-used ads id
$sql = 'select ua.id, ua.userid, ua.adsid'.
	' from voyc.userads ua, voyc.token tk'.
	' where ua.userid = tk.userid'.
	' and tk.token = \''.$token.'\'';
$result = @pg_query($conn, $sql);
if (!$result) {
	jlog(JLOG_DEBUG,"Query error ".pg_last_error()." $sql");
	writeError();
    return;
}
$numrows = pg_num_rows($result);
	if ($numrows != 1) {
	$sql = 'select userid'.
		' from voyc.token'.
		' where token = \''.$token.'\'';
	$result = @pg_query($conn, $sql);
	if (!$result) {
		jlog(JLOG_DEBUG,"Query error ".pg_last_error()." $sql");
		writeError();
	    return;
	}
	$numrows = pg_num_rows($result);
	if ($numrows != 1) {
		jlog(JLOG_DEBUG,"Query error. numrows != 1 " . $sql);
	    writeError();
		return;
	}
	$row = pg_fetch_array($result, 0, PGSQL_ASSOC);
	$userid = $row['userid'];
	$sql = 'insert into voyc.userads (userid, adsid)'.
		' values ('.$userid.', 0)';
	$result = @pg_query($conn, $sql);
	if (!$result) {
		jlog(JLOG_DEBUG,"Query error ".pg_last_error()." $sql");
		writeError();
	    return;
	}
	$numrows = pg_num_rows($result);
	if ($numrows != 1) {
		jlog(JLOG_DEBUG,"Query error. numrows != 1 " . $sql);
	    writeError();
		return;
	}
}
$row = pg_fetch_array($result, 0, PGSQL_ASSOC);
$uaid = $row['id'];
$userid = $row['userid'];
$lastadsid = $row['adsid'];

// get next ads record in sequence
$sql = 'select id, title, author, copy from voyc.ads'.
	' where id > '.$lastadsid.
	' order by id'.
	' limit 1';
$result = @pg_query($conn, $sql);
if (!$result) {
	jlog(JLOG_DEBUG,"Query error ".pg_last_error()." $sql");
    writeError();
    return;
}
$numrows = pg_num_rows($result);
if ($numrows < 1) {
	// start the sequence over again
	$sql = 'select id, title, author, copy from voyc.ads'.
		' where id = 1';
	$result = @pg_query($conn, $sql);
	if (!$result) {
		jlog(JLOG_DEBUG,"Query error ".pg_last_error()." $sql");
	    writeError();
	    return;
	}
	$numrows = pg_num_rows($result);
	if ($numrows != 1) {
		jlog(JLOG_DEBUG,"Query error. numrows != 1 " . $sql);
	    writeError();
		return;
	}
}
$row = pg_fetch_array($result, 0, PGSQL_ASSOC);
$adsid = $row['id'];
$title = $row['title'];
$author = $row['author'];
$copy = $row['copy'];
$copy = 'Buy from Amazon<br/>' . $copy . '<br/>by ' . $author;

// update userads table with latest ads id
$sql = 'update voyc.userads'.
	' set adsid = '.$adsid.
	' where userid = '.$userid;
jlog(JLOG_DEBUG,'update, '. $sql);
$result = @pg_query($conn, $sql);
if (!$result) {
	jlog(JLOG_DEBUG,"Query error ".pg_last_error()." $sql");
    writeError();
    return;
}

// write output xml
$dom = new DOMDocument('1.0', 'iso-8859-1');

$response = $dom->createElement('response');
$dom->appendChild($response);

$sub = $dom->createElement( "status", "ok");
$response->appendChild($sub);

$sub = $dom->createElement( "adsid", $adsid);
$response->appendChild($sub);

$sub = $dom->createElement( "copy");
$cdata = $dom->createCDATASection($copy);
$sub->appendChild($cdata);
$response->appendChild($sub);

echo $dom->saveXML();

return;


// token is optional, alphameric characters, default empty string
function validateToken($key, $hostile) {
	return (isset($hostile[$key])) ? $hostile[$key] : '';
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
