<?php
// (c) Copyright 2009 Voyc.com
//----------------------------------------------------------

/** 
 * This library file contains the parseQuery() function.
 */

/** 
 * Compose a where clause from a user's input search query.
 *
 * Rules:
 *		Multi-word phrases are enclosed in double-quotes
 *		A plus in front of a word or phrase means it should be included.
 *		A hypen in front of a word or phrase means it should be excluded.
 *		A plus is the default.
 *		Specific commands are preceded by a colon.
 *			Examples. 
 *				datatype:11.3 
 *				author:"John Hagstrand"
 *				src:"DemocracyNow"
 *
 * @param $q string plain text query string
 *
 */
function parseQuery ($q) {
	// validate input value of $col
	if ($col == "fulltext" || $col == "headline" || $col == "abstract" || $col == "author" || $col == "tags" || $col == "bibid" || $col == "service") {
		;
	}
	else {
		return "";
	}

	if ($col == "fulltext" && strlen($q) > 0) {
		return "tsfulltext @@ plainto_tsquery('$q')";
		//return "tsfulltext @@ to_tsquery('$q')";
	}



	// all comparisons are lowercase
	$qw = strtolower($q);

	// replace + with space
	$qw = str_replace('+', ' ', $qw);

	// replace spaces within quotes to tildes
	$qlen = strlen($qw);
	$enclosed = false;
	for ($i=0; $i<$qlen; $i++) {
		if ($qw[$i] == '"') {
			$enclosed = !$enclosed;
		}
		elseif ($qw[$i] == ' ') {
			if ($enclosed) {
				$qw[$i] = '~';
			}
		}
	}

	// remove quotes
	$qw = str_replace( '"', '', $qw);
	
	// split on space
	$aq = ($qw) ? split('[ \+\|]', $qw) : Array();
	
	// convert tilde back to space
	$aq2 = Array();
	foreach ($aq as $keyword) {
		$keyword = str_replace( '~', ' ', $keyword);
		$aq2[] = $keyword;
	}	

	// if first byte is -, move to separate array
	$aQuery = Array();
	$notQuery = Array();
	foreach ($aq2 as $keyword) {
		if (substr($keyword,0,1) == '-') {
			$notQuery[] = substr($keyword, 1);
		}
		else {
			$aQuery[] = $keyword;
		}
	}	

	if ($col != 'fulltext') {
		$col = "lower($col)";
	}

	$qClause = "";
	foreach ($aQuery as $keyword) {
		if ($qClause) {
			$qClause .= " and ";
		}
		$qClause .= "($col like '% $keyword %')";
	}
	foreach ($notQuery as $keyword) {
		if ($qClause) {
			$qClause .= " and ";
		}
		$qClause .= "($col not like '% $keyword %')";
	}

	return $qClause;	
}

//----------------------------------------------------------
// (c) Copyright 2009 Voyc.com
?>
