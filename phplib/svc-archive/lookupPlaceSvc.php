<?php
// (c) Copyright 2009 voyc.com
//----------------------------------------------------------

/**
 * A webservice to lookup a place
 *
 * Querystring parameters
 *    placename The name of the place to lookup.
 */

/**
 *
 */
require_once(dirname(__FILE__).'/../../phplib/jlog.php');
include("../../phplib/lookupPlace.php");

openjlog(basename(__FILE__));

// inputs
$taint_place = isset($_REQUEST['place']) ? $_REQUEST['place'] : '';
$taint_rf = isset($_REQUEST['rf']) ? $_REQUEST['rf'] : '';

// validate input querystring
$place = $taint_place;
$rf = $taint_rf;

// we will output xml
header('Content-Type: text/xml');
	
// read this feed now
$g = lookupPlace( $place);
$rc = $g['rc'];
if ($rc) {
	$lat = $g['lat'];
	$lng = $g['lng'];
	echo "g.data.readyUrl({rc:$rc, lat:$lat, lng:$lng},$rf)";
}
else {
	echo "g.data.readyUrl({rc:$rc},$rf)";
}
return;

//----------------------------------------------------------
// (c) Copyright 2009 voyc.com
?>
