<?php
// (c) Copyright 2008 Voyc.com
//----------------------------------------------------------

/**
 * A one-time utilit to fix the polygon color column on the database.
 *
 * Input arguments:
 *    none
 */

/**
 *
 */
require_once(dirname(__FILE__).'/../../config.php');
require_once(dirname(__FILE__).'/../phplib/jlog.php');

openjlog( basename(__FILE__));

$colorstack = array(
    array(   0,   0,   0),
    array( 255,   0,   0),
    array(   0, 255,   0),
    array(   0,   0, 255),
    array( 255, 255,   0),
    array(   0, 255, 255),
    array( 255,   0, 255),
    array( 255, 255, 255)
);
$mincolor = 1;
$maxcolor = 6;
$color = $mincolor;

$previousForebear = 0;

// get boundaries of map
$n = 46.52;
$s = 7.94;
$w = 22.45;
$e = 73.14;

// get size in pixels of map
$wd = 600;
$ht = 457;

// database parameters
$dbname = "gsdev";
$dbhost = "localhost";
$dbuser = "web";
$dbpassword = "bew23";
$dbport = "5432";

//establish a connection to database 
$conn = @pg_connect("port=$dbport dbname=$dbname user=$dbuser password=$dbpassword");
if (!$conn) {
    echo "unable to connect";
    return;
}

//establish another connection to database 
$conn2 = @pg_connect("port=$dbport dbname=$dbname user=$dbuser password=$dbpassword");
if (!$conn2) {
    echo "unable to connect";
    exit;
}

// get the coordinates only if using polygon method
$columnList = "id, timebegin, timeend, forebear, translate(headline,chr(10),';') as headline, abstract, xmin(the_geom), xmax(the_geom), ymin(the_geom), ymax(the_geom)";
$columnList .= ", AsText(the_geom), color";

// the query
$sql = " select ".$columnList." from fpd.fpd ".
       " where ".  //timebegin <= $begtime and timeend > $begtime".
       " datatype in (2,3)".
       " and id not in (14700,14675)".   // athens and acropolis have empty multipolygon
       " order by forebear";

/*
// read records
$sql = "select id, timebeg, timeend, headline, geonorth, geosouth, geowest, geoeast, geom from fpd.fpd ".
       "where timebeg <= $begtime and timeend >= $begtime ".
       "and geonorth > 7.94 and geosouth < 46.52 ".
       "and geowest < 73.14 and geoeast > 22.45 ".
       "and datatype = 2 order by timebeg";
*/

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
	setColorAndUpdate( $row);
}


function setColorAndUpdate( $row) {
	global $coldelim, $rowdelim;
	global $n, $s, $e, $w, $wd, $ht;
	global $colorstack, $numcolors, $color, $mincolor, $maxcolor;
	global $previousForebear;
	
	if (strlen($row['astext']) <= 0) {
		return;
	}

	// try one for practice
	if ($row['headline'] != 'Iraq') {
	//	return;
	}

	echo $row['id']." ".$row['headline']." ".$color."\n";
  
	updateRecord( $row['id'], $color);

	// increment color
	if ($row['forebear'] == 0 || $row['forebear'] != $previousForebear) {
		$previousForebear = $row['forebear'];
		$color++;
		if ($color > $maxcolor) {
			$color = $mincolor;
		}
	}
}

function updateRecord( $id, $color) {
	global $conn2;

	$sql = " update fpd.fpd set color = ".$color." where id = ".$id;

	//execute SQL query 
	$result = @pg_query($conn2, $sql);
	if (!$result) {
	    echo "Query error ".pg_last_error()." $sql";
	    exit();
	}
	  
	// get the number of rows in the resultset
	$numrows = pg_affected_rows($result);
	if ($numrows <= 0) {
	    echo "No rows. $sql";
		exit();
	}
}

//----------------------------------------------------------
// (c) Copyright 2008 Voyc.com
?>
