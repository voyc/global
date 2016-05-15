<?php
// (c) Copyright 2009, 2010, 2011 Voyc.com
//----------------------------------------------------------

/**
 * A command-line program to display the Exif header of a gif image.
 *
 * The Exif header may contain lat/lon and time coordinates.
 *
 * Input arguments:
 *    1. url of the image {string}
 */

/**
 *
 */
require_once(dirname(__FILE__).'/../../config.php');
require_once(dirname(__FILE__).'/../phplib/jlog.php');
require_once(dirname(__FILE__).'/../phplib/readExif.php');

openjlog( basename(__FILE__));

// inputs
$url = $argv[1];

$exif = @exif_read_data($url, 'IFD0');
if ($exif===false) {
	echo "no exif header found";
}
else {
	print_r($exif);
	echo "\n--------------------------------------\n";
	$a = readExif($url);
	print_r($a);
}
//----------------------------------------------------------
// (c) Copyright 2009, 2010, 2011 Voyc.com
?>
