<?php
// (c) Copyright 2010 Voyc.com
//----------------------------------------------------------

/**
 * This library file contains the readCsvFile() function.
 */
/**
 *
 */

require_once(dirname(__FILE__).'/loginUtilities.php');
require_once(dirname(__FILE__).'/../phplib/tagRecord.php');
require_once(dirname(__FILE__).'/../phplib/insertRecord.php');

openjlog(basename(__FILE__));

function readCsvFile($filename, $token, $sourcename) {
	$verbose = 1;

	$auser = authByToken($token);
	if (!$auser) {
		return 0;
	}

	$row = 1;
	$handle = fopen($filename, 'r');
	if ($handle === FALSE) {
		jlog(JLOG_DEBUG,"Unable to open file $filename");
		return 0;
	}

	// read column headings from row 1
	$headings = fgetcsv($handle);
	if ($headings === FALSE) {
		jlog(JLOG_DEBUG,"No rows in file $filename");
		return 0;
	}

	// validate all headings
	$numCols = count($headings);
	for ($i=0; $i<$numCols; $i++) {
		$headings[$i] = strtolower($headings[$i]);
	}

	if ($verbose > 0) echo "Heading row has $numCols columns.\n";

	$numRows = 0;
	while (($data = fgetcsv($handle)) !== FALSE) {
		$numRows++;
		$numCols = count($data);
		
		$a = array();
		$a['userid'] = $auser['id'];
		$a['author'] = $auser['name'];
		$a['bibid'] = $sourcename;
		$a['service'] = 'csv-upload';
		
		for ($i=0; $i<$numCols; $i++) {
			$a[$headings[$i]] = $data[$i];
		}				
		$row++;
		
		//print_r($a);

		$b = tagRecord($a);
		//print_r($b);

		$c = insertRecord($b);
		if ($verbose > 0) {
			echo "Row $row status $c\n";
		}
		//print_r($c);
	}
	fclose($handle);

	return $numRows;
}
 
//----------------------------------------------------------
// (c) Copyright 2010 Voyc.com
?>
