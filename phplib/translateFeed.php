<?php
// (c) Copyright 2010, 2014 Voyc.com

/**
 * This library file contains translateFeed() and related functions. 
**/

openjlog(basename(__FILE__));

function translateFeed( $item, $service) {

	$a = array();
	$a['editstatus'] = EDITSTATUS_RAW;

	$a['headline'] = '';
	$title = getXmlValue($item, 'title');
	if ($title) {
		$a['headline'] = $title;
	}

	$link = getXmlValue($item, 'link');
	if ($link) {
		$a['storyurl'] = $link;
	}

	$pubdate = getXmlValue($item, 'pubDate');
	if ($pubdate) {
		$a['timebegin'] = $pubdate;
	}

	$description = getXmlValue($item, 'description');
	if ($description) {
		$a['abstract'] = $description;
	}

	$guid = getXmlValue($item, 'guid');
	if ($guid) {
		$a['guid'] = $guid;
	}

	$author = getXmlValue($item, 'author');
	if ($author) {
		$a['author'] = $author;
	}
	else {
		$author = getXmlValue($item, 'creator');
		if ($author) {
			$a['author'] = $author;
		}
	}

	$category = "";
	$sub = $item->getElementsByTagName("category");
	foreach ($sub as $i => $value) {
		if ($i > 0) {
			$category .= ",";
		}
		$category .= $value->nodeValue;
	}
	if ($category) {
		$a['tags'] = $category;
	}
	
	// clean up the abstract
	$abstract = $a['abstract'];
	$abstract = str_replace("\n", '', $abstract);
	$abstract = strip_tags($abstract);
	$abstract = trim($abstract);
	$a['abstract'] = $abstract;

	switch (strtolower($service)) {
		case 'democracynow':
			$a = translateFeedDemocracyNow( $a, $item);
		break;
		case 'reuters':
			$a = translateFeedReuters( $a, $item);
		break;
		case 'globalvoices':
			$a = translateFeedGlobalVoices( $a, $item);
		break;
		case 'moblog':
			$a = translateFeedMoblog( $a, $item);
		break;
		case 'flickr':
			$a = translateFeedFlickr( $a, $item);
		break;
	}

	// truncate abstract
	$maxAbstractLen = 990;
	$ellipsis = '...';
	if (strlen($a['abstract']) > $maxAbstractLen) {
		$a['abstract'] = substr($a['abstract'],0,$maxAbstractLen).$ellipsis;
	}

	// truncate placename
	$maxPlacenameLen = 50;
	if (strlen($a['placename']) > $maxPlacenameLen) {
		$a['placename'] = substr($a['placename'],0,$maxPlacenameLen);
	}

	// truncate placename
	$maxTagsLen = 50;
	if (strlen($a['tags']) > $maxTagsLen) {
		$a['tags'] = substr($a['tags'],0,$maxTagsLen);
	}

	return $a;
}

/**
 * Get one value for one tag.
**/
function getXmlValue( $item, $tagname) {
	$sub = $item->getElementsByTagName($tagname);
	if ($sub->item(0)) {
		return $sub->item(0)->nodeValue;
	}
	return '';
}

/**
 * Special for DemocracyNow.
**/
function translateFeedDemocracyNow( $a, $item) {
	global $verbose;

	// skip headlines items
	if (strtolower(substr($a['headline'], 0, 9)) == 'headlines') {
		$a['editstatus'] = EDITSTATUS_SKIPPED;
		return $a;
	}

	// erase author
	$a['author'] = '';

	// clean up the abstract
	$a['abstract'] = str_replace('[includes rush transcript]', '', $a['abstract']);

	// pull the image out of the content
	$content = getXmlValue($item, 'encoded');
	if ($content) {
		$pattern = '/\<img.*?src\=\"(.*?)\"/';
		preg_match($pattern, $content, $matches);
		if (count($matches) > 0) {
			$a['imageurl'] = $matches[1];
		}
	}
	return $a;
}

