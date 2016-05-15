<?php
// (c) Copyright 2008 voyc.com
//----------------------------------------------------------

/**
 * Web service to update records.
 * 
 * Called from the web app to read, insert, change, or delete a record.
 * 
 * Input arguments:
 *    1. xml
 * 
 */
 
/**
 * 
 */
require_once(dirname(__FILE__).'/../../phplib/config.php');
require_once(dirname(__FILE__).'/../../phplib/jlog.php');
require_once(dirname(__FILE__).'/decDate.php');
require_once(dirname(__FILE__).'/parseXml.php');
require_once(dirname(__FILE__).'/tagRecord.php');
require_once(dirname(__FILE__).'/insertRecord.php');

openjlog(basename(__FILE__));

// inputs
$taint_data = isset($_POST['data']) ? $_POST['data'] : '';

// TODO: validate data: a valid utf-8 xml string 
if (true) {
	$data = $taint_data;
}

jlog(JLOG_DEBUG,'start, '. $data);

// convert the input xml to a php associative array
$a = parseXml($data);

// authorize
$user = (isset($a['user'])) ? $a['user'] : '';
$token = (isset($a['token'])) ? $a['token'] : '';

// global
$idProcessed = null;

// column names
$stringcolumns = array("headline"=>1,"abstract"=>1,"author"=>1,"placename"=>1,"tags"=>1,"storyurl"=>1,"imageurl"=>1,"bibid"=>1,"permalink"=>1,"fulltext"=>1);
$numbercolumns = array("timebegin"=>1,"timeend"=>1,"timetype"=>1,"timeprecision"=>1,"datatype"=>1,"maptype"=>1,"forbear"=>1,"parent"=>1,"maplvllo"=>1,"maplvlhi"=>1,"timelvllo"=>1,"timelvlhi"=>1,"the_geom"=>1,"tsfulltext"=>1);
	
// we will output xml
header('Content-Type: text/xml');

$action = (isset($a['action'])) ? $a['action'] : '';
switch ($action) {

	case 'get':
		get($a);		
		break;
		
	case 'update':
		update($a);
		break;

	case 'insert':
		insert($a);
		break;

	default:
		$msg = 'invalid action: '.$action;
		jlog(JLOG_DEBUG,$msg);
		$dom = new DOMDocument('1.0', 'iso-8859-1');
		$response = formatResponse($dom, 'fail', $msg);
		echo $dom->saveXML();
		break;
}
return;

/** 
 * Read one record.
 */
function get($id) {
	global $dbport, $dbname, $dbuser, $dbpassword;
	//establish a connection to database 
	$conn = @pg_connect("port=$dbport dbname=$dbname user=$dbuser password=$dbpassword");
	if (!$conn) {
	    jlog(JLOG_DEBUG,"unable to connect");
	    return false;
	}
	
	// get the coordinates only if using polygon method
	$columnList = "id, timebegin, timeend, forebear, translate(headline,chr(10),';') as headline, author, maptype, abstract, xmin(the_geom), xmax(the_geom), ymin(the_geom), ymax(the_geom), AsText(the_geom) as geometry, placename, tags, storyurl, imageurl, timetype, timeprecision, version, parent, datatype, maptype, maplvlhi, maplvllo, timelvllo, timelvlhi";

	// the query
	$sql = " select ".$columnList." from fpd ".
	       " where id = " . $id;
	
	//execute SQL query 
	$result = @pg_query($conn, $sql);
	if (!$result) {
	    jlog(JLOG_DEBUG,"Error reading the record to edit ** ".pg_last_error()." ** $sql");
	    return false;
	}
	
	// set status
	$numrows = pg_num_rows($result);
	switch ($numrows) {
		case 0: 
			$status = "not found";
			break;
		case 1: 
			$status = "success";
			break;
		default: 
			$status = "multiple results";
			break;
	}

	// format xml output
	$dom = new DOMDocument('1.0', 'iso-8859-1');
	$response = formatResponse($dom, $status, null);

	// read and format the one returned record
	if ($numrows == 1) {
	    $row = pg_fetch_array($result, 0, PGSQL_ASSOC);
		formatEntry($dom, $response, $row);

		// read the hiearchy associated with this record
		jlog(JLOG_DEBUG,"row[forebear] ** ".$row["forebear"]);
		jlog(JLOG_DEBUG,"is true ** ". ($row["forebear"]) );
		if ($row["forebear"]) {
			$sqlHierarchy = "select id, headline, timebegin, timeend, forebear, parent from fpd".
							" where forebear = " . $row["forebear"] . 
							" and editstatus <> 3" . 
							" order by forebear, parent, timebegin, timeend";
			$result = @pg_query($conn, $sqlHierarchy);
			if (!$result) {
			    jlog(JLOG_DEBUG,"Error reading hierarchy ** ".pg_last_error()." ** $sqlHierarchy");
			    return false;
			}
		
			// add a hierarchy section 
			$numrows = pg_num_rows($result);
			if ($numrows > 0) {
				formatHierarchy($dom, $response, $result);
			}
		}
	}

	// write output xml
	echo $dom->saveXML();
	return true;
}

