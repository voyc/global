<?php
// (c) Copyright 2009 Voyc.com
//----------------------------------------------------------

/**
 * Unit test program. 
 * Call it from the command line with no parameters.
 */

include("parseQuery.php");

define_syslog_variables();
openlog( 'parseQueryTest.php', LOG_PID, LOG_LOCAL0);

$queries = array();
$queries[] = 'art';
$queries[] = 'Art jhagStrand';
$queries[] = 'art -tattoo';
$queries[] = '"public art" -"Tattoo Art"';
$queries[] = '"offensive sidereal time" -hoopla "a b c" -"tender mercies" ajaxian hooligan antrax -"austere reformed atheist rack"';

echo "begin parseQuery test\n";

$n = 0;
foreach ($queries as $query) {
	$qClause = parseQuery( "fulltext", $query);
	echo "$query\n";
	echo "$qClause\n\n";
}

$qClause = parseQuery( "xxx", $queries[0]);
echo "$queries[0]\n";
echo "$qClause\n\n";

$qClause = parseQuery( "tags", $queries[1]);
echo "$queries[1]\n";
echo "$qClause\n\n";

$qClause = parseQuery( "headline", $queries[2]);
echo "$queries[2]\n";
echo "$qClause\n\n";

$qClause = parseQuery( "bibid", $queries[3]);
echo "$queries[3]\n";
echo "$qClause\n\n";

$qClause = parseQuery( "service", $queries[4]);
echo "$queries[4]\n";
echo "$qClause\n\n";

echo "complete\n";
return;

//----------------------------------------------------------
// (c) Copyright 2009 Voyc.com
?>