<?php
// (c) Copyright 2009 Voyc.com
//----------------------------------------------------------

/** 
 * This library file contains functions related to user login.
 */

require_once(dirname(__FILE__).'/dbUtilities.php');

openjlog(basename(__FILE__));

/** 
 * Login
 */
function login( $conn, $username, $password) {
	// read the record
	$sql = "select id, level from voyc.user where username = '$username' and password = '$password'";
	$result = @pg_query($conn, $sql);
	$numrows = pg_num_rows($result);
	if ($numrows <= 0) {
		jlog(JLOG_DEBUG,"query failed ** ".pg_last_error()." ** ".$sql);
		writeResponse( 'fail', 'That username/password combination is not on file.');
		return;
	}
	
	$row = pg_fetch_array($result, 0, PGSQL_ASSOC);
	$userid = $row['id'];
	$level = $row['level'];
	
	// calc a new token
	$ct = mktime();
	$token = md5('moogoo'.$ct);
	
	// write a token record
	$sql = "insert into voyc.token (userid, token) values ($userid, '$token')";
	$rc = executeSql($conn, $sql);
	if (!$rc) {
		writeResponse( 'fail', 'System error.  Try later.');
		return;
	}
	
	$dom = new DOMDocument('1.0', 'iso-8859-1');
	$response = formatResponse($dom, 'success', '', '');
	
	$sub = $dom->createElement( "level", $level);
	$response->appendChild($sub);
	
	$sub = $dom->createElement( "token", $token);
	$response->appendChild($sub);
	
	echo $dom->saveXML();
}

/**
 * Deprecated.  Replaced by authByToken()
 */
function authorize( $conn, $token) {
	// read the record
	$sql = 'select u.id, u.level, u.username, t.tm, t.token '.
			'from voyc.token t, voyc.user u '.
			'where t.userid = u.id '.
			"and t.token = '$token' ".
			"and t.tm > now() - interval '1 week'";

	$result = @pg_query($conn, $sql);
	$numrows = pg_num_rows($result);
	if ($numrows <= 0) {
		jlog(JLOG_DEBUG,"no rows found ** ".$sql);
		writeResponse( 'fail', 'Please login.');
		return;
	}
	
	$row = pg_fetch_array($result, 0, PGSQL_ASSOC);
	$userid = $row['id'];
	$level = $row['level'];
	$username = $row['username'];
	$tm = $row['tm'];
	$token = $row['token'];
	
	$dom = new DOMDocument('1.0', 'iso-8859-1');
	$response = formatResponse($dom, 'success', '', '');
	
	$sub = $dom->createElement( "username", $username);
	$response->appendChild($sub);

	$sub = $dom->createElement( "level", $level);
	$response->appendChild($sub);
	
	$sub = $dom->createElement( "token", $token);
	$response->appendChild($sub);
	
	echo $dom->saveXML();
}

function getValue($dom, $key) {
	$value = false;
	$sub = $dom->getElementsByTagName($key);
	if ($sub->item(0)) {
		$value = $sub->item(0)->nodeValue;
	}
	return $value;
}

function writeResponse( $status, $msg, $extra=null) {
	$dom = new DOMDocument('1.0', 'iso-8859-1');
	$response = formatResponse($dom, $status, $msg, '');
	echo $dom->saveXML();
}

/**
 *  Pass in a dom.
 *  Create a <response> element with action, status, id, and message elements.
 *  Attach it to the input DOM.
 */
function formatResponse( $dom, $status, $msg, $extra) {
	$response = $dom->createElement('response');
	$dom->appendChild($response);
	
	$sub = $dom->createElement( "status", $status);
	$response->appendChild($sub);

	if ($msg) {
		$sub = $dom->createElement( "message", $msg);
		$response->appendChild($sub);
	}

	if ($extra) {
		foreach($extra as $key => $value) {
			$sub = $dom->createElement( $key, $value);
			$response->appendChild($sub);
		}
	}

	return $response;
}

