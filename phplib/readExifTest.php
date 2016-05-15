<?php
// (c) Copyright 2009 Voyc.com
//----------------------------------------------------------

/**
 * A unit-test program to test the readExif() function.
 *
 * Input arguments:
 *    none
 */

/**
 *
 */
include("readExif.php");
include("getTimezone.php");

openjlog(basename(__FILE__));

$urls = array();
$urls[] = "http://moblog.net/media/j/h/a/jhagstrand/dads-big-valley.jpg";
//$urls[] = "http://moblog.net/media/m/i/c/microhappy/where-are-you-going.jpg";
//$urls[] = "http://moblog.net/media/g/y/p/gypsymama/vids/feeling-groovy.MOV.transcoded.mp4";
//$urls[] = "http://moblog.net/media/a/u/t/autumncat/moblog_911032.jpe";
//$urls[] = "http://moblog.net/media/m/i/c/microhappy/wild-thing-i-think-i-love-you.jpg";
//$urls[] = "http://moblog.net/media/c/r/i/crickson/jousting-2.jpg";
//$urls[] = "http://moblog.net/media/b/e/t/bethmadethis/balloons.jpg";
//$urls[] = "http://moblog.net/media/c/a/p/caption/moblog_911023.JPG";
//$urls[] = "http://moblog.net/media/t/h/e/theleedsguide/sierra-nevada-tasting.jpg";
//$urls[] = "http://moblog.net/media/t/i/l/tiliaamericana/lake-on-fire-1.jpg";

echo "begin readExif test\n";

// read this feed now
$n = 0;
foreach ($urls as $i => $url) {
	$a = readExif( $url);
	if ($a["status"] == "ok") {
		echo $a["status"].",".$a["lat"].",".$a["lon"].",".$a["datetime"].",".$a["make"].",".$a["model"].",".$url."\n";
	}
	else {
		echo $a["status"].",".$a["make"].",".$a["model"].",".$url."\n";
	}
}

echo "complete\n";
return;

//----------------------------------------------------------
// (c) Copyright 2009 Voyc.com
?>