/**
 * Special for Reuters.
**/
function translateFeedReuters( $a, $item) {
	// They prefix the description with the city and sometimes country.
	//    RECIFE, Brazil/PARIS (Reuters) - 
	//    BEIRUT (Reuters) - 
	//    ACAPULCO, Mexico (Reuters) - 
	$split = split(' \(Reuters\) \- ', $a['abstract']);
	if (count($a) >= 2) {
		$a['placename'] = $split[0]; 
		$a['abstract'] = $split[1];
	}

	// get the image from the story
	$s = @file_get_contents($a['storyurl']);
	if (!$s) {
		jlog(JLOG_DEBUG,'translateFeedReuters error opening URL: '.$a['storyurl']);
	}
	else {
		$pattern = '/relatedPhoto.*?src=\"(.*?)\"/s';
		preg_match( $pattern, $s, $matches);
	
		if (count($matches) < 2) {
			//jlog(JLOG_DEBUG,'translateFeedReuters no img tag found');
		}
		else {
				
			$img = $matches[1];
			//$img = "http://www.reuters.com" . stripslashes($img); // removed 10 Jul 2013 jh
			$a['imageurl'] = $img;
		}
	}
	return $a;
}

/**
 * Special for GlobalVoices.
**/
function translateFeedGlobalVoices( $a, $item) {
	// They prefix the headline with the country name.
	$split = split(': ', $a['headline']);
	if (count($split) < 2) {
		//jlog(JLOG_DEBUG,"GlobalVoices No placename: ".$a['headline']);
	}
	else {
		$a['placename'] = $split[0]; 
		$a['headline'] = $split[1];

		// there are sometimes multiple placenames separated by commas.  Take the first one.
		$split = split(", ", $a['placename']); 
		if (count($split) > 1) {
			$a['placename'] = $split[0];
		}
	}
	
	// get an image url if there is one in the content
	$content = getXmlValue($item, 'encoded');
	if ($content) {
		preg_match('/<img src=\"http:\/\/(.*?)\"/', $content, $matches);
		if (count($matches) > 0) {
			$a['imageurl'] = "http://" . $matches[1];
		}
	}
	return $a;
}

/**
 * Special for Moblog.
**/
function translateFeedMoblog( $a, $item) {
	// get image
	$enc = $item->getElementsByTagName('enclosure');
	$enc = $enc->item(0);
	if (!$enc) {
		jlog(JLOG_DEBUG,'translateFeedMoblog missing enclosure in item');
		return $a;
	}
	$url = $enc->getAttribute('url');
	$a['imageurl'] = $url;

	// pull author from image url
	$path_parts = pathinfo($url);
	$path = $path_parts['dirname'];
	$split = split("/", $path);
	$author = $split[count($split) - 1];
	$a['author'] = $author;

	// pull thumbnail from abstract
	$abstract = getXmlValue($item, 'description');
	if ($abstract) {
		$pattern = '/\<img src\=\"(.*?)\"/';
		preg_match($pattern, $abstract, $matches);
		if (count($matches) > 1) {
			$a['thumburl'] = $matches[1];
		}
	}
	return $a;
}

/**
 * Special for Flickr.
**/
function translateFeedFlickr( $a, $item) {
	// fix author
	$author = $a['author'];
	if (preg_match("/.*\((.*)\).*/", $author, $matches)) {
		if (count($matches) > 1) {
			$author = $matches[1];
		}
		$a['author'] = $author;
	}

	// fix abstract
	$abstract = $a['abstract'];
	$pattern = '/(.*?)posted a photo:(.*)/';
	if (preg_match($pattern, $abstract, $matches)) {
		if (count($matches) > 2) {
			$abstract = $matches[2];
			$a['abstract'] = $abstract;
		}
	}

	// get image
	$sub = $item->getElementsByTagNameNS('*', 'content');
	if ($sub->item(0)) {
		$url = $sub->item(0)->getAttribute("url");
		$a['imageurl'] = $url;
	}

	// get thumbnail
	$sub = $item->getElementsByTagNameNS('*', 'thumbnail');
	if ($sub->item(0)) {
		$thumb = $sub->item(0)->getAttribute("url");
		$a['thumburl'] = $thumb;
	}
	return $a;
}
?>
