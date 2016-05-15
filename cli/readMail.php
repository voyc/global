<?php
// (c) Copyright 2010 Voyc.com
//----------------------------------------------------------

/**
 * Command-line service to create imap connection and call readMail repeatedly.
 * No parameters.
 */
/**
 *
 */

require_once(dirname(__FILE__).'/../../config.php');
require_once(dirname(__FILE__).'/../phplib/jlog.php');
require_once(dirname(__FILE__).'/../phplib/tagRecord.php');
require_once(dirname(__FILE__).'/../phplib/insertRecord.php');
require_once(dirname(__FILE__).'/../phplib/graphics.php');

openjlog( basename(__FILE__));

// global statics
$verbose = 1;
$deleteAfterPost = true;
$secondsToWait = 60;
$photofolder = '/home/jhagstrand/vhost-voyc/html/upload/photo/';
$thumbfolder = '/home/jhagstrand/vhost-voyc/html/upload/thumb/';
$photourl = 'http://www.voyc.com/upload/photo/';
$thumburl = 'http://www.voyc.com/upload/thumb/';
$homeurl = 'http://www.voyc.com/';

// gmail connection parameters
$hostname = '{imap.gmail.com:993/imap/ssl}INBOX';
$username = 'post@voyc.com';
$password = 'tpostman';

if ($verbose) echo "email reader starting\n";

// connect
$inbox = imap_open($hostname,$username,$password);
if (!$inbox) {
	jlog('imap open failed' . imap_last_error());
	return -1;
}
if ($verbose) echo "connected\n";

// main service loop
while (true) {

	$ping = imap_ping($inbox);
	if ($verbose) echo "ping " . (($ping) ? 'successful' : 'failed') . "\n";
	
	if (!$ping) {
	    // do some stuff to reconnect
		$inbox = imap_open($hostname,$username,$password);
		if (!$inbox) {
			jlog('imap open failed' . imap_last_error());
			return -1;
		}
		if ($verbose) echo "reopen " . (($inbox) ? 'successful' : 'failed') . "\n";
	}

	readMail();

	if ($verbose) echo "complete.  going to sleep\n";
	jlog('email reader going to sleep');

	sleep($secondsToWait);
}
 
