// (c) Copyright 2005,2014 Voyc.com
/**
 * Create a When object.
 * @constructor
 * @param {double} decidate A decimal date UTC.
 * @param {double} precision Precision code.
 * @param {double} stdev Standard deviation.
 *
 * @class
 * Represents a decimal date in UTC. For example, 1983.5123529832
 * It is stored in the database as a double-precision floating point.
 * <pre>
 * Why we use a decimal date format:
 *   1. It has a constant scale for plotting points on a timeline.
 *   2. It can handle large numbers of years, so we can plot the big bang
 *      and the end of the universe.  (The javascript Date object only
 *      goes back to about 271,000 BC.  SQL and PHP dates have even 
 *      smaller range.)
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
 
/**
 * Constructor
 * @param decidate A decimal date value. Default to zero.
 * @param precision A precision value, a defined string constant. Default to 'none'.
 * @param stdev A standard deviation.  For future use.  Default to zero.
 *
 * Usage:
 *     To create a When object. 
 *         new When(1974.560248, voyc.When.DAY);
 *
 *     To create a copy of another When object w.
 *         new When(w.decidate, w.precision, w.stdev);
 *
 *     To create a When object from a Javascript Date object jsdate. 
 *         new When(voyc.When.fromJSDate(jsdate));
 *
 *     To create a When object for the current datetime.
 *         new When(voyc.When.fromJSDate(new Date()));
 */ 
voyc.When = function(decidate, precision, stdev) {
	this.decidate = decidate || 0;
	this.precision = precision || voyc.When.precision.NONE;
	this.stdev = stdev || 0;
}

