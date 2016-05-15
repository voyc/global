<?php
// (c) Copyright 2009 Voyc.com
//----------------------------------------------------------

/**
 * Unit test program. 
 * Call it from the command line with no parameters.
 */

require_once(dirname(__FILE__).'/tagRecord.php');

openjlog(basename(__FILE__));

$test1 = array();
$test1['email'] = 'john@hagstrand.com';
$test1['imageurl'] = 'http://i823.photobucket.com/albums/zz157/jhagstrand/Copyof2010-01-16171100.jpg?t=1263769206';
$test1['headline'] = 'Cabin';
$test1['abstract'] = "This is a picture of new year's eve at the cabin at Kanopolis";

echo "test1\n";

$a = tagRecord($test1);
print_r($a);

echo "complete\n";
return;

//----------------------------------------------------------
// (c) Copyright 2009 Voyc.com
?>