<?php
// (c) Copyright 2009 voyc.com
//----------------------------------------------------------

/**
 * A web service to register a user.
 *
 * Input arguments:
 *   1. xml
 */

/**
 *
 */
require_once(dirname(__FILE__).'/../../phplib/config.php');
require_once(dirname(__FILE__).'/../../phplib/jlog.php');
include("../../phplib/loginUtilities.php");

openjlog(basename(__FILE__));

// Grant access to specified domains
if(isset($_SERVER['HTTP_ORIGIN']) && ($_SERVER['HTTP_ORIGIN'] == "http://www.voyc.com" || $_SERVER['HTTP_ORIGIN'] == "http://www.huxleysparrot.com")) {
    header('Access-Control-Allow-Origin: http://www.huxleysparrot.com');
    header('Content-type: application/xml');
}
//else {
//	return;
//}

// inputs
$taint_data = isset($_POST['data']) ? $_POST['data'] : '';

// validate data: a valid utf-8 xml string 
if (true) {
	$data = $taint_data;
}

jlog(JLOG_DEBUG,'start, '. $data);

//establish a connection to database 
$conn = @pg_connect("port=$dbport dbname=$dbname user=$dbuser password=$dbpassword");
if (!$conn) {
	jlog(JLOG_DEBUG,'unable to connect to database');
	return false;
}

// we will output xml
header('Content-Type: text/xml');

// parse the input xml string
$dom = new DOMDocument();
$dom->loadXML($data);

// action
$username = getValue($dom,'username');
if (!$username) {
	writeResponse( 'fail', 'Missing username.');
	return;
}

$password = getValue($dom,'password');
if (!$password) {
	writeResponse( 'fail', 'Missing password.');
	return;
}

$email = getValue($dom,'email');
//if (!$email) {
//	writeResponse( 'fail', 'Missing email.');
//	return;
//}

// get next key
$id = getNextUserKey($conn);
if (!$id) {
	writeResponse( 'fail', 'Unable to register due to system error.  Try later.');
	return;
}

// insert one record
$sql = "insert into voyc.user (id, username, password, email) values ($id, '$username', '$password', '$email')";
$rc = executeSql($conn, $sql);
if (!$rc) {
	writeResponse( 'fail', 'That username/password combination is already on file.  Choose another.');
	return;
}

login($conn, $username, $password);

//----------------------------------------------------------
// (c) Copyright 2009 voyc.com
?>
