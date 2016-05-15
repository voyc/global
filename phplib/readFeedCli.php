<?php
// (c) Copyright 2009 Voyc.com
//----------------------------------------------------------

/**
 * A command-line program to read one feed.
 *
 * Input arguments:
 *    1. url {string}
 *    2. name {string}
 *    3. service {service}
 *
 * php readFeedCli.php http://www.democracynow.org/democracynow.rss DemocracyNow DemocracyNow 34
 */

/**
 *
 */
require_once(dirname(__FILE__).'/phplib/config.php');
require_once(dirname(__FILE__).'/phplib/jlog.php');
require_once(dirname(__FILE__).'/phplib/dbUtilities.php');
require_once(dirname(__FILE__).'/phplib/decDate.php');
require_once(dirname(__FILE__).'/phplib/readFeed.php');
require_once(dirname(__FILE__).'/phplib/readExif.php');

openjlog(basename(__FILE__));

// inputs
$url = $argv[1];
$name = $argv[2];
$service = $argv[3];
$userid = $argv[4];

// read this feed now
echo "reading feed $name, $service\n";
$rc = readFeed( $url, $name, $service, $userid);

// write return
echo "complete $rc\n";
return;

//----------------------------------------------------------
// (c) Copyright 2009 Voyc.com
?>