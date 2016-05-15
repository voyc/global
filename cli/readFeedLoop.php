<?php
// (c) Copyright 2009, 2014 Voyc.com

/**
 * The main feed reader program.
 * A command-line program, designed for use in cron.
 * Reads feeds defined in the feeds table.
 *
 * Input arguments:
 *    1. frequency
 */

/**
 *
 */
require_once(dirname(__FILE__).'/../../config.php');
require_once(dirname(__FILE__).'/../phplib/jlog.php');
require_once(dirname(__FILE__).'/../phplib/dbUtilities.php');
require_once(dirname(__FILE__).'/../phplib/decDate.php');
require_once(dirname(__FILE__).'/../phplib/readFeed.php');
require_once(dirname(__FILE__).'/../phplib/readExif.php');

openjlog( basename(__FILE__));

// globals
$verbose = 0;
$gmode = 'prod';

// inputs
$taint_frequency = $argv[1];

// validate input
$frequency = intval($taint_frequency);

//establish a connection to database 
$conn = getConnection();
if (!$conn) return;

//execute
$sql = "select * from voyc.feeds where frequency = $frequency";
$result = @pg_query($conn, $sql);
if (!$result) return;

// iterate through resultset
$numrows = pg_num_rows($result);
for ($i=0; $i<$numrows; $i++) {
    $row = pg_fetch_array($result, $i, PGSQL_ASSOC);
    $id = $row['id'];
    $url = $row['url'];
    $name = $row['name'];
    $service = $row['service'];
    $version = $row['version'];
    $userid = $row['userid'];
    $onmatch = $row['onmatch'];
	echo "begin readFeed: $name, $service, $version\n";
	jlog(JLOG_DEBUG,'begin readFeed '.$name);
	$rc = readFeed($url, $name, $service, $userid, $onmatch);
	jlog(JLOG_DEBUG,'end readFeed '.$name.' '.$rc);
}
return;
?>