function readMail() {
	global $photofolder, $thumbfolder, $photourl, $thumburl, $homeurl;
	global $verbose, $deleteAfterPost;
	global $inbox;
	
	// get array of email numbers
	$emails = imap_search($inbox,'ALL');
	if (!$emails) {
		if ($verbose) echo "count: 0 \n";
		return 0;
	}
	if ($verbose) echo "count: " . count($emails) . "\n";
	if (count($emails) <= 0){
		return 0;
	}

	// for every email...
	foreach($emails as $email_number) {
		
		$structure = imap_fetchstructure($inbox, $email_number);

		if ($verbose > 2) {
			echo "===  $email_number ==================================\n";
			print_r($structure);
		}
		else if ($verbose) {
			echo "email number $email_number \n";
		}
		
		// subject
		$subject = '';
		$overview = imap_fetch_overview($inbox,$email_number,0);
		if (isset($overview[0]->subject)) {
			$subject = $overview[0]->subject;
		}

		// from-email  John Hagstrand <jhagstrand@gmail.com>
		$from = $overview[0]->from;
		$pattern = '/.*?\<(.*?)\>/';
		preg_match( $pattern, $from, $matches);
		if (count($matches) > 1) {
			$from = $matches[1];
		}

		// plain text message
		//$message = imap_fetchbody($inbox,$email_number,1.1);
		$dataTxt = get_part($inbox,$email_number, "TEXT/PLAIN");
		$dataHtml = get_part($inbox,$email_number, "TEXT/HTML");
		if ($dataHtml != "") {
			$message = strip_tags($dataHtml);
		} else {
			$message = $dataTxt;
		}
		$message = trim($message);
		if ($verbose > 2) echo "$message\n";

		// image
		$filename = '';
		$att = getAttachments($inbox, $email_number, $structure);
		//if ($verbose > 2) print_r($att);
		foreach ($att as $at) {
			if ($at['is_attachment']) {
			
				// create a unique filename
				$filename = md5('boohoo'.mktime()) . '_' . str_replace(' ', '_', $at['filename']);

				// save the file			
				$localfile = fopen($photofolder.$filename,"w");
				fputs($localfile,$at['attachment']);
				fclose($localfile);
			
				// save the thumbnail
				makeThumbnail($photofolder.$filename, $thumbfolder.$filename, 150,0,6000);

				// take the first image, ignore the rest
				break;
			}
		}

		// this is what we got from the email
		$a = array();
		$a['service'] = 'email-upload';
		$a['email'] = $from;
		$a['headline'] = $subject;
		$a['abstract'] = $message;
		if ($filename) {
			$a['imageurl'] = $photourl . $filename;
			$a['thumburl'] = $thumburl . $filename;
		}
		if ($verbose > 1) print_r($a);

		// tag it
		$b = tagRecord($a);
		if ($verbose > 1) print_r($b);

		// insert it
		$c = insertRecord($b);
		if ($verbose) echo "insert/update " . (($c) ? 'successful' : 'failed') . "\n";

		if ($c && $deleteAfterPost) {
			imap_delete($inbox, $email_number);
		}

		// compose auto-reply email
		$reason = false;
		switch ($b['editstatus']) {
			case 10: $reason = 'no datetime'; break;
			case 11: $reason = 'no geolocation'; break;
			default: $reason = false; break;
		}

		$body = '';
		if ($b['newuser']) {
			$body .= "Welcome to voyc.\n\n";
			$body .= "We have created an account for you.\n";
			$body .= 'Your username is:' . $b['author'] . "\n";
			$body .= 'Your temporary password is: '. $b['password'] . "\n";
			$body .= "Please login and reset your password.\n\n";
		}
		else {
			$body .= "Thank you for posting your story on voyc.com.\n";
		}

		if ($reason) {
			$body .= "Your post failed.  Reason:$reason\n";
			$body .= "Please make sure your cellphone camera is set to include location in your photos.\n\n";
		}		
		else {
			$body .= "\n";
			$body .= "Your post was successful.\n";
			$body .= "\n";
		}
		$body .= "You posted:\n";
		$body .= "headline:  ".$b['headline']."\n";
		$body .= "story:     ".$b['abstract']."\n";
		//$body .= "imagefile: ".$filename."\n";
		//$body .= "latitude:  ".$b['the_geom']."\n";
		//$body .= "longitude: ".$b['the_geom']."\n";
		//$body .= "time:      ".$b['timebegin']."\n";
		$body .= "\n";
		$body .= "You can review your story here: \n";
		$body .= $homeurl."/?story=".$b['permalink']."\n";
		$body .= "\n";
		$body .= "You can review all of your stories here:\n";
		$body .= $homeurl."/?q=".$b['author']."\n";
		$body .= "\n";
		$body .= "Please contact us with questions and feedback.\n";

		// Additional headers
		$headers = "From: support@voyc.com";

		$bool = imap_mail( $a['email'], 'your post received', $body, $headers);
		if ($verbose) echo 'auto-reply ' . (($bool) ? 'successful' : 'failed') . "\n";
	}

	if ($deleteAfterPost) {
		imap_expunge($inbox);
	}
}

/**
 * http://www.electrictoolbox.com/extract-attachments-email-php-imap/
 */
