<?php
/**
 * A library of functions for handling decimal dates.
 */

/**
 * Convert a string to a decimal date.
 * @param string $s The date string to be converted.
 * @return double $d The decimal date.
 */
function convertStringToDecimalDate( $s) {
	// do calculations in GMT
	date_default_timezone_set("UTC");

	// take out the GMT.  change GMT-0700 to -0700
	$str = str_replace("GMT", "", $s);

	// PHP converts any english string to a unix timestamp.
	// Number of seconds since 1970 Jan 1.
	// Correctly returns negative seconds back to 1903.
	// For dates before 1903 it returns -1.
	$d = strtotime($str);
	//echo $d . "<br/>";

	if ($d == -1) {
		return convertAncientStringToDecimalDate($s);
	}
	else {
		return convertUnixTimestampToDecimalDate($d);
	}
}

function convertAncientStringToDecimalDate($s) {
	// find year portion of the string
	// replace the year with a current year
	// run convertStringToDecimalDate to get the number of ms in the stated year
	// add original year plus the ms

	// lets support this format: 4 jul 1776
	$se = explode(' ', $s);
	$d = $se[0];
	$m = $se[1];
	$y = $se[2];
}

function convertUnixTimestampToDecimalDate($d) {
	// PHP converts unix timestamp into an array of parts
	// Array
	//  (
	//	    [year]    => 2003
	//	    [mon]     => 6
	//	    [mday]    => 17
	//	    [hours]   => 21
	//	    [minutes] => 58
	//	    [seconds] => 40
	//	    [yday]    => 167
	//	    [wday]    => 2
	//	    [weekday] => Tuesday
	//	    [month]   => June
	//	    [0]       => 1055901520
	//	)

	/** precision code */ $UNDEFINED   =    0;
	/** precision code */ $MILLENIUM   = 1000;
	/** precision code */ $CENTURY     = 100;
	/** precision code */ $DECADE      = 10;
	/** precision code */ $YEAR        = 1;
	/** precision code */ $MONTH       = -4000;
	/** precision code */ $DAY         = -5000;
	/** precision code */ $HOUR        = -6000;
	/** precision code */ $MINUTE      = -7000;
	/** precision code */ $SECOND      = -8000;
	/** precision code */ $MILLISECOND = -9000;

	if ($d === false) {
		//echo "strtotime failed<br/>";
		$decidate = 0;
		$precision = $UNDEFINED;
	}
	else {
		$a = getdate($d);
		//print_r($a);
		//echo "<br/>";
		//echo date("Y M d H:i:s T e I", $d); 
		//echo "<br/>";
	
		// find number of seconds at the beginning of the year
		$sy = mktime(0,0,0,1,1,$a['year']);
		//echo "number of seconds at jan 1 of this year: $sy <br/>";		
	
		// subtract to find the number of seconds so far this year
		$ssf = $d - $sy;
		//echo "number of seconds so far this year: $ssf <br/>";
	
		// get number of seconds total in this year
		$siy = getSecondsperYear($a['year']);
	
		// divide to get the decimal percentage into this year
		$decidate = $a['year'] + ($ssf / $siy);
	
		$precision = $SECOND;
	}
	
	return array('decidate' => $decidate, 'precision' => $precision);
}

/**
 * Get a number representing the number of seconds in a specified year.
 * @param {Number} The year.
 * @return {Number}
 */
function getSecondsperYear($year) {
	if (isLeapYear($year)) // 2000, 2004, 2008 are leap years
		return 31622400;  // 60 * 60 * 24 * 366
	else
		return 31536000;  // 60 * 60 * 24 * 365
}

/**
 * Return true if the year is a leap year
 *
 * In the Gregorian calendar there is a leap year every year divisible by four
 * except for years which are both divisible by 100 and not divisible by 400.
 * @param {Number} The year.
 * @return {Boolean} Return true if the year is a leap year; false if not.
 */