function writeResponse( $status, $msg) {
	$dom = new DOMDocument('1.0', 'iso-8859-1');
	$response = formatResponse($dom, $status, $msg);
	echo $dom->saveXML();
}

/**
 *  Pass in a dom.
 *  Create a <response> element with action, status, id, and message elements.
 *  Attach it to the input DOM.
 */
function formatResponse( $dom, $status, $msg) {
	global $action,$idProcessed;
	$response = $dom->createElement('response');
	$dom->appendChild($response);
	
	$sub = $dom->createElement( "action", $action);
	$response->appendChild($sub);

	$sub = $dom->createElement( "status", $status);
	$response->appendChild($sub);

	if ($msg) {
		$sub = $dom->createElement( "message", $msg);
		$response->appendChild($sub);
	}

	if ($idProcessed) {
		$sub = $dom->createElement( "id", $idProcessed);
		$response->appendChild($sub);
	}

	return $response;
}

/**
 *  Pass in a dom with a <response> element.
 *  Create an <entry> element with one element for each data column.
 *  Attach it to the <response> element.
 */
function formatEntry( $dom, $response, $row) {
	$entry = $dom->createElement('entry');
	$response->appendChild($entry);
	
	$array = array("id","version","headline","abstract","author","geometry","placename","tags","storyurl","imageurl", "datatype", "maptype", "forebear", "parent", "maplvlhi", "maplvllo", "timetype", "timelvllo", "timelvlhi");
	
	foreach ($array as $i => $value) {
		$sub = $dom->createElement( $value, $row[$value]);
		$entry->appendChild($sub);
	}
	
	formatTime($dom, $entry, $row);
}

function formatTime( $dom, $entry, $row) {
	$timetype = $row['timetype'];
	$timeprecision = $row['timeprecision'];
	$timebegin = $row['timebegin'];
	$timeend = $row['timeend'];

	switch ($timeprecision) {
		case 1: // YEAR
			$begin = intval( $timebegin);
			$end = intval( $timeend);
			break;
		case 2: // DAY
			$o = convertDecToParts($timebegin);
			$begin = $o['y'] . ' ' . $o['m'] . ' ' . $o['d'];
			$o = convertDecToParts($timeend);
			$end = $o['y'] . ' ' . $o['m'] . ' ' . $o['d'];
			break;
	}
	
	$time = $dom->createElement( "time");
	$entry->appendChild($time);

	switch ($timetype) {
		case 1: // BAR
		case 2: // POINT
		case 3: // boundingrange
			$sub = $dom->createElement( "begin", $begin);
			$time->appendChild($sub);
			$sub = $dom->createElement( "end", $end);
			$time->appendChild($sub);
			break;
		//case 2: // POINT  alternative, not supported by Editor.js
		//	$sub = $dom->createElement( "when", $begin);
		//	$time->appendChild($sub);
		//	break;
	}
}

