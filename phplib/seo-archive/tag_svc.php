<?php
// (c) Copyright 2010, 2014 voyc.com

/**
 * This dynamic web page lists all the tags with a link to each one.
 * Pages are broken out alphabetically as needed.
**/

require_once(dirname(__FILE__).'/../config.php');
require_once(dirname(__FILE__).'/../jlog.php');
require_once(dirname(__FILE__).'/../dbUtilities.php');

function tag() {
	openjlog(basename(__FILE__));
	$executionTime = microtime(true);

	// global constants
	//$server = 'http://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['SCRIPT_NAME']);
	$server = 'http://www.voyc.com/";
	$maxlinks = 100;
	
	// raw inputs
	$taint_tag = isset($_REQUEST['tag']) ? $_REQUEST['tag'] : false;
	
	// validate inputs
	$input_tag = isAlpha($taint_tag) ? $taint_tag : '';
	$input_tag_length = strlen($input_tag);
	
	// the query
	$sql = "select tags from fpd.fpd where editstatus <> 10 and tags is not null and tags <> ''";
	
	//execute SQL query 
	$numrows = 0;
	$conn = getConnection();
	if (!$conn) return;
	$result = @pg_query($conn, $sql);
	if (!$result) return;
	$numrows = pg_num_rows($result);
	
	// iterate through resultset and make an array of tags
	$numtags = 0;
	$atags = array();
	for ($i=0; $i<$numrows; $i++) {
	    $row = pg_fetch_array($result, $i, PGSQL_ASSOC);
	    $tags = $row['tags'];
	    $tgs = strtolower($tags);
	    //$a = explode(',', $tgs);
		$a = preg_split("/[\s,]+/", $tgs);
	    foreach ($a as $tag) {
	    	$atags[$tag] = 1;
	    }
	}
	$numtags = count($atags);

	// make an array of qualified tags
	$numQualified = 0;
	$qtags = array();
	if ($input_tag_length <= 0) {
		$qtags = $atags;
	}
	else {
		foreach ($atags as $t => $v) {
			if (substr($t, 0, $input_tag_length) == $input_tag) {
		    	$qtags[$t] = 1;
			}
		}
	}
	$numQualified = count($qtags);
	
	// sort the tags
	ksort($qtags);
	
	// draw the page
	echo "<!DOCTYPE html>\n";
	echo "<html>\n";
	echo "<head>\n";
	echo "<meta http-equiv='content-type' content='text/html; charset=UTF-8'/>\n";
	echo "<title>voyc tags</title>\n";
	echo "</head>\n";
	echo "<body>\n";
	echo "<h1>Tags</h1>\n";
	
	// draw either an alpha list or a detail list
	if ($numQualified > $maxlinks) {
		// draw alpha list
		$alphabet = array('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z');
		foreach ( $alphabet as $x) {
			$a = $input_tag . $x;
			echo "<a href=\"$server/tag.php?tag=$a\">$a</a><br/>\n";
		}
	}
	else {
		// draw detail list
		foreach ($qtags as $t => $v) {    
			if (substr($t, 0, $input_tag_length) == $input_tag) {
			    $tg = str_replace(' ', '+', trim($t));
				echo "<a href=\"$server?q=$tg\">$t</a><br/>\n";
			}
		}
	}
	
	// finish page
	echo "Rows: $numrows<br/>\n";
	echo "Tags: $numtags<br/>\n";
	echo "Qualified: $numQualified<br/>\n";
	$executionTime = microtime(true) - $executionTime;
	echo "<br/>Time:$executionTime<br/>\n";
	echo "</body>\n";
	echo "</html>\n";
}

// input validation
function isAlpha($str) {
	return ( ! preg_match("/[a-z]/i", $str)) ? FALSE : TRUE;
}
?>
