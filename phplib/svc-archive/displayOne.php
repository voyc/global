<?php

require_once(dirname(__FILE__).'/../../phplib/config.php');

$conn = @pg_connect("port=$dbport dbname=$dbname user=$dbuser password=$dbpassword");
if (!$conn) {
	echo 'unable to connect to database';
	return false;
}

$sql = 'select id, headline, abstract from fpd.fpd where id = 35066';

//execute
$result = pg_query($conn, $sql);
if (!$result) {
	echo 'no result';
	return false;
}

//$numrows = pg_affected_rows($result);
//if ($numrows <= 0) {
//	echo 'no rows';
//	return false;
//}


//$id = 3;
//$headline = 'hi';
//$abstract = 'this is a long one';

$row = pg_fetch_array($result, 0, PGSQL_ASSOC);

$id = $row['id'];
$headline = $row['headline'];
$abstract = $row['abstract'];


?>
<html>
	<head>
		<title>login test</title>
		
		<script>
		</script>
	</head>

	<body>
		<?=$id?><br/>
		<?=$headline?><br/>
		<?=$abstract?><br/>
	</body>
</html>
<!-- (c) Copyright 2006 voyc.com  -->
