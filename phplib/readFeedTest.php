<?php
// (c) Copyright 2009 Voyc.com
//----------------------------------------------------------

/**
 * A command-line program to unit test the readFeed() function.
 * @param string gmode - values: test, prod, or test_savebaseline
 * @param string verbose - present or not
 */

/**
 *
 */
require_once(dirname(__FILE__).'/readFeed.php');

openjlog(basename(__FILE__));

// set global gmode = test, prod, or savebaseline
$gmode = 'test';
if ($argc > 1 && ($argv[1] == 'test_savebaseline' || $argv[1] == 'test' || $argv[1] == 'prod')) {
	$gmode = $argv[1];
}

// set global verbose = 0 or 1
$verbose = 0;
if ($argc > 2 && ($argv[2] == 'verbose')) {
	$verbose = 1;
}

$base = dirname(__FILE__).'/../datasets/';
$base = 'http://www.dev.mapteam.com/~jhagstrand/voyc/html/svc/getdataset?set=';

$rc = readFeed( $base.'democracynow.rss', 'DemocracyNowTest', 'DemocracyNow', 1, 'skip');
$rc = readFeed( $base.'reuters.xml', 'ReutersTest', 'reuters', 1, 'skip');
$rc = readFeed( $base.'globalvoices.xml', 'GlobalVoicesTest', 'globalvoices', 1, 'skip');
$rc = readFeed( $base.'moblog.rss', 'MoblogTest', 'moblog', 1, 'skip');
$rc = readFeed( $base.'flickr.rss', 'FlickrTest', 'flickr', 1, 'skip');

test_results();
return;

/**
 * Unit test functions.
 */

$gtotal = 0;
$gpass = 0;
$gfail = 0;

function test_assert($name, $rownum, $assertion) {
	global $gtotal, $gpass, $gfail;
	$gtotal++;
	if ($assertion) {
		$gpass++;
	}
	else {
		$gfail++;
	}
	echo "$name, $rownum: ". (($assertion) ? 'pass' : 'fail') . "\n";
}

function test_results() {
	global $gmode, $gtotal, $gpass, $gfail;
	if ($gmode != 'test') return;
	echo "total: $gtotal \n";
	echo "pass: $gpass \n";
	echo "fail: $gfail \n";
	echo (($gpass == $gtotal) ? "\033[37;42mcomplete: pass\033[m" : "\033[37;41mcomplete: fail\033[m") . "\n";
}


//----------------------------------------------------------
// (c) Copyright 2009 Voyc.com
?>