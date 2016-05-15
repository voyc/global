<?php
// (c) Copyright 2008 Voyc.com
//----------------------------------------------------------

/**
 * A one-time utility to make shape polygon images for each record.
 *
 * Input arguments:
 *    none
 */

/**
 *
 */
require_once(dirname(__FILE__).'/../../config.php');
require_once(dirname(__FILE__).'/../phplib/jlog.php');
require_once(dirname(__FILE__).'/../phplib/makeShape.php');

openjlog( basename(__FILE__));

//establish a connection to database 
$conn = @pg_connect("port=$dbport dbname=$dbname user=$dbuser password=$dbpassword");
if (!$conn) {
    echo "unable to connect";
    return;
}

$columnList = "id, timebegin, timeend, forebear, translate(headline,chr(10),';') as headline, abstract, xmin(the_geom), xmax(the_geom), ymin(the_geom), ymax(the_geom)";
$columnList .= ", AsText(the_geom) as the_geom, color";

// the query
$sql = " select ".$columnList." from fpd.fpd ".
       " where ".  //timebegin <= $begtime and timeend > $begtime".
       " datatype in (2,3)".
       " and maptype = 2".
       " and id not in (14700,14675)".   // athens and acropolis have empty multipolygon
       " order by forebear";

//execute SQL query 
$result = @pg_query($conn, $sql);
if (!$result) {
    echo "Query error ".pg_last_error()." $sql";
    return;
}
  
// get the number of rows in the resultset
$numrows = pg_num_rows($result);
if ($numrows <= 0) {
    echo "No rows. $sql";
	return;
}

// iterate through resultset
for ($i=0; $i<$numrows; $i++) {
	$row = pg_fetch_array($result, $i, PGSQL_ASSOC);
	makeshape( $row);
}

//----------------------------------------------------------
// (c) Copyright 2008 Voyc.com
?>
