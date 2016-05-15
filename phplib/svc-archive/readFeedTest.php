<?php
// (c) Copyright 2009 voyc.com
//----------------------------------------------------------

/**
 * A webservice to run sql tests surrounding the testing of readFeed.php
 *
 * Querystring parameters
 *    c The code indicating which test to run.
 */

/**
 *
 */
require_once(dirname(__FILE__).'/../../phplib/config.php');
require_once(dirname(__FILE__).'/../../phplib/jlog.php');
openjlog(basename(__FILE__));

// inputs
$taint_c = isset($_REQUEST['c']) ? $_REQUEST['c'] : '';

// validate input querystring
$sql = "";
switch ($taint_c) {
	case "wildfireSetup": 
		$sql = "delete from fpd.fpd where bibid = 'wildfiresTest'";
		break;
	case "wildfireRecordCount":
		$sql = "select count(*) from fpd.fpd where bibid = 'wildfiresTest'";
		break;
	case "wildfireGeomValid":
		$sql = "select count(*) from fpd.fpd where bibid = 'wildfiresTest' and isvalid(the_geom)";
		break;
	case "wildfireCleanup":
		$sql = "delete from fpd.fpd where bibid = 'wildfiresTest'";
		break;

	case "globalvoicesSetup":
		$sql = "delete from fpd.fpd where bibid = 'globalvoicesTest'";
		break;
	case "globalvoicesRecordCount":
		$sql = "select count(*) from fpd.fpd where bibid = 'globalvoicesTest'";
		break;
	case "globalvoicesGeomValid":
		$sql = "select count(*) from fpd.fpd where bibid = 'globalvoicesTest' and isvalid(the_geom) and geometrytype(the_geom) = 'POINT'";
		break;
	case "globalvoices2RecordCount":
		$sql = "select count(*) from fpd.fpd where bibid = 'globalvoicesTest'";
		break;
	case "globalvoices2GeomValid":
		$sql = "select count(*) from fpd.fpd where bibid = 'globalvoicesTest' and isvalid(the_geom) and geometrytype(the_geom) = 'POINT'";
		break;
	case "globalvoicesCleanup":
		$sql = "delete from fpd.fpd where bibid = 'globalvoicesTest'";
		break;

	case "reutersSetup":
		$sql = "delete from fpd.fpd where bibid = 'reutersTest'";
		break;

	case "moblogSetup":
		$sql = "delete from fpd.fpd where bibid = 'moblogTest'";
		break;

	case "twitpicSetup":
		$sql = "delete from fpd.fpd where bibid = 'twitpicTest'";
		break;
}

$rc = executeSql($sql);

// write return
header('Content-type: text/xml');
$dom = new DOMDocument('1.0', 'UTF-8');
$response = formatResponse($dom, ($rc >= 0) ? 'success' : 'fail', $rc);
echo $dom->saveXML();
return;

/**
 * Execute a SQL update or insert statement.  Or execute a query that expects a single number as a result.
 * @param {String} $sql The sql string to execute.
 * @return {int} Count of records processed.
 */
function executeSql($sql) {
	global $dbport, $dbname, $dbuser, $dbpassword;

	//establish a connection to database 
	$conn = @pg_connect("port=$dbport dbname=$dbname user=$dbuser password=$dbpassword");
	if (!$conn) {
		jlog(JLOG_DEBUG,'unable to connect to database');
		return -1;
	}
	
	//execute
	$result = @pg_query($conn, $sql);
	if (!$result) {
		jlog(JLOG_DEBUG,"executeSql failed ** ".pg_last_error()." ** ".$sql);
		return -2;
	}
	
	$numrows = 0;
	if (substr($sql,0,6) == "select") {
	    $row = pg_fetch_array($result, 0, PGSQL_ASSOC);
		$numrows = $row['count'];
	}
	else {
		$numrows = pg_affected_rows($result);
	}
	return $numrows;
}

/**
 * Create a <response> element with action, status, id, and message elements and append it to the input DOM.
 * @param {XML-DOM} $dom A DOM to be returned to the client.
 * @param {string} $status A status string.
 * @param {string} $msg A message string.
 */
function formatResponse( $dom, $status, $msg) {
	$response = $dom->createElement('response');
	$dom->appendChild($response);
	
	$sub = $dom->createElement( "status", $status);
	$response->appendChild($sub);

	$sub = $dom->createElement( "message", $msg);
	$response->appendChild($sub);

	return $response;
}


//----------------------------------------------------------
// (c) Copyright 2009 voyc.com
?>