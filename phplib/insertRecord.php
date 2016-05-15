<?php
// (c) Copyright 2008 Voyc.com
//----------------------------------------------------------

/**
 * This library file contains insertRecord() and related functions.
 *  
**/

require_once(dirname(__FILE__).'/loginUtilities.php');

openjlog(basename(__FILE__));

/**
 * Insert or update one record.
 *
 * Called from:
 *     update.php        action = insert, update, delete
 *     readMail.php -    no action, skip dupes
 *     readCsvFile.php - no action, skip dupes
 *     readFeed.php    - no action, handle dupes as specified by onmatch
 *
 */
function insertRecord($a, $onmatch='skip') {
	global $gmode;
	
	// column names
	$stringcolumns = array('headline'=>1,'abstract'=>1,'author'=>1,'placename'=>1,'tags'=>1,'storyurl'=>1,'imageurl'=>1,'thumburl'=>1,'bibid'=>1,'permalink'=>1,'fulltext'=>1,'the_geom'=>1,'service'=>1,'guid'=>1);
	$numbercolumns = array('timebegin'=>1,'timeend'=>1,'timetype'=>1,'timeprecision'=>1,'datatype'=>1,'maptype'=>1,'forebear'=>1,'parent'=>1,'maplvllo'=>1,'maplvlhi'=>1,'timelvllo'=>1,'timelvlhi'=>1,'magnitude'=>1,'editstatus'=>1,'tsfulltext'=>1,'feeling'=>1,'userid'=>1);

	// set id and action for feeds
	$id = (isset($a['id'])) ? $a['id'] : 0;
	$action = (isset($a['action'])) ? $a['action'] : '';
	if (!$action) {
		// see if this record is already on file, by bibid+guid
		if (isset($a['bibid']) && isset($a['guid'])) {
			$id = getDupeId($a['bibid'], $a['guid']);
			$action = ($id) ? 'update' : 'insert';
			if ($id && $onmatch == 'skip') {
				return array( 'op' => 'update', 'rc' => 'skipped');
			}
		}
	}

	// compose sql
	if ($action == 'update') {
		$sql = formatUpdateSql($a, $id, $stringcolumns, $numbercolumns);
	}
	elseif ($action == 'delete') {
		$sql = formatDeleteSql($a, $id);
	}
	elseif ($action == 'insert') {
		$id = getNextKey();
		$sql = formatInsertSql($a, $id, $stringcolumns, $numbercolumns);
	}

	// run sql
	if (strrpos($gmode, 'test') !== false) {
		$status = 1;
	}
	else {
		$status = executeSql(null, $sql);
	}

	// return a result array
	$op = substr($sql, 0, 6);
	$rc = ($status) ? 'success' : 'failed';
	return array( 'op' => $op, 'rc' => $rc, 'id' => $id, 'sql' => $sql);
}

function formatDeleteSql($ar, $id) {
	$sql = "update fpd.fpd set editstatus = 20 where id = $id";
	return $sql;
}

function formatInsertSql($ar, $id, $stringcolumns, $numbercolumns) {
	$a = $ar;

//	if (!array_key_exists('forebear', $a)) {
//		$a['forebear'] = $id;
//		$a['parent'] = 0;
//	}

	$columns = "id";
	$values = $id;
	$d = ", ";
	foreach ($stringcolumns as $i => $value) {
		if (isset($a[$i])) {
			$columns .= $d . $i;
			$values  .= $d . "'" . pg_escape_string($a[$i]) . "'";
		}
	}
	foreach ($numbercolumns as $i => $value) {
		if (isset($a[$i])) {
			$columns .= $d . $i;
			$values  .= $d . $a[$i];
		}
	}

	$sql = "insert into fpd.fpd (" . $columns . ") values (" . $values . ")";
	return $sql;
}

function formatUpdateSql($ar, $id, $stringcolumns, $numbercolumns) {
	$a = $ar;

	$columns = '';
	$d = "set ";
	foreach ($stringcolumns as $i => $value) {
		if (isset($a[$i])) {
			$columns .= $d . $i . " = '" . pg_escape_string($a[$i]) . "'";
			$d = ", ";
		}
	}
	foreach ($numbercolumns as $i => $value) {
		if (isset($a[$i])) {
			$columns .= $d . $i . ' = ' . $a[$i];
		}
	}

	if (isset($a['version'])) {
		$prevversion = $a['version'];
		$newversion = $prevversion + 1;
		$columns .= ", version=$newversion";
	}

	$sql = "update fpd.fpd " . $columns . " where id = $id";
	if (isset($a['version'])) {
		$sql .= " and version = $prevversion";
	}
	return $sql;
}

function getNextKey() {
	global $dbport, $dbname, $dbuser, $dbpassword;

	//establish a connection to database 
	$conn = @pg_connect("port=$dbport dbname=$dbname user=$dbuser password=$dbpassword");
	if (!$conn) {
		jlog(JLOG_DEBUG,'unable to connect to database');
		return 0;
	}

	$sql = "select nextval('fpd.fpd_id_seq'::regclass)";
	
	//execute
	$result = @pg_query($conn, $sql);
	if (!$result) {
		jlog(JLOG_DEBUG,'No result from getNextKey query ** '.$sql);
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

/**
 * Return true if this record is already on file.
 * @param {string} $bibid The bibid that identifies the feed.
 * @param {string} $guid The guid field unique within the feed.
 * @return {boolean}
 */
function getDupeId($bibid,$guid) {
	global $dbport, $dbname, $dbuser, $dbpassword;

	$sql = "select id from fpd.fpd where bibid = '".$bibid."' and guid = '".$guid."'";

	//establish a connection to database 
	$conn = @pg_connect("port=$dbport dbname=$dbname user=$dbuser password=$dbpassword");
	if (!$conn) {
		jlog(JLOG_DEBUG,'unable to connect to database');
		return false;
	}
	
	//execute
	$result = @pg_query($conn, $sql);
	if (!$result) {
		jlog(JLOG_DEBUG,"query failed ** ".pg_last_error()." ** ".$sql);
		return false;
	}
	
	$numrows = pg_num_rows($result);
	if ($numrows <= 0) {
		//jlog(JLOG_DEBUG,"no record found ** " . $sql);
		return false;
	}

	$row = pg_fetch_array( $result, 0, PGSQL_ASSOC);
	return ($row['id']);
}

//----------------------------------------------------------
// (c) Copyright 2008 Voyc.com
?>
