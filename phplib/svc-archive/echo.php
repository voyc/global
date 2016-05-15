<?php
$s = "";
foreach ($_POST as $key => $value) {
	$s .= $key . "-" . $value . ";";
}

// echo the inputs
//$xml = rawurlunencode($xml);
//echo $s;

echo $_POST["data"];
return;
?>