voyc.When.prototype = {
	/**
	 * Set the decidate value.
	 */
	setDecidate : function(decidate) {
		this.decidate = decidate;
	},

	/**
	 * Get the decidate value.
	 */
	getDecidate : function() {
		return this.decidate;
	},
	/**
	 * Set the precision.
	 */
	setPrecision : function(precision) {
		this.precision = precision;
	},

	/**
	 * Get the precision.
	 */
	getPrecision : function() {
		return this.precision;
	},

	/**
	 * Return a string representation of the value.
	 */
	toString : function() {
		return String(this.serialize());
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
		this.decidate = parseFloat(a[0]);
		this.precision = (a.length > 0) ? a[1] : voyc.When.precision.YEAR;
		this.stdev = (a.length > 1) ? parseInt(a[2]) : 0;
	},

	/**
	 * Return a formatted string of the datetime value.
	 * @return Formatted string
	 */
	format: function(pattern, bPrecisionSensitive) {
		// calculate parts
		var part = {};
		var sign = this.decidate >= 0 ? +1 : -1;
		var yr = Math.floor(this.decidate);
		var yrabs = Math.abs(yr);
		if (yrabs < 1e+5) {
			// for small-scale numbers we use Javascript Date object
			var jsdt = voyc.When.toJSDate(this);

			// Javascript Date getters, all in Local Timezone.
			part = {
				dw: jsdt.getDay(),  // 0-6 unused
				dm: jsdt.getDate(),   // 1-31
				m: jsdt.getMonth(),  // 0-11
				y: jsdt.getFullYear(),  // -200000 to 200000
				H: jsdt.getHours(),   // 0-59
				M: jsdt.getMinutes(), // 0-59
				S: jsdt.getSeconds(), // 0-59
				N: jsdt.getMilliseconds(),  // 0-999
				o: jsdt.getTimezoneOffset()  // in seconds +330, -420, etc.
			}
		}
		else {
			// large-scale numbers are too big for Javascript Date object
			// and, the only useful part is the year
			part = {
				dw: 0,  // 0-6 unused
				dm: 0,  // 1-31
				m: 0,   // 0-11
				y: yr,  // floating-point
				H: 0,   // 0-59
				M: 0,   // 0-59
				S: 0,   // 0-59
				N: 0,   // 0-999
				o: 0    // timezone is irrelevant
			}
		}

		// choose unit for years
		var aunit = {
			0: {sunit:'',lunit:'', y:'asis'},
			10e+5: {sunit:'m',lunit:'Million', y:'unit'},
			10e+8: {sunit:'b',lunit:'Billion', y:'unit'},
			10e+11: {sunit:'t',lunit:'Trillion', y:'unit'},
			10e+14: {sunit:'q',lunit:'Quadrillion', y:'unit'},
			10e+17: {sunit:'',lunit:'', y:'exp'}
		}
		var fyear = '';
		for (var i in aunit) {
			if (yrabs >= i) {
				part.sunit = aunit[i].sunit;
				part.lunit = aunit[i].lunit;
				if (aunit[i].y == 'exp') {
					fyear = Number(yrabs).toExponential();
				}
				else if (aunit[i].y == 'unit') {
					fyear = yrabs / i;
				}
				else if (aunit[i].y == 'asis') {
					fyear = yrabs;
				}
			}
		}

		// choose sign for years
		var asign = {
			0: {minus:'BC',plus:''},
			10e+5: {minus:'Yrs Ago',plus:'Yrs From Now'},
		}
		for (var i in asign) {
			if (yrabs > i) {
				part.sign = sign < 0 ? asign[i].minus : asign[i].plus;
			}
			if (yrabs > i) {
				part.sign = (sign<0) ? asign[i].minus : asign[i].plus;
			}
		}

		// decimal seconds per precision
		var decsec = '';
		if (this.precision == .1) {
			decsec = voyc.pad(part.N > 9 ? Math.round(part.N / 100) : part.N,1);
		}
		else if (this.precision == .01) {
			decsec = voyc.pad(part.N > 99 ? Math.round(part.N / 10) : part.N,2);
		}
		else { //if (this.precision == .001) {
			decsec = voyc.pad(part.N,3);
		}
		
		// symbols
		var symbol = {
			dd:   voyc.pad(part.dm),
			mmm:  voyc.When.strings.i18n.monthNames[part.m],
			syyyy: yr,   // signed year, original value with sign
			yyyy: fyear, // unsigned, absolute value, rounded or formatted for printing
			sunit:part.sunit,
			lunit:part.lunit,
			sign: part.sign,
			HH:   voyc.pad(part.H),
			MM:   voyc.pad(part.M),
			SS:   voyc.pad(part.S),
			NN:   decsec,
			zo:   (part.o > 0 ? "-" : "+") + voyc.pad(Math.floor(Math.abs(part.o) / 60) * 100 + Math.abs(part.o) % 60, 4)
		};

		// named patterns, defined dynamically
		var apattern = {
			'default':      'syyyy mmm dd HH:MM:SS.NN zo',
			'lcd-second':   'yyyy sign mmm dd, HH:MM:SS',
			'lcd-minute':   'yyyy sign mmm dd, HH:MM',
			'lcd-day':      'yyyy sign mmm dd',
			'lcd-year':     'yyyy lunit sign',
			'ruler-year':   'yyyy sunit',
			'ruler-month':  (part.m==0 && part.dm==1) ? 'yyyy sign' : 'mmm',
			'ruler-day':    (part.m==0 && part.dm==1) ? 'yyyy sign' : 'mmm dd',
			'ruler-hour':   (part.H==0) ? 'mmm dd' : 'HH:MM',
			'ruler-minute': 'HH:MM',
			'ruler-hms':    'HH:MM:SS',
			'ruler-second': 'MM:SS',
			'ruler-msec':   'SS.NN',
            'none':         'syyyy mmm dd HH:MM:SS.NN zo',
			1000:           'yyyy sign',
			100:            'yyyy sign',
			10:             'yyyy sign',
			1:              'yyyy sign',
			'm':            'yyyy sign mmm',
			'd':            'yyyy sign mmm dd',
			'H':            'mmm dd HH:MM',
			'M':            'HH:MM',   
			'S':            'HH:MM:SS'
		}

		var pattern = apattern[pattern] || pattern || apattern[this.precision] || apattern['default'];

		// replace symbols in pattern
		var s = pattern;
		for (var i in symbol) {
			s = s.replace(i,symbol[i]);
		}
		return s;
	}
}

/** Internationalization strings */
voyc.When.strings = {
	"i18n" : { "monthNames": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] }
};

/**
 * Abstract methods.  Use without an instance.
 */

