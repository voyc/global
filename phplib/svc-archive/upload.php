<?php
// (c) Copyright 2010 voyc.com

require_once(dirname(__FILE__).'/../../phplib/readCsvFile.php');

// global
$destination_path = '/home/jhagstrand/vhost-voyc/upload/csv/';

// form inputs
$uploadsource = $_POST['uploadsource'];
$uploadtoken  = $_POST['uploadtoken'];
$uploadfilename = $_FILES['uploadfile']['name'];
$tmpname = $_FILES['uploadfile']['tmp_name'];

// copy temp file to permanent folder
$target_path = $destination_path . basename( $uploadfilename);
$rc = @move_uploaded_file($tmpname, $target_path);
$result = ($rc) ? 1 : 0;
sleep(1);

// read the file and insert the records
$n = 0;
if ($rc) {
	$n = readCsvFile($target_path, $uploadtoken, $uploadsource);
}
?>

<script language="javascript" type="text/javascript">
window.top.window.g.voyc.stopUpload(<?php echo $result; ?>, <?php echo $n; ?>);
</script> 
