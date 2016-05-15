// (c) Copyright 2005,2014 Voyc.com
/**
 * Create a When object.
 * @constructor
 * @param {double} decidate A decimal date.
 * @param {double} precision Precicion code.
 * @param {double} stdev Standard deviation.
 *
 * @class
 * Represents a decimal date. For example, 1983.5123529832
 * It is stored in the database as a double-precision floating point.
 * <pre>
 * Why we use a decimal date format:
 *   1. It has a constant scale for plotting points on a timeline.
 *   2. It can handle large numbers of years, so we can plot the big bang
 *      and the end of the universe.  (The javascript Date object only 
 *      goes back to about 271,000 BC.)
 *   3. It can handle a high degree of precision - deci-seconds -  
 *      for the years in our current timeframe.
 *
 * The precision property can be used during output formatting.
 * It indicates the degree of precision of the number, whether
 * down to the nearest minute, or only to the nearest century.
 *
 * The stdev lets the user indicate fuzziness of the measurement, 
 * by specifying a standard deviation.  Not Yet Implemented.
 *
 * Milliseconds in a:
 * 	second        1,000
 * 	minute       60,000 = 1000 * 60  
 * 	hour      3,600,000 = 1000 * 60 * 60
 * 	day      86,400,000 = 1000 * 60 * 60 * 24
 * 	year 31,536,000,000 = 1000 * 60 * 60 * 24 * 365
 * 	leap 31,622,400,000 = 1000 * 60 * 60 * 24 * 366
 * </pre>
 */
voyc.When = function(decidate, precision, stdev) {
	// The first parameter may be one of three types.
	// 1.  String
	if (typeof(decidate) == "string") {
		if (decidate.indexOf("BC") >= 0) {
			this.decidate = 0 - parseInt(decidate);
		}
		else {
			this.decidate = this.fromDate(new Date(decidate));
		}
	}
	// 2.  Javascript Date object. Warning: don't send a Number or any other object.
	else if (typeof(decidate) == "object") {  // input Date object
		this.decidate = this.fromDate(decidate);
	}
	// 3. A decimal date, that is, a floating-point number.
	else {
		this.decidate = (decidate) ? decidate : 0;
	}
	this.precision = precision ? precision : voyc.When.YEAR;
	this.stdev = stdev ? stdev : 0;
}

/** precision code */ voyc.When.UNDEFINED   =    0;
/** precision code */ voyc.When.MILLENIUM   = 1000;
/** precision code */ voyc.When.CENTURY     = 100;
/** precision code */ voyc.When.DECADE      = 10;
/** precision code */ voyc.When.YEAR        = 1;
/** precision code */ voyc.When.MONTH       = -4000;
/** precision code */ voyc.When.DAY         = -5000;
/** precision code */ voyc.When.HOUR        = -6000;
/** precision code */ voyc.When.MINUTE      = -7000;
/** precision code */ voyc.When.SECOND      = -8000;
/** precision code */ voyc.When.MILLISECOND = -9000;