function formatHierarchy( $dom, $response, $result) {
	// create the hierarchy element and attach it to the response
	$tree = $dom->createElement('hierarchy');
	$response->appendChild($tree);

	// Each entry in this array contains an id and a pointer to its sub-element.
	$array = array();

	// build all the branches
	$numrows = pg_num_rows($result);
	for ($i=0; $i<$numrows; $i++) {
	    $row = pg_fetch_array($result, $i, PGSQL_ASSOC);
	    $id = $row['id'];
	    $headline = $row['headline'];
	    $timebegin = $row['timebegin'];
	    $timeend = $row['timeend'];
	    $forebear = $row['forebear'];
	    $parent = $row['parent'];

		$branch = $dom->createElement( "branch");

		addAttribute($dom,$branch,"id",(string)$id);
		addAttribute($dom,$branch,"begin",(string)$timebegin);
		addAttribute($dom,$branch,"end",(string)$timeend);
		addAttribute($dom,$branch,"headline",$headline);
		addAttribute($dom,$branch,"forebear",(string)$forebear);
		addAttribute($dom,$branch,"parent",(string)$parent);

		$array[$id] = $branch;
	}

	// now loop through again and attach the branches in tree order
	$numrows = pg_num_rows($result);
	for ($i=0; $i<$numrows; $i++) {
	    $row = pg_fetch_array($result, $i, PGSQL_ASSOC);
	    $id = $row['id'];
	    $parent = $row['parent'];

		// get this element's parent branch from the array
		$branch = $array[$id];

		if ($parent == 0) {
			$tree->appendChild($branch);  // the root
		}
		else {
			$parentBranch = $array[$parent];
			$parentBranch->appendChild($branch);  // the root
		}
	}
}

function addAttribute( $dom, $element, $name, $value) {
	$attr = $dom->createAttribute($name);
	$element->appendChild($attr);
	$text = $dom->createTextNode($value);
	$attr->appendChild($text);
}

function translateWKTtoKML($wkt) {
	// example wkt: MULTIPOLYGON(((41.9044107472723 27.7023378922358,42.5121947478383 26.6626278912674,44.0875827493055 26.8202038914142,44.9567627501151 27.555556892099,45.1740577503174 28.6060618930774,44.3592017495585 29.3939408938111,43.0011087482937 29.7616178941537,41.8059867471807 29.0787888935176,41.9044107472723 27.7023378922358)))
	$kml = "";
	return $kml;
}

function translateKMLtoWKT($kml) {
	// example wkt: POINT(((41.9044107472723 27.7023378922358,42.5121947478383 26.6626278912674,44.0875827493055 26.8202038914142,44.9567627501151 27.555556892099,45.1740577503174 28.6060618930774,44.3592017495585 29.3939408938111,43.0011087482937 29.7616178941537,41.8059867471807 29.0787888935176,41.9044107472723 27.7023378922358)))
	$wkt = "";
	return $kml;
}

/**
 * Update one record.
 */
function update($a) {
	// validate inputs
	if (!isset($a['id']) || !isset($a['version'])) {
		return writeResponse( 'fail', 'Missing id and/or version');
	}

	// update the database record
	$rc = updateRecord($a);

	writeResponse($rc['status'], $rc['msg']);
}

function updateRecord($a) {
	global $dbport, $dbname, $dbuser, $dbpassword;

	//establish a connection to database 
	$conn = @pg_connect("port=$dbport dbname=$dbname user=$dbuser password=$dbpassword");
	if (!$conn) {
		jlog(JLOG_DEBUG,"unable to connect to database");
		return array('status'=>'fail', 'msg'=>'System error');
	}

	//update the record
	$sql = formatUpdateSql($a);
	$result = @pg_query($conn, $sql);
	if (!$result) {
		$msg = "Query error ** ".pg_last_error()." ** ".$sql;
		jlog(JLOG_DEBUG,$msg);
		$result = @pg_query($conn, "ROLLBACK");
		if (!$result) {
			$msg .= "Query error ".pg_last_error()." ROLLBACK";
			jlog(JLOG_DEBUG,$msg);
		}
		return array('status'=>'fail', 'msg'=>'System error');
	}

	// make sure of a match
	$numrows = pg_affected_rows($result);
	if ($numrows <= 0) {
		$msg = "No records updated ** ".pg_last_error()." ** ".$sql;
		jlog(JLOG_DEBUG,$msg);
		$result = @pg_query($conn, "ROLLBACK");
		if (!$result) {
			$msg .= "Query error ".pg_last_error()." ROLLBACK";
			jlog(JLOG_DEBUG,$msg);
		}
		return array('status'=>'fail', 'msg'=>'Another user changed this record.  Try again.');
	}
	
	return array('status'=>'success', 'msg'=>'');
}

