<?php
// (c) Copyright 2009 voyc.com
//----------------------------------------------------------

/**
 * A web service to read a feed.
 *
 * Input arguments:
 *   1. url
 *   2. name
 *   3. service
 */

/**
 *
 */
include("../../phplib/decDate.php");
include("../../phplib/readFeed.php");
include("../../phplib/readExif.php");
include("../../phplib/getTimezone.php");
include("../../phplib/getImageReuters.php");

require_once(dirname(__FILE__).'/../../phplib/jlog.php');
openjlog(basename(__FILE__));

// inputs
$taint_url = isset($_REQUEST['url']) ? $_REQUEST['url'] : '';
$taint_name = isset($_REQUEST['name']) ? $_REQUEST['name'] : '';
$taint_service = isset($_REQUEST['service']) ? $_REQUEST['service'] : '';

// validate input querystring
$url = $taint_url;
$name = $taint_name;
$service = $taint_service;

// we will output xml
header('Content-Type: text/xml');
	
// read this feed now
$rc = readFeed( $url, $name, $service);

// write return
header('Content-type: text.xml');
$dom = new DOMDocument('1.0', 'UTF-8');
$response = formatResponse($dom, ($rc >= 0) ? 'success' : 'fail', $rc);
echo $dom->saveXML();
return;

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
