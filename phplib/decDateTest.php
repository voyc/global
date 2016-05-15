<?php
// (c) Copyright 2009 Voyc.com
//----------------------------------------------------------

/**
 * A cli test program to test the convertStringToDecimalDate() function.
 *
 * Input arguments:
 *    1. date {string}
 */

/**
 *
 */
include("decDate.RC1.php");

if ($argc < 2) {
	echo "usage: php decDateTest.php <date> or 'all'\n";
	return;
}

// inputs
$d = $argv[1];

if ($d == 'all') {
	testAll();
}
else {
	$x = convertStringToDecimalDate($d);
	echo $x['decidate'] ." ".$x['precision'] . "\n";
}
return;


function testAll() {

	test("1 Sep 1952 4:00 GMT", 1952.6671220401);
	test("1 Sep 1952 4:00 GMT", 1952.6671220401);
	test("6 Jun 1903 1:15 GMT", 1903.4275399543);
	test("dec 31 2006 23:59:59 UTC", 2006.9999999683);
	test("1 jan 2007 00:00:00 UTC", 2007);
	test("dec 31 2006 23:59:59 PST", 2007.0009132103);
	test("1 jan 2007 00:00:00 PST", 2007.000913242);
	test("dec 31 2006 23:59:59 PDT", 2007.000799055);
	test("1 jan 2007 00:00:00 PDT", 2007.0007990868);
	test("25 Oct 2007 23:00 PST", 2007.8172374429);
	test("Thu Aug 13 2009 20:14:45", 2009.6160097983);
	test("Thu Aug 13 2009 20:14:45 GMT-0700 (Pacific Daylight Time)", 2009.6168088851);
	test("Thu Aug 13 2009 20:14:45 -0700 (Pacific Daylight Time)", 2009.6168088851);

	// todo
	test("4 jul 1776 8:23:06 AM", 1776.5072159608378);
	test("30 jan 201", 201.08036529680365);
	test("1568", 1568.0);
	test("1556 01 23", 1556.06102003643);
	test("1290 09 27", 1290.7377853881278);
	test("1268", 1268.0);
	test("1138 08 09", 1138.6035388127855);
	test("893 03 23", 893.2227168949772);
	test("856 12 22", 856.9735883424408);
	test("1 sep 1901", 1901.6665525114156);
	test("4 jul 1776", 1776.5062613843352);
	test("30 jan 201", 201.08036529680365);
	test("3000 BC", -3000.0);
	test("3000000 BC", -3000000.0);
	test("3,000,000 BC", -3000000.0);
	test("30 BC", -30.0);
	test("30 AD", 30.0);
	test("500 AD", 500.0);

	test("2 Jan 2038", 2038.0036529680365);
	test("3 Apr 2515", 2515.2528538812785);
	test("4 Jun 6429", 6429.422716894977);
	test("31 dec 25025", 25025.99817351598);

	showCounts();
}

$countTest = 0;
$countPass = 0;
$countFail = 0;

function test($s, $d) {
	global $countTest, $countPass, $countFail;
	$countTest++;
	$x = convertStringToDecimalDate($s);
	$st = real_cmp($x['decidate'], $d);
	echo ((!$st) ? 'Pass' : 'Fail')." - expected:$d - actual:".$x['decidate']." - test:$s \n";
	if ($st) {
		$countFail++;
	}
	else {
		$countPass++;
	}
	return $st;
}	

function showCounts() {
	global $countTest, $countPass, $countFail;
	echo "Test: $countTest\n";
	echo "Pass: $countPass\n";
	echo "Fail: $countFail\n";
	echo "Unit test: ".(($countTest <= $countPass)  ? 'Pass' : 'Fail')."\n";
}

function real_cmp($r1, $r2) {
	$epsilon = 0.00092;
	$diff = $r1 - $r2;
	
	if( abs($diff) < $epsilon )
		return 0;
	else
		return $diff < 0 ? -1 : 1;
}



// (c) Copyright 2009 Voyc.com
?>