voyc.When.prototype = {
	/**
	 * Set the date value.
	 */
	setValue : function(decidate) {
		this.decidate = decidate;
	},
	
	/**
	 * Set the date value.
	 */
	getValue : function() {
		return this.decidate;
	},
	/** 
	 * Set the precision.
	 */
	setPrecision : function(precision) {
		this.precision = precision;
	},

	/**
	 * Return a string representation of the value.
	 */
	toString : function() {
		return String(this.decidate);
	},

	/**
	 * Return a serialized string representation of the object with underscore-separated value, precision and standard deviation.
	 */
	serialize: function() {
		return String(this.decidate) + "_" + this.precision + "_" + this.stdev;
	},

	/**
	 * Reconstruct the object from a serialized string.
	 */
	deserialize: function(s) {
		var a = s.split("_");
		this.decidate = a[0];
		this.precision = (a.length > 0) ? a[1] : voyc.When.YEAR;
		this.stdev = (a.length > 1) ? a[2] : 0;
	},

	/**
	 * Return a formatted string of the datetime value.
	 */
	format : function(pattern) {

		pad = function (value, length) {
			value = String(value);
			length = parseInt(length) || 2;
			while (value.length < length)
				value = "0" + value;
			return value;
		}

		// Below are two complete separate formatting systems.

		// 1. In this system, the user has specified a pattern.
		var s = "";
		if (pattern && pattern != "detail") {
			var d = this.toDate();
			var D = d.getDate();
			var m = voyc.When.strings.i18n.monthNames[d.getMonth()];
			var y = d.getFullYear();
			var H = d.getHours();
			var M = d.getMinutes();
			var S = d.getSeconds();
			var L = d.getMilliseconds();
			var o = d.getTimezoneOffset();
			var h = H % 12 || 12;
			var hh = pad(H % 12 || 12);
			var TT = H < 12 ? "AM" : "PM";
	
			var tz = (o > 0) ? '-' : '+';
			tz += pad(o/60, 2);
			tz += pad(o%60, 2);

			if (pattern == "long") {
				s = y + " " + m + " " + pad(D,2) + " " + pad(H,2) + ":" + pad(M,2) + ":" + pad(S,2) + "." + L + " " + " " + tz;
			}
			else if (pattern == "lcd-minute") {
				s = m + " " + D + ", " + y + ", " + h + ":" + pad(M,2) + " " + TT;
			}
			else if (pattern == "lcd-day") {
				s = m + " " + D + ", " + y;
			}
			else if (pattern == "lcd-year") {
				var n = Math.abs(Math.floor(this.decidate));
				if (this.decidate < 0) {
					s = n + " BC";
				}
				else {
					s = "AD " + n;
				}
			}
			else if (pattern == "ruler-year") {
				// show BC but not AD
				var n = Math.abs(Math.floor(this.decidate));
				if (this.decidate < 0) {
					s = n + " BC";
				}
				else {
					s = n;
				}
			}
			else if (pattern == "ruler-day") {
				// Feb 19
				s = m + " " + D;
			}
			else if (pattern == "ruler-month") {
				// If Jan show year, else show Mon
				if (m == 'Jan') {
					s = y;
				}
				else {
					s = m;
				}
			}
			else if (pattern == "ruler-minute") {
				// If 24:00 show day, else show 15:23
				s = H + ":" + pad(M,2);
				if (s == '0:00') {
					s = m + " " + D;
				}
			}
			else if (pattern == "ruler-hour") {
				// If 24:00 show day, else show 15:00
				s = H + ":00";
				if (s == '0:00') {
					s = m + " " + D;
				}
			}
			return s;
		}

		// 2.  In this system, the user has not specified a pattern, 
		// so a pattern is chosen based on the precision value of the When object.
		// There is also a special case, where the precision value is SECOND, but the user has specified 'detail'.
		if (this.precision > 0) {
			switch (this.precision) {
				case voyc.When.MILLENIUM:
				case voyc.When.CENTURY:
				case voyc.When.DECADE:
				case voyc.When.YEAR:
					var n = Math.round(Math.abs(this.decidate) / this.precision) * this.precision;
					if (this.decidate < 0) {
						s = n + " BC";
					}
					else {
						s = "AD " + n;
					}
					break;
			}
		}
		
		else {
			var d = this.toDate();
			var D = d.getDate();
			var m = voyc.When.strings.i18n.monthNames[d.getMonth()];
			var y = d.getFullYear();
			var H = d.getHours();
			var M = d.getMinutes();
			var S = d.getSeconds();
			var L = d.getMilliseconds();
			var o = d.getTimezoneOffset();
			var h = H % 12 || 12;
			var hh = pad(H % 12 || 12);
			var TT = H < 12 ? "AM" : "PM";

			var gmtHours = d.getTimezoneOffset()/60;
			var sign = (gmtHours > 0) ? '-' : '+';
			var tz = 'GMT ' + sign + pad(gmtHours,2) + '00';
	
			switch (this.precision) {
				case voyc.When.MONTH:
					s = m + " " + y;
					break;
				case voyc.When.DAY:
					s = D + " " + m + " " + y;
					break;
				case voyc.When.HOUR:
					s = h + ":00" + " " + TT;
					break;
				case voyc.When.MINUTE:
					s = h + ":" + M + " " + TT;
					break;
				case voyc.When.SECOND:
					s = "";
					if (pattern == "detail") {
						s = D + " " + m + " " + y + ", ";
					}
					s += hh + ":" + pad(M,2) + ":" + pad(S,2) + " " + TT; // + " " + tz;
					break;
				case voyc.When.MILLISECOND:
					s = hh + ":" + pad(M,2) + ":" + pad(S,2) + "." + L + " " + TT;
					s.toString();
					break;
			}
		}
		return s;
	
	},
	
	/**
	 * Return a decidate value from a Javascript Date object.
	 * @param {Date} date A date object to use as the datetime value.
	 */
	fromDate : function(date) {
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
	
	/**
	 * Return a Javascript Date object with the datetime value.
	 * @return {Date} A date object to use as the datetime value.
	 */
	toDate : function() {
		var yr = Math.floor(this.decidate);   // split yr and decidays
		var decidays = this.decidate - yr;
		var msperyear = this.getMSperYear(yr);
		var msdays = Math.round(decidays*msperyear);  // do algebra
		var msyr	= Date.UTC(yr,0,1);  // combine years and days as ms

		// if two-digit year, Date helpfully adds 1900, so take it back out here
		if (yr >= 0 && yr < 100) {
			msyr -= Date.UTC(1898,0,1) - Date.UTC(-1,0,1);
		}

		return new Date(msyr+msdays)
	},
	
	/**
	 * Get a number representing the number of milliseconds in a specified year.
	 * @param {Number} yr The year.
	 */
	getMSperYear : function(yr) {
		if (this.isLeapYear(yr)) // 2000, 2004, 2008 are leap years
			return 31622400000;
		else
			return 31536000000;
	},
	
	/**
	 * Return true if the year is a leap year/
	 * @param {Number} yr The year.
	 * @return {Boolean} Return true if the year is a leap year; false if not.
	 */
	isLeapYear : function(yr) {
		yr = parseInt(yr);
	
		if(yr%4 == 0) 	{
			if(yr%100 != 0) {
				return true;
			}
			else {
				if(yr%400 == 0)
					return true;
				else
					return false;
			}
		}
		return false;
	}
}

// Internationalization strings
voyc.When.strings = {
	"i18n" : { "monthNames": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] }
};

