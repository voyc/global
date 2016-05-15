<?php
// (c) Copyright 2008,2014 Voyc.com
/**
 * This library file contains place lookup function.
 */

openjlog(basename(__FILE__));

/** 
 * Return the lat/lon of a given placename.
 *
 * Calls geonames.org.
 * see http://www.geonames.org/export/geonames-search.html
 *
 * @param string placename
 * @return array {rc, lat, lng)
 */
function lookupPlace($placename) {
	//$server = 'http://rodin.ws.geonames.org';  // free
	$server = 'http://ws.geonames.net';  // paid
	$authparam = '&username=jhagstrand';
	$url = "$server/search?maxRows=1&q=" . urlencode($placename) . $authparam;
	$fileContents = file_get_contents($url);

	$dom = DOMDocument::loadXML($fileContents);

	$rc = $dom->getElementsByTagName('totalResultsCount')->item(0)->nodeValue;
	if ($rc) {
		$lat = $dom->getElementsByTagName('lat')->item(0)->nodeValue;
		$lng = $dom->getElementsByTagName('lng')->item(0)->nodeValue;
		
		$geom = array( 'rc' => $rc, 'lat' => $lat, 'lng' => $lng);
	}
	else {
		$geom = array( 'rc' => $rc);
	}

	return $geom;
}

/** 
 * Find a placename within a block of text.
 * Return the lat/lon.
 *
 * Calls Yahoo Placemaker
 * see http://developer.yahoo.com/geo/placemaker/
 *
 * @param string placename
 * @return array {rc, lat, lng)
 * 
**/
 
//To test, uncomment the following lines.
//$documentContent = "Utah Democratic incumbent Congressmember Jim Matheson is facing a challenge from a coalition of progressives who have formed a grassroots effort called _The Citizens\' Candidate_ to unseat him. The initiative is using Craigslist to find applicants willing to run against Matheson. A final candidate will be chosen through public interviews at the Salt Lake City Library on Saturday. We speak with _The Citizens\' Candidate_ co-founder, Tim DeChristopher.";
//$documentTitle = "The Citizens\' Candidate - Grassroots Effort Uses Craigslist to Find Candidate For Utah House Seat";
//$response = parseForPlace ( $documentTitle, $documentContent);
//print_r($response);

function parseForPlace($title, $content) {
	$lenContent = strlen($content);
	if ($lenContent <= 0) {
		// yahoo returns a 404 if content is empty
		return false;
	}

	$url = 'http://wherein.yahooapis.com/v1/document';
	$appid = 'IboVq7PIkY1tbknqAmRpTpjcFU_bLF1Oqfo5g6Pk';
	$documentType = 'text/plain';

	// prepare data to post
	$a = array();
	$a['appid'] = $appid;
	$a['documentType'] = $documentType;
	$a['documentTitle'] = $title;
	$a['documentContent'] = $content;
	$a['documentUrl'] = $url;
	$data = http_build_query($a);

	// http post to yahoo service
	$xml = do_post_request($url, $data);
	if ($xml === false) return false;

	// parse returned xml
	//echo "$xml\n\n";
	$geom = array( 'rc' => 0);
	$dom = DOMDocument::loadXML($xml);
	$geom = array( 'rc' => 0);
	$geoscope = $dom->getElementsByTagName('geographicScope');
	if ($geoscope->length > 0) {
		$sub = $geoscope->item(0)->nodeValue;
		if ($sub) {
			$lat = $dom->getElementsByTagName('latitude')->item(0)->nodeValue;
			$lng = $dom->getElementsByTagName('longitude')->item(0)->nodeValue;
			$name = $dom->getElementsByTagName('name')->item(0)->nodeValue;
			if ($lat != 0 && $lng != 0) {
				$geom = array( 'rc' => 1, 'lat' => $lat, 'lng' => $lng, 'name' => $name);
			}
		}
	}
	
	if ($geom['rc'] < 1) {
		$placeDetails = $dom->getElementsByTagName('placeDetails');
		if ($placeDetails->length > 0) {
			$sub = $placeDetails->item(0)->nodeValue;
			if ($sub) {
				$lat = $dom->getElementsByTagName('latitude')->item(0)->nodeValue;
				$lng = $dom->getElementsByTagName('longitude')->item(0)->nodeValue;
				$name = $dom->getElementsByTagName('name')->item(0)->nodeValue;
				if ($lat != 0 && $lng != 0) {
					$geom = array( 'rc' => 1, 'lat' => $lat, 'lng' => $lng, 'name' => $name);
				}
			}
		}
	}

	return $geom;
}

function do_post_request($url, $data, $optional_headers = null) {
	$params = array('http' => array(
		'method' => 'POST',
		'content' => $data
	));
	if ($optional_headers !== null) {
		$params['http']['header'] = $optional_headers;
	}
	$ctx = stream_context_create($params);
	$fp = @fopen($url, 'rb', false, $ctx);
	if (!$fp) {
		jlog(JLOG_DEBUG,"Unable to open url $url");
		return false;
	}
	$response = @stream_get_contents($fp);
	if ($response === false) {
		jlog(JLOG_DEBUG,"No response from url $url");
		return false;
	}
	return $response;
}
?>