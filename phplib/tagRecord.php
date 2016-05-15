<?php
// (c) Copyright 2008,2014 Voyc.com

/**
 * This library file contains tagRecord() and related functions.
**/

require_once(dirname(__FILE__).'/constants.php');
require_once(dirname(__FILE__).'/loginUtilities.php');
require_once(dirname(__FILE__).'/readExif.php');
require_once(dirname(__FILE__).'/decDate.php');
require_once(dirname(__FILE__).'/lookupPlace.php');

/**
 * Prepare input record data for insert or update in the database.
 * 
 * Tag it, validate, fill missing fields, set defaults, etc.
 *
 * Details:
 *
 *		1.  Validate required and valid values for all columns.
 *
 *				bibid
 *				thumburl
 *             
 *
 *		2.  If an explicit geometry is not provided, find one 
 *				1) from the Exif header on the image provided by the imageurl
 *				2) from a lookup on placename
 *
 *
 *
 *		3.  Compose the values for these fields:
 *				permalink = headline without punctuation
 *				fulltext = tags + author + headline + abstract
 *				tsfulltext = text search version of fulltext
 *
 *		4.  Set the default values of these future-use fields
 *				datatype = newsevent
 *				forebear = 0
 *				parent = 0
 *				maptype = dot
 *				maplvllo = 0
 *				maplvlhi = 10000
 *				timelvllo = 1
 *				timelvlhi = 3
 *
 *	Note: Here is the SQL to set composed fields
 * 
 *	// permalink is composed by using the headline and removing all punctuation
 *	update fpd set permalink = 
 *		trim(both '-' from 
 *			lower( 
 *				regexp_replace(headline, '[\ \~\!\'\"\”\“\‘\?\.\@\#\$\%\^\&\*\(\)\{\}\[\\]\,\/\<\>\;\:]+', '-', 'g')
 *			)
 *		)
 *		where permalink is null
 *
 *	// fulltext is all the text strings concatenated together in lower case
 *	update fpd set fulltext =
 *		lower( 
 *		' ' || 
 *		replace(case when tags isnull then '' else tags end, ',', ' ') || 
 *		' ' || 
 *		case when author isnull then '' else author end || 
 *		' ' || 
 *		case when headline isnull then '' else headline end || 
 *		' ' || 
 *		case when abstract isnull then '' else abstract end ||
 *		' '
 *		)
 *		where fulltext is null
 *	
 *	// tsfulltext (ts = "text search") is composed with a php function
 *	update fpd set tsfulltext = to_tsvector(fulltext)
 *		where tsfulltext is null
 *
 * @param aRecord The input array
 * @return array
 */
