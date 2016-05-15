<?php
// (c) Copyright 2010, 2013 voyc.com
//----------------------------------------------------------

/**
 * This dynamic web page lists all the authors with a link to each one.
 * select '<a href="http://www.voyc.com?author=' || author || '">' || author || '</a><br/>' from fpd.fpd where author is not null and author <> '' group by author order by author
**/

require_once(dirname(__FILE__).'/../phplib/config.php');
require_once(dirname(__FILE__).'/../phplib/jlog.php');
require_once(dirname(__FILE__).'/../phplib/dbUtilities.php');
 
// globals
$server = 'http://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['SCRIPT_NAME']);
$title = 'contributors';

define_syslog_variables();
openlog( $title.'php', LOG_PID, LOG_LOCAL0);

// draw the page
echo '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">'."\n";
echo "<html>\n";
echo "<head>\n";
echo "<title>voyc $title</title>\n";
echo "</head>\n";
echo "<body>\n";

echo "<h1>Contributors</h1>\n";

// the query
$sql = "select author from fpd.fpd where author is not null and author <> '' group by author order by author";

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
$bounds = array();
for ($i=0; $i<$numrows; $i++) {
    $row = pg_fetch_array($result, $i, PGSQL_ASSOC);
    $author = $row['author'];
    $aut = str_replace(' ', '+', $author);
    $aut = strtolower($aut);
    
	echo "<a href=\"$server?q=$aut\">$author</a><br/>\n";
}

echo "</body>\n";
echo "</html>\n";
return;
?>