function formatUpdateSql($a) {
	global $stringcolumns, $numbercolumns;
	global $idProcessed;

	$id = $a['id'];
	$prevversion = $a['version'];
	$newversion = $prevversion + 1;

	$columns = "version=".$newversion;
	$d = ", ";
	foreach ($stringcolumns as $i => $value) {
		if (isset($a[$i])) {
			$columns .= $d . $i . "='" . pg_escape_string($a[$i]) . "'";
			//$d = " ,";
		}
	}
	foreach ($numbercolumns as $i => $value) {
		if (isset($a[$i])) {
			$columns .= $d . $i . "=" . $a[$i];
		}
	}

	$sql = "update fpd set " . $columns . " where id=" . $id . " and version=" . $prevversion;
	
	$idProcessed = $id;
	return $sql;
}

/**
 * Insert one record.
 *
 *	insert into fpd (headline, abstract, storyurl, timebegin, timeend, placeName, author, tags, imageUrl, the_geom)
 *	values (
 *		'US funding Evo Morales opponents', 
 *		'Benjamin Dangl:  The Bush administration uses USAID to funnel money to opponents of Bolivian president Evo Morales.', 
 *		'http://www.democracynow.org/2008/2/11/report_us_funding_opposition_groups_in',
 *		2008.025,
 *		2008.140,
 *		'Bolivia',
 *		'DemocracyNow',
 *		'Bolivia, Evo Morales',
 *		'http://i3.democracynow.org/images/story/29/16429/DanglWeb.jpg',
 *		geomfromtext('POINT(-68.14922333 -16.49469051)')
 *	)
 */
function insert($id) {
	global $dbport, $dbname, $dbuser, $dbpassword;
	global $data;

	$a = parseXml($data);
	$sql = formatInsertSql($a);
	$status = executeSql($sql);
	
	// output the status
	$dom = new DOMDocument('1.0', 'iso-8859-1');
	$status = ($status) ? 'success' : 'fail';
	$response = formatResponse($dom, $status, null);
	echo $dom->saveXML();
}

function formatInsertSql($ar) {
	global $stringcolumns, $numbercolumns;
	global $idProcessed;
	
	$a = $ar;

	// get new id
	$newId = getNextKey();
	$a['id'] = $newId;
	
	if (!array_key_exists('forebear', $a)) {
		$a['forebear'] = $newId;
		$a['parent'] = 0;
	}

	$columns = "id";
	$values = $newId;
	$d = ", ";
	foreach ($stringcolumns as $i => $value) {
		if (isset($a[$i])) {
			$columns .= $d . $i;
			$values  .= $d . "'" . pg_escape_string($a[$i]) . "'";
		}
	}
	foreach ($numbercolumns as $i => $value) {
		if (isset($a[$i])) {
			$columns .= $d . $i;
			$values  .= $d . $a[$i];
		}
	}

	// For a manual insert, initialize the magnitude at 800.
	$columns .= $d . 'magnitude';
	$values  .= $d . 800;

	// For now, forebear is same as id
	$columns .= $d . 'forebear';
	$values  .= $d . $newId;

	$sql = "insert into fpd (" . $columns . ") values (" . $values . ")";
	$idProcessed = $newId;
	return $sql;
}