/**


On the timeline display.
	A drop-down allowing the user to enter a timezone.
	By default, the display of the timeline is shown in the user's local time.

Each story	
	Displays the time in the user's local time.
	In addition, the time is also shown in the local time of the story.


Meeting in Zurich
2:00 AM (4:00 PM local)





Current local time in Paris, France
Friday, 29 May 2009 11:29 AM
Standard Time Zone: GMT/UTC + 01:00 hour
Daylight Saving Time: DST in use +1 hour
Current Time Zone offset: GMT/UTC + 2:00

DST  - Daylight Saving Time (Summer Time)
GMT - Greenwich Mean Time
UTC - Coordinated Universal Time 
from http://www.worldtimezone.com/time/wtzresult.php?CiID=6409&forma=Find%20Time
*/

// function to calculate local time
// in a different city
// given the city's UTC offset
// from http://articles.techrepublic.com.com/5100-10878_11-6016329.html
voyc.calcTime = function(city, offset) {

    // create Date object for current location
    d = new Date();
   
    // convert to msec
    // add local time zone offset
    // get UTC time in msec
    utc = d.getTime() + (d.getTimezoneOffset() * 60000);
   
    // create new Date object for different city
    // using supplied offset
    nd = new Date(utc + (3600000*offset));
   
    // return time as a string
    return "The local time in " + city + " is " + nd.toLocaleString();

}