function getNextUserKey($conn) {
	global $dbport, $dbname, $dbuser, $dbpassword;

	$sql = "select nextval('voyc.user_id_seq'::regclass)";
	
	//execute
	$result = @pg_query($conn, $sql);
	if (!$result) {
		jlog(JLOG_DEBUG,'No result from getNextKey query ** '.pg_last_error().' ** '.$sql);
		return 0;
	}

	$numrows = pg_num_rows($result);
	if ($numrows != 1) {
		jlog(JLOG_DEBUG,'No row in resultset from getNextKey query ** '.$sql);
		return 0;
	}

	$row = pg_fetch_array($result, 0, PGSQL_ASSOC);
	return $row['nextval'];
}

function getIdForToken($conn, $token) {
	global $dbport, $dbname, $dbuser, $dbpassword;

	$sql = "select userid from voyc.token where token = '$token'";
	
	//execute
	$result = @pg_query($conn, $sql);
	if (!$result) {
		jlog(JLOG_DEBUG,'No result from getIdForToken query ** '.pg_last_error().' ** '.$sql);
		return 0;
	}

	$numrows = pg_num_rows($result);
	if ($numrows != 1) {
		jlog(JLOG_DEBUG,'No row in resultset from getIdForToken query ** '.$sql);
		return 0;
	}

	$row = pg_fetch_array($result, 0, PGSQL_ASSOC);
	return $row['userid'];
}

/**
 * Authorize a user by the token assigned at login.
 */
function authByToken($token) {
	$userid = 0;
	$conn = getConnection();
	if (!$conn) {
		return 0;
	}

	// read the record
	$sql = 'select u.id, u.level, u.username, t.tm, t.token '.
			'from voyc.token t, voyc.user u '.
			'where t.userid = u.id '.
			"and t.token = '$token'"; //.
			//"and t.tm > now() - interval '1 hour'";

	$result = @pg_query($conn, $sql);
	if (!$result) {
		jlog(JLOG_DEBUG,'No result from authByEmail query ** '.pg_last_error().' ** '.$sql);
		return 0;
	}

	$numrows = pg_num_rows($result);
	if ($numrows <= 0) {
		jlog(JLOG_DEBUG,"query failed ** ".pg_last_error()." ** ".$sql);
		return 0;
	}

	if ($numrows == 1) {
		$row = pg_fetch_array($result, 0, PGSQL_ASSOC);
		$userid = $row['id'];
		$username = $row['username'];
		$level = $row['level'];
	}

	$areturn = array();
	$areturn['id'] = $userid;
	$areturn['name'] = $username;
	$areturn['level'] = $level;

	return $areturn;
}

/**
 * Authorize a user by his email address.
 *
 * This is designed for use when we receive photos via email.
 * We use the from-email address to find the user record.
 * For first-time emails, we create a new user record at level 1.
 */
function authByMail($email) {
	$userid = 0;
	$conn = getConnection();
	if (!$conn) {
		return 0;
	}

	$sql = "select id, username from voyc.user where email = '$email'";
	
	//execute
	$result = @pg_query($conn, $sql);
	if (!$result) {
		jlog(JLOG_DEBUG,'No result from authByEmail query ** '.pg_last_error().' ** '.$sql);
		return 0;
	}

	$numrows = pg_num_rows($result);
	$password = '';
	if ($numrows == 1) {
		$row = pg_fetch_array($result, 0, PGSQL_ASSOC);
		$userid = $row['id'];
		$username = $row['username'];
		$newuser = false;
	}

	// if not found, create a new user record
	else {
		$newuser = true;
		$a = explode('@', $email);
		$username = $a[0];
		
		// get next key
		$userid = getNextUserKey($conn);
		if (!$userid) {
			return 0;
		}

		// create password
		$password = 'ilovevoyc';

		$sql = "insert into voyc.user (id, username, password, email, level, tm) values($userid, '$username', '$password', '$email', 1, now())";
		$rc = executeSql($conn, $sql);
		if (!$rc) {
			return 0;
		}
	}
	
	$areturn = array();
	$areturn['id'] = $userid;
	$areturn['name'] = $username;
	$areturn['newuser'] = $newuser;
	$areturn['password'] = $password;
	return $areturn;
}

//----------------------------------------------------------
// (c) Copyright 2009 Voyc.com
?>
