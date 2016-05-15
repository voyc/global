<?php
// (c) Copyright 2009 voyc.com
//----------------------------------------------------------

/**
 * A webservice to login a user.
 *
 * Querystring parameters
 *    xml
 */

/**
 *
 */
require_once(dirname(__FILE__).'/../../phplib/config.php');
require_once(dirname(__FILE__).'/../../phplib/jlog.php');
include("../../phplib/loginUtilities.php");

openjlog(basename(__FILE__));

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
	return 0;
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

login($conn, $username, $password);

//----------------------------------------------------------
// (c) Copyright 2009 voyc.com
?>