function isLeapYear($year) {
    if ($year % 4 != 0) {
        return false;
    }
    else {
        if ($year % 100 != 0) {
            return true;
        }
        else {
            if ($year % 400 != 0) {
                return false;
            }
            else {
                return true;
            }
        }
    }
}

/*
function fromDate(date) {
	var msdt = date.valueOf();        // ms of target date       
	var yr = date.getFullYear();
	var msyr = Date.UTC(yr,0,1);

	// if two-digit year, Date helpfully adds 1900, so take it back out here
	if (yr >= 0 && yr < 100) {
		msyr -= Date.UTC(1899,0,1) - Date.UTC(-1,0,1);
	}
	
	var msdays = msdt - msyr;           // ms in this year to target date
	var msperyear = this.getMSperYear(yr);
	var decidays = msdays/msperyear; //*DECIBASIS;
	return yr + decidays;
},
*/

function convertStringToDec( $s) {
	$a = split(' ', $s);
	$count = count($a);
	if ($count == 1) {
		$decidate = $a[0];
		$precision = 1; // YEAR
	}
	else {
		$decidate = convertPartsToDec($a[0], $a[1], $a[2]);
		$precision = 2; // DAY
	}

	return array('decidate' => $decidate, 'precision' => $precision);
}


function convertPartsToDec( $y, $m, $d) {
  // this technique only works back to 1970
  $x = mktime(12, 1, 1, $m, $d, $y);
  $aDate = getDate( $x);
  $jday = $aDate['yday'] + 1;
  return $y + $jday/365;
}

function convertDecToParts( $dec) {
  $y = floor( $dec);
  $jday = round(( $dec - floor($dec)) * 1000);

  $jdc = gregoriantojd ( 1, 1, $y);
  $jdc += $jday - 1;

  $x = jdtogregorian ( $jdc);

  $m = strtok( $x, '/');
  $d = strtok('/');
  $y = strtok('/');

  return array("m" => $m, "d" => $d, "y" => $y);
}

function displayDecDate( $dec) {
  $monthNames = array("", "January", "February", "March", "April", "May", "June",
                            "July", "August", "September", "October", "November", "December");
  $a = convertDecToParts( $dec);
  $d = $a['d'];
  $m = $a['m'];
  $y = $a['y'];
  $s = "$monthNames[$m] $d, $y";
  return $s;
}

/* functions DateAdd and DateDiff
written by Allen Kent
http://www.phpbuilder.net/columns/akent20000610.php3?page=6
*/
function DateAdd ($interval,  $number, $date) {

    $date_time_array  = getdate($date);
    
    $hours =  $date_time_array["hours"];
    $minutes =  $date_time_array["minutes"];
    $seconds =  $date_time_array["seconds"];
    $month =  $date_time_array["mon"];
    $day =  $date_time_array["mday"];
    $year =  $date_time_array["year"];

    switch ($interval) {
    
        case "yyyy":
            $year +=$number;
            break;        
        case "q":
            $year +=($number*3);
            break;        
        case "m":
            $month +=$number;
            break;        
        case "y":
        case "d":
        case "w":
             $day+=$number;
            break;        
        case "ww":
             $day+=($number*7);
            break;        
        case "h":
             $hours+=$number;
            break;        
        case "n":
             $minutes+=$number;
            break;        
        case "s":
             $seconds+=$number;
            break;        

    }    
    $timestamp =  mktime($hours ,$minutes, $seconds,$month ,$day, $year);
    return $timestamp;
}

Function DateDiff ($interval, $date1,$date2) {

    // get the number of seconds between the two dates
    $timedifference =  $date2 - $date1;
    
    switch ($interval) {
        case "w":
            $retval  = bcdiv($timedifference ,604800);
            break;
        case "d":
            $retval  = bcdiv( $timedifference,86400);
            break;
        case "h":
             $retval = bcdiv ($timedifference,3600);
            break;        
        case "n":
            $retval  = bcdiv( $timedifference,60);
            break;        
        case "s":
            $retval  = $timedifference;
            break;        

    }    
    return $retval;
    
}
?>