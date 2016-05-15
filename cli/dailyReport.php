<?php
// (c) Copyright 2011,2014 Voyc.com

/**
 * A daily report of new additions into the fpd table.
 * A command-line program, designed for use in cron.
 */

/**
 *
 */
require_once(dirname(__FILE__).'/../../config.php');
require_once(dirname(__FILE__).'/../phplib/jlog.php');
require_once(dirname(__FILE__).'/../phplib/dbUtilities.php');

openjlog(basename(__FILE__));

// read database
$conn = getConnection();
if (!$conn) return;
$sql = "select bibid, sum(CASE WHEN editstatus=0 THEN 1 ELSE 0 END) as good, sum(CASE WHEN editstatus=10 THEN 1 ELSE 0 END) as nogeo, count(*) as total ";
$sql .= "from fpd.fpd where tm > now() - interval '24 hours' group by bibid order by bibid";
$result = executeQuery($conn, $sql);
if (!$result) return;

// iterate through resultset
$numrows = pg_num_rows($result);
for ($i=0; $i<$numrows; $i++) {
    $row = pg_fetch_array($result, $i, PGSQL_ASSOC);
    $bibid = $row['bibid'];
    $good = $row['good'];
    $nogeo = $row['nogeo'];
    $total = $row['total'];
	echo "$bibid \t $good-$total \n";
}
return;
?>
