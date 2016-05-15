<?php
// (c) Copyright 2010 MapTeam, Inc.
//----------------------------------------------------------

/**
 * This dynamic web page lists all the stories with a link to each one.
 * Pages are broken out by alphabet.
 * select author || ': <a href="http://www.voyc.com?story=' || permalink || '">' || headline || '</a><br/>' from fpd.fpd where author is not null and author <> '' order by author, headline
**/

require_once(dirname(__FILE__).'/../phplib/config.php');
require_once(dirname(__FILE__).'/../phplib/jlog.php');
require_once(dirname(__FILE__).'/../phplib/dbUtilities.php');
 
// globals
$server = 'http://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['SCRIPT_NAME']);
$title = 'stories';

define_syslog_variables();
openlog( $title.'php', LOG_PID, LOG_LOCAL0);

// inputs
$taint_alpha = isset($_REQUEST['alpha']) ? $_REQUEST['alpha'] : false;
$alpha = (strlen($taint_alpha) == 1 && isAlpha($taint_alpha)) ? $taint_alpha : '';

// draw the page
echo '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">'."\n";
echo "<html>\n";
echo "<head>\n";
echo "<title>voyc $title</title>\n";
echo "</head>\n";
echo "<body>\n";

echo "<h1>Stories</h1>\n";
$alphabet = array('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z');
foreach ( $alphabet as $x) {
	echo "<a href=\"$server/stories.php?alpha=$x\">$x</a> - \n";
}
echo "<br/><br/>\n";

// the query
$sql = "select permalink, headline from fpd.fpd where datatype = 11 and substr(permalink, 1, 1) = '$alpha' order by permalink";

//execute SQL query 
$conn = getConnection();
$result = @pg_query($conn, $sql);
if (!$result) {
    syslog(LOG_DEBUG, "Query error ".pg_last_error()." $sql");
    return;
}

// get the number of rows in the resultset
$numrows = pg_num_rows($result);

// iterate through resultset
for ($i=0; $i<$numrows; $i++) {
    $row = pg_fetch_array($result, $i, PGSQL_ASSOC);
    $headline = $row['headline'];
    $permalink = $row['permalink'];
	echo "<a href=\"$server?story=$permalink\">$headline</a><br/>\n";
}

echo "</body>\n";
echo "</html>\n";
return;

function isAlpha($str) {
	return ( ! preg_match("/[a-z]/i", $str)) ? FALSE : TRUE;
}

//----------------------------------------------------------
// (c) Copyright 2010 MapTeam, Inc.
?>
