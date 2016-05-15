<?php
// (c) Copyright 2008, 2014 Voyc.com
//----------------------------------------------------------

/**
 * This library file contains the getStartupPanel() and related functions.
 * These functions are called from index.php on initial page load.
 * We return variables and write cookies which tell the javascript how to initialize the display.
 * The reason we do it this way is for SEO.
 * The stories and queries are 
**/

require_once(dirname(__FILE__).'/config.php');
require_once(dirname(__FILE__).'/jlog.php');
require_once(dirname(__FILE__).'/dbUtilities.php');
require_once(dirname(__FILE__).'/parseQuery.php');
 
openjlog(basename(__FILE__));

// globals
$story = '';
$q = '';
$storyid = 0;
$headline = '';
$abstract = '';
$imageurl = '';
$items = '';
$timebegin = 0;
$timeend = 0;
$timecenter = 0;
$lat = 0;
$lng = 0;


/**
 * Read the database based on the q and story parameters.
 * @param $a {array} A copy of $_REQUEST
 * @return {string}
 */

function readStartup($a) {
	global $story, $q, $storyid, $headline, $abstract, $imageurl, $items;
	global $lat, $lng, $timebegin, $timeend, $timecenter;

	$q = (isset($a['q'])) ? $a['q'] : '';
	$story = (isset($a['story'])) ? $a['story'] : '';

	//jlog(JLOG_DEBUG,"starting voyc with story=$story, q=$q");

	$conn = getConnection();

	if ($q) {
		$maxRows = 50;
		$columnList = "id, timebegin, timeend, translate(headline,chr(10),';') as headline, abstract, author, xmin(the_geom), xmax(the_geom), ymin(the_geom), ymax(the_geom), imageurl, datatype";

		$queryClause = parseQuery("fulltext", $q);
	
		// the query
		$sql = "select ".$columnList." from fpd.fpd where ".
		       $queryClause.
		       " and datatype = 11".
		       " order by magnitude desc ".
		       "limit $maxRows";
		//jlog(JLOG_DEBUG,$sql);
		
		//execute SQL query 
		$result = @pg_query($conn, $sql);
		if (!$result) {
			jlog(JLOG_DEBUG,"Query error ".pg_last_error()." $sql");
			return;
		}
		
		// get the number of rows in the resultset
		$numrows = pg_num_rows($result);
		if (!$numrows) {
			jlog(JLOG_DEBUG,"No records found for q query: $sql");
			return;
		}
	
		// iterate through resultset
		$bounds = array();
		for ($i=0; $i<$numrows; $i++) {
			$row = pg_fetch_array($result, $i, PGSQL_ASSOC);
			$id = $row['id'];
			
			$h = addslashes($row['headline']);
			$a = addslashes($row['abstract']);
			$iu = $row['imageurl'];

			$datatype = $row['datatype'];
			$b = $row['timebegin'];
			$e = $row['timeend'];
		
			$gn = $row['ymax'];
			$gs = $row['ymin'];
			$ge = $row['xmax'];
			$gw = $row['xmin'];
		
			if (!$storyid) {
				$storyid = $id;
				$headline = $h;
				$abstract = $a;
				$imageurl = $iu;

				$bounds["n"] = $gn;
				$bounds["s"] = $gs;
				$bounds["w"] = $gw;
				$bounds["e"] = $ge;
				$bounds["begin"] = $b;
				$bounds["end"] = $e;
			}

			$items .= "$h $a <br/>";
			
			if ($e == 7777) {
				$e = $currentTime;
			}
		
			// calc time/space boundaries of the result set
			if ($row['datatype'] == 11) {
				if ($bounds["n"] < $gn) {
					$bounds["n"] = $gn;
				}
				if ($bounds["s"] > $gs) {
					$bounds["s"] = $gs;
				}
				if ($bounds["w"] > $gw) {
					$bounds["w"] = $gw;
				}
				if ($bounds["e"] < $ge) {
					$bounds["e"] = $ge;
				}
				if ($bounds["begin"] > $b) {
					$bounds["begin"] = $b;
				}
				if ($bounds["end"] < $e) {
					$bounds["end"] = $e;
				}
			}
		}
	
		$timebegin = $bounds['begin'];
		$timeend = $bounds['end'];
		$timecenter = $timebegin + (($timeend-$timebegin)/2);

		$n = $bounds['n'];
		$s = $bounds['s'];
		$e = $bounds['e'];
		$w = $bounds['w'];
		$lat = $s + (($n-$s)/2);
		$lng = $w + (($e-$w)/2);
	}

	if ($story) {
		$sql = "select id,headline,abstract,imageurl,timebegin,timeend,x(ST_Centroid(the_geom)) as lng,y(ST_Centroid(the_geom)) as lat from fpd.fpd where permalink = '$story'";
		$result = @pg_query($conn, $sql);
		$numrows = pg_num_rows($result);
		if ($numrows <= 0) {
			jlog(JLOG_DEBUG,"no rows found for startup story ** ".$sql);
			return '';
		}
		
		$row = pg_fetch_array($result, 0, PGSQL_ASSOC);
		$storyid = $row['id'];
		$headline = $row['headline'];
		$abstract = $row['abstract'];
		$imageurl = $row['imageurl'];

		$timebegin = $row['timebegin'];
		$timeend = $row['timeend'];
		$timecenter = $timebegin + (($timeend-$timebegin)/2);

		$lat = $row['lat'];
		$lng = $row['lng'];
	}
	return;
}

/**
 * Compose a string which will fill the detail panel.
 * This is SEO optimized for the keywords in the story or q parameter.
 * Note that this panel will be replaced by the javascript.
 */
function getStartupPanel() {
	global $story, $q, $headline, $abstract, $imageurl, $items;

	$s = '';
	if ($story || $q) {
		$imgsrc = ($imageurl) ? $imageurl : 'images/no-photo.png';
		$imgalt = str_replace("'", " ", $headline);
		$s = "<img class='photo' src='$imgsrc' alt='$imgalt'/>";
		$s .= "<span class='headline'>$headline</span><br/>";
		$s .= "$abstract<br/>";
	}
	if ($q) {
		$s .= $items;
	}
	return $s;
}

/**
 * Return "block" or "none".
 * If we have a startup Panel then we hide the Welcome panel.
 */
function getStartupDisplayWelcome($a) {
	global $story, $q, $headline, $abstract, $imageurl, $items;

	$s = ($q || $story) ? 'none' : 'block';
	return $s;
}

/**
 * Write cookies.  The javascript will use these to know how to initialize the display.
 */
function writeStartupCookies() {
	global $story, $q, $storyid, $headline, $abstract, $imageurl, $items;
	global $lat, $lng, $timebegin, $timeend, $timecenter;
	if ($storyid) {
		setCookie('_story', $storyid);
		setCookie('_startq', $q);
		setCookie('_t', $timecenter);
		setCookie('_tz', 1);
		setCookie('_m', $lat.'_'.$lng);
	}
}
?>
