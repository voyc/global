<?php
// (c) Copyright 2010 Voyc.com
//----------------------------------------------------------

/**
 * This library file contains database utility functions.
**/

openjlog(basename(__FILE__));

/**
 * Establish a connection to database 
 */ 
function getConnection() {
	global $dbport, $dbname, $dbuser, $dbpassword;
	$conn = @pg_connect("port=$dbport dbname=$dbname user=$dbuser password=$dbpassword");
	if (!$conn) {
		jlog(JLOG_DEBUG,'unable to connect to database');
		return false;
	}
	return $conn;
}

function executeSql($conn, $sql) {
	global $dbport, $dbname, $dbuser, $dbpassword;

	if (!$conn) {
		$conn = getConnection();
	}

	//execute
	$result = @pg_query($conn, $sql);
	if (!$result) {
		jlog(JLOG_DEBUG,"executeSql failed ** ".pg_last_error()." ** ".$sql);
		return false;
	}
	
	$numrows = pg_affected_rows($result);
	if ($numrows <= 0) {
		jlog(JLOG_DEBUG,"no records updated");
		return false;
	}
	return true;
}

function executeQuery($conn, $sql) {
	global $dbport, $dbname, $dbuser, $dbpassword;

	if (!$conn) {
		$conn = getConnection();
	}

	//execute
	$result = @pg_query($conn, $sql);
	if (!$result) {
		jlog(JLOG_DEBUG,"executeSql failed ** ".pg_last_error()." ** ".$sql);
		return false;
	}
	
	return $result;
}

//----------------------------------------------------------
// (c) Copyright 2010 MapTeam, Inc.
?>