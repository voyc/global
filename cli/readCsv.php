<?php
// (c) Copyright 2010 Voyc.com
//----------------------------------------------------------

/**
 * Command-line program to read a csv file.
 * No parameters.
 */
/**
 *
 */
require_once(dirname(__FILE__).'/../../config.php');
require_once(dirname(__FILE__).'/../phplib/jlog.php');
require_once(dirname(__FILE__).'/../phplib/readCsvFile.php');

openjlog( basename(__FILE__));

if ($argc < 4) {
	echo "usage: php readCsvFile.php filename token sourcename \n";
	return;
}

$rc = readCsvFile($argv[1], $argv[2], $argv[3]);

echo "$rc\n";
//----------------------------------------------------------
// (c) Copyright 2010 Voyc.com
?>