function executeSql($sql) {
	global $dbport, $dbname, $dbuser, $dbpassword;

	//establish a connection to database 
	$conn = @pg_connect("port=$dbport dbname=$dbname user=$dbuser password=$dbpassword");
	if (!$conn) {
		jlog(JLOG_DEBUG,'unable to connect to database');
		return false;
	}
	
	//execute
	$result = @pg_query($conn, $sql);
	if (!$result) {
		jlog(JLOG_DEBUG,"executeSql failed ** ".pg_last_error()." ** ".$sql);
		return false;
	}
	
	$numrows = pg_affected_rows($result);
	if ($numrows <= 0) {
		jlog(JLOG_DEBUG,"no records updated");
		return false;
	}
	return true;
}

function getNextKey() {
	global $dbport, $dbname, $dbuser, $dbpassword;

	//establish a connection to database 
	$conn = @pg_connect("port=$dbport dbname=$dbname user=$dbuser password=$dbpassword");
	if (!$conn) {
		jlog(JLOG_DEBUG,'unable to connect to database');
		return 0;
	}

	$sql = "select nextval('fpd_id_seq'::regclass)";
	
	//execute
	$result = @pg_query($conn, $sql);
	if (!$result) {
		jlog(JLOG_DEBUG,'No result from getNextKey query ** '.$sql);
		return 0;
	}

	$numrows = pg_num_rows($result);
	if ($numrows != 1) {
		jlog(JLOG_DEBUG,'No row in resultset from getNextKey query ** '.$sql);
		return 0;
	}

	$row = pg_fetch_array($result, 0, PGSQL_ASSOC);
	return $row['nextval'];
}

/*
function parse($xml) {
	// parse the data
	$dom = new DOMDocument();
	$dom->loadXML($xml);

	$array = array("id","version","headline","abstract","author","geometry","placename","tags","storyurl","imageurl","begin","end","when","datatype","maptype","forebear","parent","bibid");
	$row = array();
	foreach ($array as $i => $value) {
		$sub = $dom->getElementsByTagName($value);
		if ($sub->item(0)) {
			$row[$value] = $sub->item(0)->nodeValue;
		}
	}

	// convert time fields
	if (array_key_exists('when', $row)) {
		$time = $row['when'];
		$t = convertStringToDecimalDate($time);
		$row['timebegin'] = $t['decidate'];
		$row['timeend'] = $t['decidate'];
		$row['timetype'] = 2; // POINT
		$row['timeprecision'] = $t['precision'];
	}
	else {
		$time = $row['begin'];
		$t = convertStringToDec($time);
		$row['timebegin'] = $t['decidate'];

		$time = $row['end'];
		$t = convertStringToDec($time);
		$row['timeend'] = $t['decidate'];
		$row['timetype'] = 1; // BAR
		$row['timeprecision'] = $t['precision'];
	}

	unset($row['when']);
	unset($row['begin']);
	unset($row['end']);

	// set defaults for incoming news post
	if (!array_key_exists('maptype', $row) && $row['datatype'] == 11) {
		$row['maptype'] = 5;		
		$row['maplvllo'] = 0;		
		$row['maplvlhi'] = 10000;		
		$row['timelvllo'] = 1;		
		$row['timelvlhi'] = 3;
		
		// if no geometry, do a lookup on the placename
		if (!array_key_exists('geometry', $row)) {
			$placename = $row['placename'];
			$row['geometry'] = placeLookup($placename);
		}
	}

	$row['the_geom'] = "geomfromtext('".$row['geometry']."')";
	unset($row['geometry']);

	// parse hierarchy
	$tree = $dom->getElementsByTagName("hierarchy");
	if ($tree->item(0)) {
		$branches = $tree->item(0)->getElementsByTagName("BRANCH");
		foreach ($branches as $i => $branch) {
			$id = $branch->getAttribute('id');
			$headline = $branch->getAttribute('headline');
			$begin = $branch->getAttribute('begin');
			$end = $branch->getAttribute('end');
			$parent = $branch->getAttribute('parent');
			$forebear = $branch->getAttribute('forebear');
			$newparent = $branch->getAttribute('newparent');
			$newforebear = $branch->getAttribute('newforebear');
			$source = $branch->getAttribute('source');
			
			$branch = array();
			$branch['id'] = $id;
			$branch['newparent'] = $newparent;
			$branch['newforebear'] = $newforebear;
			$row["branches"][$i] = $branch;
		}
	}	
	return $row;
}
*/