// get Bombay time
//alert(calcTime('Bombay', '+5.5'));

// get Singapore time
//alert(calcTime('Singapore', '+8'));

// get London time
//alert(calcTime('London', '+1'));


// (c) Copyright 2005,2006,2008,2009 MapTeam, Inc.


/*
	http://blog.stevenlevithan.com/archives/date-time-format
	Date Format 1.1
	(c) 2007 Steven Levithan <stevenlevithan.com>
	MIT license
	With code by Scott Trenda (Z and o flags, and enhanced brevity)
*/

/*** dateFormat
	Accepts a date, a mask, or a date and a mask.
	Returns a formatted version of the given date.
	The date defaults to the current date/time.
	The mask defaults ``"ddd mmm d yyyy HH:MM:ss"``.
*/
/*
var dateFormat = function () {
	var	token        = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloZ]|"[^"]*"|'[^']*'/g,
		timezone     = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
		timezoneClip = /[^-+\dA-Z]/g,
		pad = function (value, length) {
			value = String(value);
			length = parseInt(length) || 2;
			while (value.length < length)
				value = "0" + value;
			return value;
		};

	// Regexes and supporting functions are cached through closure
	return function (date, mask) {
		// Treat the first argument as a mask if it doesn't contain any numbers
		if (
			arguments.length == 1 &&
			(typeof date == "string" || date instanceof String) &&
			!/\d/.test(date)
		) {
			mask = date;
			date = undefined;
		}

		date = date ? new Date(date) : new Date();
		if (isNaN(date))
			throw "invalid date";

		var dF = dateFormat;
		mask   = String(dF.masks[mask] || mask || dF.masks["default"]);

		var	d = date.getDate(),
			D = date.getDay(),
			m = date.getMonth(),
			y = date.getFullYear(),
			H = date.getHours(),
			M = date.getMinutes(),
			s = date.getSeconds(),
			L = date.getMilliseconds(),
			o = date.getTimezoneOffset(),
			flags = {
				d:    d,
				dd:   pad(d),
				ddd:  dF.i18n.dayNames[D],
				dddd: dF.i18n.dayNames[D + 7],
				m:    m + 1,
				mm:   pad(m + 1),
				mmm:  dF.i18n.monthNames[m],
				mmmm: dF.i18n.monthNames[m + 12],
				yy:   String(y).slice(2),
				yyyy: y,
				h:    H % 12 || 12,
				hh:   pad(H % 12 || 12),
				H:    H,
				HH:   pad(H),
				M:    M,
				MM:   pad(M),
				s:    s,
				ss:   pad(s),
				l:    pad(L, 3),
				L:    pad(L > 99 ? Math.round(L / 10) : L),
				t:    H < 12 ? "a"  : "p",
				tt:   H < 12 ? "am" : "pm",
				T:    H < 12 ? "A"  : "P",
				TT:   H < 12 ? "AM" : "PM",
				Z:    (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
				o:    (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4)
			};

		return mask.replace(token, function ($0) {
			return ($0 in flags) ? flags[$0] : $0.slice(1, $0.length - 1);
		});
	};
}();

// Some common format strings
dateFormat.masks = {
	"default":       "ddd mmm d yyyy HH:MM:ss",
	shortDate:       "m/d/yy",
	mediumDate:      "mmm d, yyyy",
	longDate:        "mmmm d, yyyy",
	fullDate:        "dddd, mmmm d, yyyy",
	shortTime:       "h:MM TT",
	mediumTime:      "h:MM:ss TT",
	longTime:        "h:MM:ss TT Z",
	isoDate:         "yyyy-mm-dd",
	isoTime:         "HH:MM:ss",
	isoDateTime:     "yyyy-mm-dd'T'HH:MM:ss",
	isoFullDateTime: "yyyy-mm-dd'T'HH:MM:ss.lo"
};

// Internationalization strings
dateFormat.i18n = {
	monthNames: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
	}
};

// For convenience...
Date.prototype.format = function (mask) {
	return dateFormat(this, mask);
}
*/