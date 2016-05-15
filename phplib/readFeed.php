<?php
// (c) Copyright 2010, 2014 Voyc.com

/**
 * This library file contains readFeed() and related functions. 
**/

require_once(dirname(__FILE__).'/translateFeed.php');
require_once(dirname(__FILE__).'/tagRecord.php');
require_once(dirname(__FILE__).'/insertRecord.php');

openjlog(basename(__FILE__));

/**
 * readFeed
 * @param $url
 * @param $name
 * @param $service
 * @param $userid
 * @param $onmatch
 */
function readFeed($url, $name, $service, $userid, $onmatch) {
	global $gmode, $verbose;
	
	if (!$gmode) {
		echo "missing gmode\n";
		return;
	}

	// open the specified input URL
	$taint_xmlstr = file_get_contents($url);
	if ($taint_xmlstr === false) {
		jlog(JLOG_DEBUG,'error opening URL: '.$url);
		return -1;
	}
	
	// validate the input xml (TODO)
	$xmlstr = $taint_xmlstr;

	// strip out the entities.  they are not seen as valid utf-8
	//$xmlstr = preg_replace("/&(.*);/", "", $xmlstr);

	// load the XML
	$dom = new DOMDocument();
	//$rc = $dom->loadXML($xmlstr, LIBXML_NOERROR);
	$rc = $dom->loadXML($xmlstr);

	// parse the input XML into an array of items
	$items = $dom->getElementsByTagName("item");   // rss
	if ($verbose) {
		echo "processing ". $items->length. " records\n";
	}

	// process each item in the array
	$rownum = 0;
	foreach ($items as $item )  {
		$rownum++;
		if ($verbose) echo "------------ row $rownum\n";

		// three steps for each item
		// step 1. parse xml to php array
		$a = translateFeed( $item, $service);
		if ($verbose) print_r($a);
		switch ($gmode) {
			case 'test_savebaseline':
				$testname = 'translateFeed_' . $name;
				$testresult = base64_encode(serialize($a));
				echo "insert into voyc.unittest (testname, testnumber, testresult) values ('$testname', $rownum, '$testresult'); \n\n";
			break;
			case 'test':
				$testname = 'translateFeed_' . $name;
				$sql = "select testresult from voyc.unittest where testname = '$testname' and testnumber = $rownum";
				$result = executeQuery(null, $sql);
				$d = true;
				if (pg_num_rows($result)) {
					$row = pg_fetch_array($result, 0, PGSQL_ASSOC);
					$t = unserialize(base64_decode($row['testresult']));
					$i = array_intersect_assoc($t, $a);
					$d = array_diff_assoc($t, $i);
					if ($verbose) print_r($d);
				}
				test_assert( $testname, $rownum, empty($d));
			break;
		}
		if ($a['editstatus'] == EDITSTATUS_SKIPPED) {
			if ($verbose) echo "row $rownum skipped\n";
			continue;
		}

		// step 2. tag.  add items to the array for time, geo, etc.
		$a['userid'] = $userid;
		$a['bibid'] = $name;
		$a['service'] = $service;
		$b = tagRecord($a);
		if ($verbose) print_r($b);
		switch ($gmode) {
			case 'test_savebaseline':
				$testname = 'tagFeed_' . $name;
				$testresult = base64_encode(serialize($b));
				echo "insert into voyc.unittest (testname, testnumber, testresult) values ('$testname', $rownum, '$testresult'); \n\n";
			break;
			case 'test':
				$testname = 'tagFeed_' . $name;
				$sql = "select testresult from voyc.unittest where testname = '$testname' and testnumber = $rownum";
				$result = executeQuery(null, $sql);
				$d = true;
				if (pg_num_rows($result)) {
					$row = pg_fetch_array($result, 0, PGSQL_ASSOC);
					$t = unserialize(base64_decode($row['testresult']));
					$i = array_intersect_assoc($t, $b);
					$d = array_diff_assoc($t, $i);
				}
				if ($verbose) print_r($d);
				test_assert( $testname, $rownum, empty($d));
			break;
		}

		// step 3. insert.  compose the sql and insert or update the record.
		// we tried unit testing this, but the sql is different because of insert vs update, and also a different id on the inserts
		$b = adjustMagnitude($b);
		if (strrpos($gmode, 'test') === false) {
			$c = insertRecord($b, $onmatch);
			if ($verbose) print_r($c);
		}
		echo "$rownum ".$c['op'] . " " . $c['rc'] . " " . $b['editstatus'] . "\n";
	}
	return $rownum;
}

/**
 * Adjust the magnitude.  This is temporary until we have a large human editing function.
 * Increase magnitude for reputable sources and for images.
 * Add a random factor.
 */
function adjustMagnitude($a) {
	$magnitude = $a['magnitude'];
	if (strtolower($a['bibid']) == 'globalvoices' || strtolower($a['bibid']) == 'reuters' || strtolower($a['bibid']) == 'democracynow') {
		$magnitude += 200;
		if (isset($a['imageurl'])) {
			$magnitude += 100;
		}
	}
	$magnitude += rand(0, 100);
	$a['magnitude'] = $magnitude;
	return $a;
}
?>
