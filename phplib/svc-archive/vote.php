<?php
// (c) Copyright 2009 voyc.com
//----------------------------------------------------------

/**
 * A web service to record user's vote.
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

$token = getValue($dom,'token');
if (!$token) {
	writeResponse( 'fail', 'Missing token.');
	return;
}

$storyid = getValue($dom,'storyid');
if (!$storyid) {
	writeResponse( 'fail', 'Missing storyid.');
	return;
}

$svote = getValue($dom,'vote');
$vote = intval($svote);
if (!$vote) {
	writeResponse( 'fail', 'Missing vote.');
	return;
}
if (!($vote == -1 || $vote == 1)) {
	writeResponse( 'fail', 'Invalid vote.');
	return;
}

$userid = getIdForToken($conn, $token);
if (!$userid) {
	writeResponse( 'fail', 'User not authorized.');
	return;
}

// write a vote record
$sql = "insert into voyc.vote (userid, storyid, vote) values ($userid, $storyid, $vote)";
$rc = executeSql($conn, $sql);
if (!$rc) {
	$msg = 'System error.  Try later.';
	if (strpos(pg_last_error(),'duplicate key') !== false) {
		$msg = 'Already voted.';
		jlog(JLOG_DEBUG,'Additional vote attempted by userid:'.$userid);
	}
	writeResponse( 'fail', $msg);
	return;
}

// update the story record
$sql = "update fpd.fpd set magnitude = magnitude + $vote where id = $storyid";
$rc = executeSql($conn, $sql);
if (!$rc) {
	writeResponse( 'fail', 'System error.  Try later.');
	return;
}

writeResponse( 'success', '');

//----------------------------------------------------------
// (c) Copyright 2009 voyc.com
?>
