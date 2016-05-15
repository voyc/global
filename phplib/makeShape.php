<?php
// (c) Copyright 2008 Voyc.com
//----------------------------------------------------------

/** 
 * This library file contains the makeShape() function.
 */

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

// get boundaries of map
$n = 90.0;
$s = -90.0;
$w = -180.0;
$e = 180.0;

// get size in pixels of map
$wd = 4800;
$ht = 2400;

/** 
 * Create an image file from a polygon.
 *
 * @param $col string Columnname
 * @param $q string plain text query string
 */
function makeshape( $a) {
	global $colorstack, $color, $mincolor, $maxcolor;
	global $n, $s, $e, $w, $wd, $ht;
	
	// if no shape object, bailout	
	if (strlen($a['the_geom']) <= 0) {
		return;
	}

	// interpolate boundary coordinates to x/y
	$xw  = intval(($wd / ($e - $w)) * ($a['xmin'] - $w));
	$xe  = intval(($wd / ($e - $w)) * ($a['xmax'] - $w));
	$yn  = intval(($ht / ($n - $s)) * ($a['ymax'] - $s));
	$ys  = intval(($ht / ($n - $s)) * ($a['ymin'] - $s));
	$pwd = $xe - $xw;
	$pht = $yn - $ys;
	
	//if ($pwd <= 1 || $pht <= 1) {
	//	echo $a['id']." ".$a['headline']."dimensions less than 1\n";
	//	return;
	//}
	
    // draw the polygons
    $pattern = "/MULTIPOLYGON\(\(\((.*?)\)\)\)/";
    $items;
    preg_match( $pattern, $a['the_geom'], $items);

	// if not multipolygon, see if it's a polygon    
    if (count($items) <= 1) {
	    $pattern = "/POLYGON\(\((.*?)\)\)/";
	    preg_match( $pattern, $a['the_geom'], $items);
    }

    $polygons = split("\)\),\(\(", $items[1]);
    $polygonCount = count($polygons);
    for ($p=0; $p<$polygonCount; $p++) {

	 	// convert coordinates to points  
		$points = array();
		$coords = split(",", $polygons[$p]);
        $coordCount = count($coords);
        for ($j=0; $j<$coordCount; $j++) {
            $coord = split(" ",$coords[$j]);
            //echo "[".round($co[1],6).",".round($co[0],6)."],";

 			$x = intval(($wd / ($e - $w)) * ($coord[0] - $w)) - $xw;
			$y = intval(($ht / ($n - $s)) * ($coord[1] - $s)) - $ys;
			
			$y = $pht - $y;
			
			$points[] = $x;
			$points[] = $y;
        }
	}

	// create image
	$image = imagecreatetruecolor($pwd+1, $pht+1);
	
	// set background color and make it transparent
	$bg  = imagecolorallocate($image, 1,1,1);
	imagefilledrectangle($image, 0, 0, $pwd, $pht, $bg);
	imagecolortransparent( $image, $bg);
	
	// set shape color
	$color = $a['color'];
	$rgb = imagecolorallocate($image, $colorstack[$color][0], $colorstack[$color][1], $colorstack[$color][2]);
  
	// fill polygon
	imagefilledpolygon($image, $points, $coordCount, $rgb);
	
	// save image
	imagepng( $image, "../img/".$a['id'].".png");
	
	// free memory
	imagedestroy( $image);
}

//----------------------------------------------------------
// (c) Copyright 2008 Voyc.com
?>
