<?php
// (c) Copyright 2008,2010 voyc.com
//----------------------------------------------------------

/**
 * Web service to update records.
 * Called from the web app to insert, change, or delete a record.
 * POST with an input xml string
 */
 
/**
 * 
 */
require_once(dirname(__FILE__).'/../../phplib/jlog.php');
require_once(dirname(__FILE__).'/../../phplib/tagRecord.php');
require_once(dirname(__FILE__).'/../../phplib/insertRecord.php');

openjlog(basename(__FILE__));

// Grant access to specified domains
if(isset($_SERVER['HTTP_ORIGIN']) && ($_SERVER['HTTP_ORIGIN'] == "http://www.voyc.com" || $_SERVER['HTTP_ORIGIN'] == "http://www.huxleysparrot.com")) {
    header('Access-Control-Allow-Origin: http://www.huxleysparrot.com');
    header('Content-type: application/xml');
}
//else {
//	return;
//}

// inputs
$taint_data = isset($_POST['data']) ? $_POST['data'] : '';

// TODO: validate data: a valid utf-8 xml string 
if (true) {
	$data = $taint_data;
}

jlog(JLOG_DEBUG,'start, '. $data);

// parse the input xml string into a php array
$dom = new DOMDocument();
$dom->loadXML($data);
$a = array();
$acolumns = array('token','action','id','version','headline','abstract','author','placename','geometry','tags','storyurl','imageurl','thumburl','when','begin','end','datatype','maptype','forebear','parent','bibid','feeling');
foreach($acolumns as $column) {
	$sub = $dom->getElementsByTagName($column);
	if ($sub->item(0)) {
		$a[$column] = $sub->item(0)->nodeValue;
	}
}
	
// we will output xml
header('Content-Type: text/xml');

// validate action
$action = (isset($a['action'])) ? $a['action'] : '';
if ($action == 'update' && !isset($a['id'])) {
	writeResponse('fail', 'invalid action');
	return;
}
if ($action == 'delete' && !isset($a['id'])) {
	writeResponse('fail', 'invalid action');
	return;
}
if ($action == 'insert' && isset($a['id']) && $a['id'] > 0) {
	writeResponse('fail', 'invalid action');
	return;
}

$b = $a;
if ($action != 'delete') {
	$b = tagRecord($a);
}

$c = insertRecord($b);
writeResponse($c['rc'], $c['rc'], array('id' => $c['id']));
return;

//----------------------------------------------------------
// (c) Copyright 2008,2010 voyc.com
?>
