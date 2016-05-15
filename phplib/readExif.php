<?php
// (c) Copyright 2009 Voyc.com
//----------------------------------------------------------

/**
 * This library file contains the readExif() function. 
 */

require_once(dirname(__FILE__).'/getTimezone.php');

openjlog(basename(__FILE__));

/**
 * The readExif() function reads one image jpeg or tiff, and returns geo and time coordinates.
 * @param url  A url of an image file.
 * Returns an array with three attributes: lat, lon, and datetime.
 * @function
 * 
 */
function readExif($url) {

	$areturn = array();
	$areturn['status'] = "ok";
	$areturn['lat'] = 0;
	$areturn['lon'] = 0;
	$areturn['make'] = "";
	$areturn['model'] = "";
	$areturn['datetime'] = "";

	// check file type, only jpg and tiff supported
	$ext = @extension($url);
	if (!($ext == "jpg" || $ext == "jpeg" || $ext == "jpe" || $ext == "tiff")) {
		$areturn['status'] = "file extension not supported";
		return $areturn;
	}
	
	//$exif = @exif_read_data($url, 'IFD0');
	$exif = @exif_read_data($url);
	//print_r($exif);		
	//echo "\n ---------------------------- \n";

	if ($exif===false) {
		$areturn['status'] = "no exif header found";
		return $areturn;
	}

	if (isset($exif["Make"])) {
		$areturn['make'] = $exif["Make"];
	}
	if (isset($exif["Model"])) {
		$areturn['model'] = $exif["Model"];
	}

	$stest = @implode(" ", $exif);
	$pos = stripos( $stest, "gps");
	if ($pos === false) {
		$areturn['status'] = "no gps info in header";
		return $areturn;
	}

	//print_r($exif);
	//return;

	// latitude
	if (!isset($exif["GPSLatitudeRef"])) {
		$areturn['status'] = "no GPSLatitudeRef in header";
		return $areturn;
	}
	$latref = $exif["GPSLatitudeRef"];
	$a = split("/", $exif["GPSLatitude"][0]);
	$latdeg = $a[0] / $a[1]; 
	$a = split("/", $exif["GPSLatitude"][1]);
	$latmin = ($a[0] / $a[1]) / 60; 
	$a = split("/", $exif["GPSLatitude"][2]);
	$latsec = ($a[0] / $a[1]) / (60 * 60); 
	$lat = $latdeg + $latmin + $latsec;
	if ($latref == "S") {
		$lat = 0 - $lat;
	}

	// longitude
	$lonref = $exif["GPSLongitudeRef"];
	$a = split("/", $exif["GPSLongitude"][0]);
	$londeg = $a[0] / $a[1]; 
	$a = split("/", $exif["GPSLongitude"][1]);
	$lonmin = ($a[0] / $a[1]) / 60; 
	$a = split("/", $exif["GPSLongitude"][2]);
	$lonsec = ($a[0] / $a[1]) / (60 * 60); 
	$lon = $londeg + $lonmin + $lonsec;
	if ($lonref == "W") {
		$lon = 0 - $lon;
	}

	if ($lat == 0 && $lon == 0) {
		$areturn['status'] = "zero lat/lon";
	}
	$areturn['lat'] = $lat;
	$areturn['lon'] = $lon;

	if (isset($exif["DateTime"])) {
		$localtime = $exif["DateTime"];
		$timezone = getTimezone($lat, $lon);
		$areturn['datetime'] = $localtime . ' ' . $timezone;
	}
	else {
		jlog(JLOG_DEBUG,'DateTime not found in exif header '.$url);
	}
			
	return $areturn;
}

function extension($path) {
	$qpos = strpos($path, "?");
	if ($qpos!==false) {
		$path = substr($path, 0, $qpos);
	}
	$extension = pathinfo($path, PATHINFO_EXTENSION);
	$extension = strtolower($extension);
	return $extension;
}
?>