/**
 * Return a decimal date value equivalent to a specified Javascript Date object.
 * @param {Date} date A Javascript Date object.
 * @return Number A decimal date value.
 *
 * Usage:
 *     var decidate = voyc.When.fromJSDate(jsdateobject);
 */
voyc.When.fromJSDate = function(jsdate) {
	var msdt = jsdate.valueOf();      // ms UTC of input
	var yr = jsdate.getUTCFullYear();   // note: all values in this function are UTC
	var msyr = Date.UTC(yr,0,1);      // ms for the even year on Jan 1
	var msdays = msdt - msyr;           // ms for partial year (after Jan 1)
	var msperyear = voyc.When.getMSperYear(yr);
	var decidays = msdays/msperyear;
	var decidate = yr + decidays;   // even year + partial year
	return decidate;
}

/**
 * Create and return a new Javascript Date object with a value 
 * equivalent to a specified When object.
 * @return {Date} A new date object.
 *
 * Usage:
 *     var jsdateobject = voyc.When.toJSDate(whenobject);
 */
voyc.When.toJSDate = function(when) {
	var yr = Math.floor(when.decidate);   // split yr and decidays
	var decidays = when.decidate - yr;
	var msperyear = voyc.When.getMSperYear(yr);
	var msdays = Math.round(decidays*msperyear);  // do algebra
	var msyr	= Date.UTC(yr,0,1);  // combine years and days as ms

	// if two-digit year, Date helpfully adds 1900, so take it back out here
	if (yr >= 0 && yr < 100) {
		msyr -= Date.UTC(1898,0,1) - Date.UTC(-1,0,1);
	}
	
	var ms = msyr + msdays;
	var nd = new Date();
	nd.setTime(ms);
	return nd;
}

/**
 * Get a number representing the number of milliseconds in a specified year.
 * Private abstract method.
 * @param {Number} yr The year.
 */
voyc.When.getMSperYear = function(yr) {
	if (voyc.When.isLeapYear(yr)) // 2000, 2004, 2008 are leap years
		return 31622400000;
	else
		return 31536000000;
}

/**
 * Return true if the specified year is a leap year.
 * @param {Number} yr The year.
 * @return {Boolean} Return 1 if the year is a leap year; 0 if not.
 */
voyc.When.isLeapYear = function(yr) {
	yr = parseInt(yr);
	var leap = 1;
	var common = 0;
	if (yr%400 == 0) return leap;
	if (yr%100 == 0) return common;
	if (yr%4 == 0) return leap;
	return common;
}

voyc.When.dd = {
	0: {
		y: 1,
		d: 1/365,
		h: 1/365/24,
		m: 1/365/24/60,
		s: 1/365/24/60/60,
		n: 1/365/24/60/60/1000
	},
	1: {
		y: 1,
		d: 1/366,
		h: 1/366/24,
		m: 1/366/24/60,
		s: 1/366/24/60/60,
		n: 1/366/24/60/60/1000
	}
}
voyc.When.ms = {
	0: {
		y: 365*24*60*60*1000,
		d: 24*60*60*1000,
		h: 60*60*1000,
		m: 60*1000,
		s: 1000,
		n: 1
	},
	1: {
		y: 366*24*60*60*1000,
		d: 24*60*60*1000,
		h: 60*60*1000,
		m: 60*1000,
		s: 1000,
		n: 1
	}
}

/**
 * Return the decimal date value representing n units in the specified year.
 * @param {Number} n The count of units desired.
 * @param {String} unit One character: y,d,h,m,s,n.
 * @param {Number} yr The year.
 */
voyc.When.ddFromMS = function(n, unit, yr) {
	var leap = voyc.When.isLeapYear(yr) ? 1 : 0;
	var dd = voyc.When.dd[leap][unit] * n;
	return dd;
}
/**
 * Return the number of milliseconds in n units in the specified year.
 * @param {Number} n The count of units desired.
 * @param {String} unit One character: y,d,h,m,s,n.
 * @param {Number} yr The year.
 */
voyc.When.msFromDD = function(count, unit, yr) {
	var leap = voyc.When.isLeapYear(yr) ? 1 : 0;
	var ms = voyc.When.ms[leap][unit] * count;
	return ms;
}