function getAttachments($connection, $message_number, $structure) {
	$attachments = array();
	if(isset($structure->parts) && count($structure->parts)) {
	
		for($i = 0; $i < count($structure->parts); $i++) {
	
			$attachments[$i] = array(
				'is_attachment' => false,
				'filename' => '',
				'name' => '',
				'attachment' => ''
			);
			
			if($structure->parts[$i]->ifdparameters) {
				foreach($structure->parts[$i]->dparameters as $object) {
					if(strtolower($object->attribute) == 'filename') {
						$attachments[$i]['is_attachment'] = true;
						$attachments[$i]['filename'] = $object->value;
					}
				}
			}
			
			if($structure->parts[$i]->ifparameters) {
				foreach($structure->parts[$i]->parameters as $object) {
					if(strtolower($object->attribute) == 'name') {
						$attachments[$i]['is_attachment'] = true;
						$attachments[$i]['name'] = $object->value;
					}
				}
			}
			
			if($attachments[$i]['is_attachment']) {
				$attachments[$i]['attachment'] = imap_fetchbody($connection, $message_number, $i+1);
				if($structure->parts[$i]->encoding == 3) { // 3 = BASE64
					//$attachments[$i]['attachment'] = base64_decode($attachments[$i]['attachment']);
					$attachments[$i]['attachment'] = imap_base64($attachments[$i]['attachment']);
				}
				elseif($structure->parts[$i]->encoding == 4) { // 4 = QUOTED-PRINTABLE
					$attachments[$i]['attachment'] = quoted_printable_decode($attachments[$i]['attachment']);
				}
			}
		}
	}
	return $attachments;
}

/**
 * http://www.linuxscope.net/articles/mailAttachmentsPHP.html
 */
function get_mime_type(&$structure) {
	$primary_mime_type = array("TEXT", "MULTIPART","MESSAGE", "APPLICATION", "AUDIO","IMAGE", "VIDEO", "OTHER");
	if($structure->subtype) {
		return $primary_mime_type[(int) $structure->type] . '/' .$structure->subtype;
	}
	return "TEXT/PLAIN";
}

/**
 * http://www.linuxscope.net/articles/mailAttachmentsPHP.html
 */
function get_part($stream, $msg_number, $mime_type, $structure = false,$part_number    = false) {
	global $verbose;
	if(!$structure) {
		$structure = imap_fetchstructure($stream, $msg_number);
	}
	if($structure) {
		if($mime_type == get_mime_type($structure)) {
			if(!$part_number) {
				$part_number = "1";
			}
			$text = imap_fetchbody($stream, $msg_number, $part_number);
			if($structure->encoding == 3) {
				$text = imap_base64($text);
			}
			else if($structure->encoding == 4) {
				$text = imap_qprint($text);
			}

			if ($structure->parameters[0]->attribute == "CHARSET") {
				$charset = $structure->parameters[0]->value;
				if ($verbose) echo "charset: $charset \n";
				//if ($charset == "utf-8")
				//	$struct->body = utf8_decode($struct->body);
				//if ($charset == "utf-7")
				//	$struct->body = imap_utf7_decode($struct->body);
				if (strtolower($charset) != "utf-8")
					//$text = imap_utf8($text);  // did not work
					$text = mb_convert_encoding( $text, 'UTF-8', $charset);
			}
			return $text;


          // On fetch le body de la partie
           $struct->body = imap_fetchbody($mbox, $mnum, $part);
          
           // On le d?code
           if($struct->encoding == 3)
               $struct->body = imap_base64($struct->body);
           elseif($struct->encoding == 4)
               $struct->body = imap_qprint($struct->body);
          
           // On d?code les charset
           if ($struct->paraneters[0]->attribute == "CHARSET")
           {
               $charset = $struct->paraneters[0]->value;
               if ($charset == "utf-8")
                   $struct->body = utf8_decode($struct->body);
               if ($charset == "utf-7")
                   $struct->body = imap_utf7_decode($struct->body);
           }
		}
		if($structure->type == 1) /* multipart */ {
			while(list($index, $sub_structure) = each($structure->parts)) {
				$prefix = '';
				if($part_number) {
					$prefix = $part_number . '.';
				}
				$data = get_part($stream, $msg_number, $mime_type, $sub_structure,$prefix .    ($index + 1));
				if($data) {
					return $data;
				}
			}
		}
	}
	return false;
}

//----------------------------------------------------------
// (c) Copyright 2010 Voyc.com
?>
