<?php
// (c) Copyright 2010 Voyc.com
//----------------------------------------------------------

/**
 * Unit test program to test the insertRecord function.
 * Call from command line with no parameters
 */
 
/**
 * 
 */
require_once(dirname(__FILE__).'/insertRecord.php');

openjlog(basename(__FILE__));

$test1 = array();
$test1['imageurl'] = 'http://i823.photobucket.com/albums/zz157/jhagstrand/Copyof2010-01-16171100.jpg?t=1263769206';
$test1['headline'] = 'Cabin';
$test1['abstract'] = "This is a picture of new year\'s eve at the cabin at Kanopolis";
$test1['userid'] = 47;
$test1['the_geom'] = 'POINT(-117.29222222222 33.034444444444)';
$test1['timeend'] = 2010.043970605;
$test1['timebegin'] = 2010.043970605;
$test1['datatype'] = 11;
$test1['parent'] = 0;
$test1['maptype'] = 2;
$test1['maplvllo'] = 0;
$test1['maplvlhi'] = 10000;
$test1['timelvllo'] = 1;
$test1['timelvlhi'] = 3;
$test1['permalink'] = 'cabin';
$test1['fulltext'] =  "cabin this is a picture of new year's eve at the cabin at kanopolis";
$test1['tsfulltext'] = "to_tsvector(' cabin this is a picture of new year''s eve at the cabin at kanopolis ')";

echo "test1\n";

$a = insertRecord($test1);
echo "status $a\n";

echo "complete\n";
return;

//----------------------------------------------------------
// (c) Copyright 2010 Voyc.com
?>