/** precision codes
voyc.When.precision = {
	NONE        : 'none',
	MILLENIUM   : 'millenium',		
	CENTURY     : 'century',
	DECADE      : 'decade',
	YEAR        : 'year',
	MONTH       : 'month',
	DAY         : 'day',
	HOUR        : 'hour',
	MINUTE      : 'minute',
	SECOND      : 'second',
	MILLISECOND : 'millisecond'
}
 */ 

/** precision codes */ 
voyc.When.precision = {
	NONE        : 'none',
	MILLENIUM   : 1000,		
	CENTURY     : 100,
	DECADE      : 10,
	YEAR        : 1,
	MONTH       : 'm',
	DAY         : 'd',
	HOUR        : 'H',
	MINUTE      : 'M',
	SECOND      : 'S',
	DECISECOND  : 0.1,
	CENTISECOND : 0.01,
	MILLISECOND : 0.001,
	NANOSECOND  : 0.0001
}

voyc.When.months = {
	0: {name:'Jan',days:{0:31,1:31}},
	1: {name:'Feb',days:{0:28,1:29}},
	2: {name:'Mar',days:{0:31,1:31}},
	3: {name:'Apr',days:{0:30,1:30}},
	4: {name:'May',days:{0:31,1:31}},
	5: {name:'Jun',days:{0:30,1:30}},
	6: {name:'Jul',days:{0:31,1:31}},
	7: {name:'Aug',days:{0:31,1:31}},
	8: {name:'Sep',days:{0:30,1:30}},
	9: {name:'Oct',days:{0:31,1:31}},
	10:{name:'Nov',days:{0:30,1:30}},
	11:{name:'Dec',days:{0:31,1:31}}
}

voyc.When.getDaysInMonth = function(y,m) {
	return voyc.When.months[m].days[voyc.When.isLeapYear(y)];
}
	

/**
 * Use Date Parts to calculate next period and prev period at a specified precision. 
 */
voyc.When.prototype.initPart = function(back) {
	var jsdate = voyc.When.toJSDate(this);
	var y = jsdate.getFullYear();
	var m = jsdate.getMonth();
	if (back) {
		m = (m>0) ? m-1 : 11; 
	}
	this.prec = {
		1:   {h:10 ,l:'m' ,min:-300000,max:300000},
		m:   {h:1  ,l:'d' ,min:0,max:11},
		d:   {h:'m',l:'H' ,min:1,max:voyc.When.getDaysInMonth(y,m)},
		H:   {h:'d',l:'M' ,min:0,max:23},
		M:   {h:'H',l:'S' ,min:0,max:59},
		S:   {h:'M',l:0.1 ,min:0,max:59},
		0.1: {h:'S',l:0   ,min:0,max:9 }
	}
	
	this.part = {
		1: jsdate.getFullYear(),
		m: jsdate.getMonth(),
		d: jsdate.getDate(),
		H: jsdate.getHours(),
		M: jsdate.getMinutes(),
		S: jsdate.getSeconds(),
		N: jsdate.getMilliseconds()
	}
}

voyc.When.prototype.zeroPart = function() {
	// zero out parts below specified precision
	var p = this.precision;
	var x = this.prec[p];
	while (this.prec[x.l]) {
		p = x.l;
		x = this.prec[p];
		this.part[p] = x.min;
	}
}

