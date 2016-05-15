<?php
$set = (isset($_GET['set'])) ? $_GET['set'] : false;
$file = dirname(__FILE__).'/../../datasets/'.$set;
echo file_get_contents($file);
?>