function tagRecord($aRecord) {
	// make a working copy of the input array
	$a = $aRecord;
	$a['editstatus'] = EDITSTATUS_RAW;

	// each row should be tied to userid, and optional feedid
	// we need to be able to see who is adding stuff
	// also who edited
	// change log: id, userid, tm, field changed, previous value
	// useridcreated
	// tmcreate
	// useridchanged
	// tmchange	

	// bibid, replaced feedid.  for display, use name of feed
	// we're adding a lot of extra io here, think carefully

	// minimum input
	// 	email or token
	// 	photo
	// 	headline
	// 	abstract
	// use email to lookup userid
	// deprecate bibid
	// add feedid
	// feedid
	// fixed feed records
	//   1: webbrowser
	//   2: email
	//   3: spreadsheet upload
	//
	// display the name of the feed instead of the bibid
	// 
	//
	// action
	// id
	// version
	// headline
	// abstract
	// author
	// placename
	// the_geom (geometry)
	// tags
	// storyurl
	// imageurl
	// when, begin, end

	// bibid

	// if no userid, authorize by token or email.  Set userid and author.
	if (!isset($a['userid'])) {
		$userid = 0;
		if (isset($a['token'])) {
			$auser = authByToken($a['token']);
			$a['userid'] = $auser['id'];
			$a['author'] = $auser['name'];
			$a['newuser'] = $auser['newuser'];
			$a['password'] = $auser['password'];
		}
		elseif (isset($a['email'])) {
			$auser = authByMail($a['email']);
			$a['userid'] = $auser['id'];
			$a['author'] = $auser['name'];
			$a['newuser'] = $auser['newuser'];
			$a['password'] = $auser['password'];
		}
	}
	if (!isset($a['userid'])) {
		return false;  // not authorized
	}

	// if no lat/lon, read from image, or lookup placename from geonames, or lookup story from yahoo getplace
	if (!isset($a['the_geom'])) {
		if (isset($a['imageurl'])) {
			$aExif = readExif($a['imageurl']);
			//echo $a['imageurl']."\n";
			//print_r($aExif);
			if ($aExif && $aExif['status'] == 'ok') {
				$a['the_geom'] = 'POINT('.$aExif['lon'].' '.$aExif['lat'].')';
				$aDate = convertStringToDecimalDate($aExif['datetime']);
				$a['timebegin'] = $a['timeend'] = $aDate['decidate'];
			}
		}
		if (!isset($a['the_geom']) && isset($a['placename'])) {
			$aPlace = lookupPlace($a['placename']);
			if ($aPlace && $aPlace['rc'] > 0) {
				$a['the_geom'] = 'POINT('.$aPlace['lng'].' '.$aPlace['lat'].')';
			}
		}
		if (!isset($a['the_geom']) && isset($a['abstract'])) {
			$aPlace = parseForPlace($a['headline'], $a['abstract']);
			if ($aPlace && $aPlace['rc'] > 0) {
				$a['the_geom'] = 'POINT('.$aPlace['lng'].' '.$aPlace['lat'].')';
				$a['placename'] = $aPlace['name'];
			}
		}
	}
	if (!isset($a['the_geom'])) {
		$a['editstatus'] = EDITSTATUS_NOGEO;
	}

	// if an explicit time is passed in 
	if (isset($a['when'])) {
		$a['timebegin'] = $a['when'];
	}

	// convert the time
	if (isset($a['timebegin']) && is_string($a['timebegin'])) {
		$dt = convertStringToDecimalDate($a['timebegin']);
		$a['timebegin'] = $dt['decidate'];
	}
	if (isset($a['timeend']) && is_string($a['timeend'])) {
		$dt = convertStringToDecimalDate($a['timeend']);
		$a['timeend'] = $dt['decidate'];
	}
	if (isset($a['timebegin']) && !isset($a['timeend'])) {
		$a['timeend'] = $a['timebegin'];
	}
	if (!isset($a['timebegin'])) {
		$a['editstatus'] = EDITSTATUS_NODATETIME;
	}

	// For a manual insert, initialize the magnitude at 800.
	if (!isset($a['magnitude'])) {
		$a['magnitude'] = 800;
	}

	// set defaults
	if (!isset($a['datatype'])) {
		$a['datatype'] = DATATYPE_NEWSEVENT;
	}
	$a['forebear'] = 0;
	$a['parent'] = 0;

	// set defaults for incoming news post
	if (isset($a['datatype']) && $a['datatype'] == DATATYPE_NEWSEVENT && !isset($a['maptype'])) {
		$a['maptype'] = MAPTYPE_DOT;
		$a['maplvllo'] = 1;
		$a['maplvlhi'] = 18;
		$a['timelvllo'] = 1;
		$a['timelvlhi'] = 3;
		$a['timetype'] = TIMETYPE_DOT;
		$a['timeprecision'] = -8000;
	}

	// permalink is a punctuation-stripped version of headline
	if (isset($a['headline'])) {
		$a['permalink'] = trim( strtolower( preg_replace('/[\ \~\!\@\#\$\%\^\&\*\(\)\{\}\[\]\,\.\/\<\>\?\;\:\'\"\\\|]+/', '-', $a['headline'])), '-');
	}

	// guid, a copy of permalink
	if (!isset($a['guid'])) {
		$a['guid'] = $a['permalink'];
	}
	
	// fulltext is concatenated string fields
	$m = '';
	if (isset($a['tags'])) {
		$m =  ' ' . str_replace(',',' ',$a['tags']);
	}
	if (isset($a['author'])) {
		$m .= ' ' . $a['author'];
	}
	if (isset($a['bibid'])) {
		$m .= ' ' . $a['bibid'];
	}
	if (isset($a['headline'])) {
		$m .= ' ' . $a['headline'];
	}
	if (isset($a['abstract'])) {
		$m .= ' ' . $a['abstract'];
	}
	$m .= ' ';
	$m = strtolower( $m);
	$a['fulltext'] = $m;

	// tsfulltext (ts = "text search") is composed with a php function
	$a['tsfulltext'] = "to_tsvector('".pg_escape_string($m)."')";

	return $a;
}
?>