voyc.When.prototype.nextPeriod = function(r) {
	var r = r || 1;
	var p = this.precision;

	// Three different algorithms depending on precision.
	// 1. precision > 1, scientific big numbers, decimal years
	if (voyc.When.isNumber(p) && p >= 1) {
		// round yr down to precision
		var yr = Math.floor(this.decidate);
		var rounder = (p * r);
		var yr = Math.floor(yr / rounder) * rounder;
		
		// add one period
		yr += (p * r);
		this.decidate = yr;
		return;
	}

	// 2. precision < 1, scientific small numbers, decimal seconds
	else if (voyc.When.isNumber(p) && p < 1) {
		this.initPart(false);
		// round N to precision
		if (p > .001) {
			var rounder = (p == .01) ? .1 : .01
			this.part.N = Math.floor(this.part.N * rounder) / rounder;
		}
		
		// add one unit
		var unit = p * 1000;
		this.part.N += unit;

		// adjust higher order units if necessary
		var q = 0.1;
		while (this.part[q] > this.prec[q].max) {
			this.part[q] = this.prec[q].min;
			p = this.prec[q].h;
			this.part[q]++;
		}
		this.decidate = voyc.When.fromJSDate( new Date(this.part[1],this.part.m,this.part.d,this.part.H,this.part.M,this.part.S,this.part.N));
		return;
	}

	// 3. precision between .1 and 1, human scale, y,m,d,H,M,S
	// increase to an even multiple r units
	else {
		this.initPart(false);
		this.part[p]++;
		if (r>1) {
			while ((((this.part[p]-this.prec[p].min) % r != 0) 
					|| ((this.part[p]-this.prec[p].min) > (this.prec[p].max-(r*.6)))) 
					&& (this.part[p] <= this.prec[p].max)) {
				this.part[p]++		
			}
		}
	
		// "carry the one",	up to all higher orders of magnitude as necessary
		while (this.part[p] > this.prec[p].max) {
			this.part[p] = this.prec[p].min;
			p = this.prec[p].h;
			this.part[p]++;
		}
		this.zeroPart();
		this.decidate = voyc.When.fromJSDate( new Date(this.part[1],this.part.m,this.part.d,this.part.H,this.part.M,this.part.S,this.part.N));
	}
}

voyc.When.isNumber = function(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

voyc.When.prototype.prevPeriod = function(r) {
	var r = r || 1;
	var p = this.precision;

	// Three different algorithms depending on precision.
	// 1. precision > 1, decimal years
	if (voyc.When.isNumber(p) && p >= 1) {
		// round yr down to precision
		var yr = Math.floor(this.decidate);
		var rounder = (p * r);
		var yr = Math.floor(yr / rounder) * rounder;
		
		// subtract one unit
		if (yr == this.decidate) {
			yr -= (p * r);
		}
		this.decidate = yr;
		return;
	}

	// 2. precision < .1, decimal seconds	
	if (voyc.When.isNumber(p) && p < 1) {
		// option 1. Use decidate.  
		// Split left and right sides.
		// Get leap or non-leap value for precision.
		// Subtract from right side.
		// Recombine right and left sides into decidate.

		// option 2. Use millesecond part from JS Date.
		// Accept the limitation that we can go no finer than milliseconds.
		// Is there a problem here if the jan 1 midnight date of a leap year is on screen?

		// round N to precision
		this.initPart(true);
		var pn = this.part.N;
		if (p > .001) {
			var rounder = (p == .01) ? .1 : .01
			this.part.N = Math.floor(this.part.N * rounder) / rounder;
		}
		
		// if already rounded, subtract one unit
		if (pn == this.part.N) {
			var unit = p * 1000;
			this.part.N -= unit;
		}

		// adjust higher order units if necessary
		var q = 0.1;
		while (this.part[q] < this.prec[q].min) {
			this.part[q] = this.prec[q].max;
			q = this.prec[q].h;
			this.part[q]--;
		}

		this.decidate = voyc.When.fromJSDate( new Date(this.part[1],this.part.m,this.part.d,this.part.H,this.part.M,this.part.S,this.part.N));
		return;
	}

	// 3. precision between .1 and 1, human scale, precision y,m,d,H,M,S
	else {
		this.initPart(true);
		var pp = this.prec[p].l;
		if (pp && this.part[pp] > this.prec[pp].min) {
			this.part[pp] = this.prec[pp].min;
		}
		else {
			this.part[p]--;
			// adjust higher order units if necessary
			var q = p;
			while (this.part[q] < this.prec[q].min) {
				this.part[q] = this.prec[q].max;
				q = this.prec[q].h;
				this.part[q]--;
			}
		}
	
		// decrease to an even multiple r units
		if (r>1) {
			while ((((this.part[p]-this.prec[p].min) % r != 0) 
					|| ((this.part[p]-this.prec[p].min) > (this.prec[p].max-(r*.6)))) 
					&& (this.part[p] >= this.prec[p].min)) {
				this.part[p]--;
			}
		}
	
		this.zeroPart();
		this.decidate = voyc.When.fromJSDate( new Date(this.part[1],this.part.m,this.part.d,this.part.H,this.part.M,this.part.S,this.part.N));
	}
}