/*
function placeLookup($placename) {
	$url = "http://ws.geonames.org/search?maxRows=1&q=" . urlencode($placename);
	$fileContents = file_get_contents($url);
	
	$dom = DOMDocument::loadXML($fileContents);

	$lat = $dom->getElementsByTagName('lat')->item(0)->nodeValue;
	$lng = $dom->getElementsByTagName('lng')->item(0)->nodeValue;
	
	$geom = "POINT(".$lng." ".$lat.")";

	return $geom;
}
*/

/*
older pieces of update
	// start a transaction
	$result = @pg_query($conn, "BEGIN WORK");
	if (!$result) {
	    syslog(LOG_DEUBG, "Error on starting a transaction ** ".pg_last_error()." ** BEGIN WORK");
		return array('status'=>'fail', 'msg'=>'System error');
	}

	// update any hierarchy changes
	if (array_key_exists("branches",$a)) {
		$branches = $a["branches"];
		foreach ($branches as $i => $value) {
			$sql = "update fpd set parent=".$value['newparent'].", forebear=".$value['newforebear']." where id = ".$value['id'];
			if (substr($value['id'],0,3) == "new") {
				$sourceId = substr($value['id'],4);
				$sql = "insert into fpd";
				$sql .= " (abstract,author,bibid,color,culture,datatype,forebear,headline,maplvlhi,maplvllo,maptype,parent,timebegin,timeend,timelvlhi,timelvllo,the_geom,placename,tags,imageurl,storyurl,timetype,timeprecision)";
				$sql .= " select";
				$sql .= " abstract,author,bibid,color,culture,datatype,'".$value['newforebear']."',headline,maplvlhi,maplvllo,maptype,'".$value['newparent']."',timebegin,timeend,timelvlhi,timelvllo,the_geom,placename,tags,imageurl,storyurl,timetype,timeprecision";
				$sql .= " from fpd where id = ".$sourceId;
			}			
			$result = @pg_query($conn, $sql);
			if (!$result) {
				$msg = "update heirarchy error ".pg_last_error()." ".$sql;
				jlog(JLOG_DEBUG,$msg);
				$result = @pg_query($conn, "ROLLBACK");
				if (!$result) {
					$msg .= " Query error ".pg_last_error()." ROLLBACK";
					jlog(JLOG_DEBUG,$msg);
				}
			    return -1;
			}
		}
		unset($a['branches']);
	}

	// end the transaction
	$result = @pg_query($conn, "COMMIT");
	if (!$result) {
		jlog(JLOG_DEBUG,"Query error ".pg_last_error()." COMMIT");
		return array('status'=>'fail', 'msg'=>'System error');
	}

	// read the record we just updated to get the info we need to make a png of the shape
	if (isset($a['maptype']) && $a['maptype'] == 2) {
		$id = $a['id'];
		$columnList = "id, datatype, maptype, color, xmin(the_geom), xmax(the_geom), ymin(the_geom), ymax(the_geom), AsText(the_geom) as the_geom";
		$sql = " select ".$columnList." from fpd ".
		       " where id = " . $id;
		$result = @pg_query($conn, $sql);
		if (!$result) {
			jlog(JLOG_DEBUG,"In updateRecord, query to get data for makeshape ** ".pg_last_error()." ** $sql");
		    return false;
		}
	    $row = pg_fetch_array($result, 0, PGSQL_ASSOC);
	
		// re-generate a png
		makeShape($row);
	}

	return array('status'=>'success', 'msg'=>'');
}
*/
//----------------------------------------------------------
// (c) Copyright 2008 voyc.com
?>
