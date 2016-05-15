<?php
// (c) Copyright 2009 Voyc.com
//----------------------------------------------------------

/** 
 * Return the timezoneid for a given lat/lon.
 * see http://www.geonames.org/export/web-services.html#timezone
 * The timezoneId is defined in the Olsen timezone database:
 * http://www.twinsun.com/tz/tz-link.htm
 *
 * @param double lat
 * @param double lon
 * @return string timezoneid, like Pacific Los Angeles
 */
function getTimezone($lat, $lon) {
	// get timezoneid
	$url = "http://ws.geonames.org/timezone?lat=$lat&lng=$lon";      // free
	$url = "http://ws.geonames.net/timezone?lat=$lat&lng=$lon&username=jhagstrand";   // paid
	$fileContents = file_get_contents($url);
	$dom = DOMDocument::loadXML($fileContents);
	$timezoneId = $dom->getElementsByTagName('timezoneId')->item(0)->nodeValue;
	return $timezoneId;
}

//----------------------------------------------------------
// (c) Copyright 2009 Voyc.com
?>