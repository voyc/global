/**
 * TimeLevel
*/
voyc.TimeLevel = function(timeline) {
	this.timeline = timeline;  // creator timeline object

	// calculated by setLevel() or zoom()
	//this.timeline.years.perCM // the ultimate level indicator
	this.zoomDiscrete = 0;  // an integer from 1 to 1000
	this.level = 0; // index into table alevels
	
	// from alevels table row
	this.datalevel = 0;
	this.rulerPattern = '';
	this.lcdPattern = '';
	this.even = 0;
	this.unit = '';
	this.divisor = 0;
	this.p = 0;
	this.r = 0;

	// constants
	this.minLevel = -7;
	this.maxLevel = 14;
	this.zoomFactor = 0.10; //0.0203;
	this.alevels = this.createLevelsTable();
	this.maxZoomDiscrete = 1000;
	this.maxYPCM = 353.42;
	this.minYPCM = 0.000002420;
}

/**
 * Zoom the timeline in or out by the "zoom factor" a specified number of times.
 * @param direction {number} Valid values: -1=zoomin(level down) or +1=zoomout(level up);
 * @param repeat {integer} repeat Number of times to zoom. Defaults to one.
*/
voyc.TimeLevel.prototype.zoom = function(direction,repeat) {
	var repeat = repeat || 1; // repeat
	var zoomfactor = direction * this.zoomFactor;
	var ypcm = this.timeline.years.perCM;
	for (var i=0; i<repeat; i++) {
		var ypcm = ypcm + (this.timeline.years.perCM * zoomfactor);
	}	
	this.set(ypcm);
}

/**
 * Calculate and zoom level for a specified range of begin and end dates.
 * @param b float begin time
 * @param e float end time
*/
voyc.TimeLevel.prototype.calcLevel = function(b,e) {
	// choose the level with the closest years.perPeriod
	var ypcm = (e - b) / (this.timeline.pixels.width / this.timeline.pixels.perCM)
	var returnLevel = null;
	var x, diff, pxPerPeriod;
	var smallestDiff = this.timeline.pixels.width;
	for (var i=this.minLevel; i<=this.maxLevel; i++) {
		x = this.alevels[String(i)];
		pxPerPeriod = (x.jyear/ypcm)*this.timeline.pixels.perCM;
		diff = Math.abs(pxPerPeriod - this.timeline.optPixelsPerPeriod);
		if (diff < smallestDiff) {
			returnLevel = i;
			smallestDiff = diff;
		}
	}
	return returnLevel;
}

/**
 * Set the zoom level for a specified years-per-cm.
 * @param ypcm float Years per CM.
*/
voyc.TimeLevel.prototype.set = function(ypcm) {
	if (ypcm <= this.minYPCM || ypcm >= this.maxYPCM) {
		return;
	}
	
	// set the new years.PerCM
	this.timeline.years.perCM = ypcm;

	// calc discrete value
	this.zoomDiscrete = this.getDiscreteFromYPCM(ypcm);

	// convert to ms.perCM
	this.timeline.ms.perCM = this.timeline.msFromYears(this.timeline.years.perCM);

	// choose the level with the closest years.perPeriod
	var x, diff;
	var smallestDiff = this.timeline.pixels.width;
	for (var i=this.minLevel; i<=this.maxLevel; i++) {
		x = this.alevels[String(i)];
		var pxPerPeriod = this.timeline.pixelsFromMS(x.ms);
		var pxPerPeriod = this.timeline.pixelsFromYears(x.jyear,true);
		diff = Math.abs(pxPerPeriod - this.timeline.optPixelsPerPeriod);
		if (diff < smallestDiff) {
			this.level = i;
			smallestDiff = diff;
		}
	}

	// save all the values from the table for this level
	x = this.alevels[String(this.level)];
	this.datalevel = x.datalevel;
	this.rulerPattern = x.rpat;
	this.lcdPattern = x.lpat;
	this.even = x.even;
	this.unit = x.unit;
	this.divisor = x.divisor;
	this.p = x.p;
	this.r = x.r;
}

/**
 * Set the zoom level for a specified level number.
 * @param level integer Level number.
*/
voyc.TimeLevel.prototype.setLevel = function(level) {
	this.level = Math.max(this.minLevel, Math.min(level, this.maxLevel));
	var x = this.alevels[String(this.level)];

	this.datalevel = x.datalevel;
	this.rulerPattern = x.rpat;
	this.lcdPattern = x.lpat;
	this.even = x.even;
	this.unit = x.unit;
	this.divisor = x.divisor;
	this.p = x.p;
	this.r = x.r;
	
	this.timeline.years.perCM = x.jyear / this.timeline.optCMPerPeriod;
	this.timeline.ms.perCM = x.ms / this.timeline.optCMPerPeriod;

	this.zoomDiscrete = this.getDiscreteFromYPCM(this.timeline.years.perCM);
}

/**
 * Return the tick information for the specified number of pixels between period bars.
 * @param ppp integer Pixels per period.
**/
voyc.TimeLevel.prototype.calcTick = function(ppp) {
	var tick = {
		tick: 1,
		supertick:1,
		unit: ''
	}

	// start at the current level...
	var level = this.level;
	var x = this.alevels[String(level)];
	tick.unit = x.unit;
	tick.tick = x.divisor;
	tick.supertick = x.divisor;  // keep this

	// step down to the best level for tick marks
	var tp;
	while (level > this.minLevel) {
		level--;
		x = this.alevels[String(level)];
		tp = ppp / (tick.tick * x.divisor);
		if (tp >= this.timeline.minPixelsPerTick) {
			tick.unit = x.unit;
			tick.tick *= x.divisor;
		}
		else {
			break;
		}
	}	
	return tick;

	// start at the current level...
	var level = this.level;
	var x = this.alevels[String(level)];
	tick.unit = x.unit;
	tick.tick = x.tick;
	tick.supertick = x.supertick;  // keep this

	// step down to the best level for tick marks
	var tp;
	while (level > this.minLevel) {
		level--;
		x = this.alevels[String(level)];
		tp = ppp / (tick.tick * x.tick);
		if (tp >= this.timeline.minPixelsPerTick) {
			tick.unit = x.unit;
			tick.tick *= x.tick;
		}
		else {
			break;
		}
	}	
	return tick;
}

/**
 * Return the years-per-cm value for a specified discrete zoom value.
**/
voyc.TimeLevel.prototype.getYPCMFromDiscrete = function(discrete) {
	var minYPCM = 1/365.25/(24*60); // 1 minute
	var factor = 0.0203;
	var ypcm = minYPCM;
	for (var i=0; i<discrete; i++) {
		ypcm += ypcm * factor;
	}
	return ypcm;
}

/**
 * Return the discrete zoom value for a specified years-per-cm.
**/
voyc.TimeLevel.prototype.getDiscreteFromYPCM = function(ypcm) {
	var targetYPCM = ypcm;
	var discrete = 0;
	var minYPCM = 1/365.25/(24*60); // 1 minute
	var factor = 0.0203;
	var ypcm = minYPCM;
	while (ypcm < targetYPCM) {
		discrete++;
		ypcm += ypcm * factor;
	}
	return discrete;
}

/**
 * Return the next level when zooming.
 * @param direction {number} Valid values: -1=zoomin(level down) or +1=zoomout(level up);
 * @param coarse {boolean} If true, finer levels will be skipped.
**/
voyc.TimeLevel.prototype.nextLevel = function(direction, coarse) {
	var level = this.level;
	if ((direction>0 && level>=this.maxLevel) || (direction<0 && level<=this.minLevel)) {
		return false;
	}

	level += direction;
	if (coarse) {
		while (this.alevels[String(level)].r != 1) {
			if ((direction>0 && level>=this.maxLevel) || (direction<0 && level<=this.minLevel)) {
				break;
			}
			level += direction;
		}
	}
	return level;
}

/**
 * Create the levels table.
 * This table contains one row for each visually appealing level.
**/
voyc.TimeLevel.prototype.createLevelsTable = function() {
	var jday = 1/365.25; // julian year
	var jsec = jday/(24*60*60);
	var msday = 1000*60*60*24;
	var msyear = msday * 365.25;
	var alevels = {
		'30':  {datalevel:8 ,rpat:'ruler-year'  ,lpat:'lcd-year'  ,even:1 ,jyear:1E+019    ,ms:msyear*1E+19      ,p:1E+19,r:1 ,unit:'1.00E+019'       ,divisor:10,supertick:5,tick:10},
		'29':  {datalevel:8 ,rpat:'ruler-year'  ,lpat:'lcd-year'  ,even:1 ,jyear:1E+018    ,ms:msyear*1E+18      ,p:1E+18,r:1 ,unit:'1.00E+018'       ,divisor:10,supertick:5,tick:10},
		'28':  {datalevel:8 ,rpat:'ruler-year'  ,lpat:'lcd-year'  ,even:1 ,jyear:1E+017    ,ms:msyear*1E+17      ,p:1E+17,r:1 ,unit:'1.00E+017'       ,divisor:10,supertick:5,tick:10},
		'27':  {datalevel:8 ,rpat:'ruler-year'  ,lpat:'lcd-year'  ,even:1 ,jyear:1E+016    ,ms:msyear*1E+16      ,p:1E+16,r:1 ,unit:'1.00E+016'       ,divisor:10,supertick:5,tick:10},
		'26':  {datalevel:8 ,rpat:'ruler-year'  ,lpat:'lcd-year'  ,even:1 ,jyear:1E+015    ,ms:msyear*1E+15      ,p:1E+15,r:1 ,unit:'Quadrillion'     ,divisor:10,supertick:5,tick:10},
		'25':  {datalevel:8 ,rpat:'ruler-year'  ,lpat:'lcd-year'  ,even:0 ,jyear:1E+14     ,ms:msyear*1E+14      ,p:1E+14,r:1 ,unit:'Hundred-trillion',divisor:10,supertick:5,tick:10},
		'24':  {datalevel:8 ,rpat:'ruler-year'  ,lpat:'lcd-year'  ,even:0 ,jyear:1E+13     ,ms:msyear*1E+13      ,p:1E+13,r:1 ,unit:'Ten-trillion'    ,divisor:10,supertick:5,tick:10},
		'23':  {datalevel:8 ,rpat:'ruler-year'  ,lpat:'lcd-year'  ,even:1 ,jyear:1E+12     ,ms:msyear*1E+12      ,p:1E+12,r:1 ,unit:'Trillion'        ,divisor:10,supertick:5,tick:10},
		'22':  {datalevel:8 ,rpat:'ruler-year'  ,lpat:'lcd-year'  ,even:0 ,jyear:1E+11     ,ms:msyear*1E+11      ,p:1E+11,r:1 ,unit:'Hundred-billion' ,divisor:10,supertick:5,tick:10},
		'21':  {datalevel:8 ,rpat:'ruler-year'  ,lpat:'lcd-year'  ,even:0 ,jyear:1E+10     ,ms:msyear*1E+10      ,p:1E+10,r:1 ,unit:'Ten-billion'     ,divisor:10,supertick:5,tick:10},
		'20':  {datalevel:8 ,rpat:'ruler-year'  ,lpat:'lcd-year'  ,even:1 ,jyear:1E+9      ,ms:msyear*1E+9       ,p:1E+9 ,r:1 ,unit:'Billion'         ,divisor:10,supertick:5,tick:10},
		'19':  {datalevel:8 ,rpat:'ruler-year'  ,lpat:'lcd-year'  ,even:0 ,jyear:1E+8      ,ms:msyear*1E+8       ,p:1E+8 ,r:1 ,unit:'Hundred-million' ,divisor:10,supertick:5,tick:10},
		'18':  {datalevel:8 ,rpat:'ruler-year'  ,lpat:'lcd-year'  ,even:0 ,jyear:1E+7      ,ms:msyear*1E+7       ,p:1E+7 ,r:1 ,unit:'Ten-million'     ,divisor:10,supertick:5,tick:10},
		'17':  {datalevel:7 ,rpat:'ruler-year'  ,lpat:'lcd-year'  ,even:1 ,jyear:1E+6      ,ms:msyear*1E+6       ,p:1E+6 ,r:1 ,unit:'Million'         ,divisor:10,supertick:5,tick:10},
		'16':  {datalevel:7 ,rpat:'ruler-year'  ,lpat:'lcd-year'  ,even:0 ,jyear:1E+5      ,ms:msyear*1E+5       ,p:1E+5 ,r:1 ,unit:'Hundred-thousand',divisor:10,supertick:5,tick:10},
		'15':  {datalevel:7 ,rpat:'ruler-year'  ,lpat:'lcd-year'  ,even:0 ,jyear:1E+4      ,ms:msyear*1E+4       ,p:1E+4 ,r:1 ,unit:'Ten-thousand'    ,divisor:10,supertick:5,tick:10},
		'14':  {datalevel:7 ,rpat:'ruler-year'  ,lpat:'lcd-year'  ,even:1 ,jyear:1E+3      ,ms:msyear*1E+3       ,p:1E+3 ,r:1 ,unit:'Millenium'       ,divisor:2 ,supertick:2,tick:10},  // max 
		'13':  {datalevel:6 ,rpat:'ruler-year'  ,lpat:'lcd-year'  ,even:0 ,jyear:500       ,ms:msyear*500        ,p:100  ,r:5 ,unit:'Half-millenium'  ,divisor:5 ,supertick:5,tick:5},
		'12':  {datalevel:6 ,rpat:'ruler-year'  ,lpat:'lcd-year'  ,even:1 ,jyear:100       ,ms:msyear*100        ,p:100  ,r:1 ,unit:'Century'         ,divisor:2 ,supertick:5,tick:10},
		'11':  {datalevel:6 ,rpat:'ruler-year'  ,lpat:'lcd-year'  ,even:0 ,jyear:50        ,ms:msyear*50         ,p:10   ,r:5 ,unit:'Half-century'    ,divisor:5 ,supertick:5,tick:5},
		'10':  {datalevel:5 ,rpat:'ruler-year'  ,lpat:'lcd-year'  ,even:1 ,jyear:10        ,ms:msyear*10         ,p:10   ,r:1 ,unit:'Decade'          ,divisor:2 ,supertick:5,tick:10},
		'9':   {datalevel:5 ,rpat:'ruler-year'  ,lpat:'lcd-year'  ,even:0 ,jyear:5         ,ms:msyear*5          ,p:1    ,r:5 ,unit:'Half-decade'     ,divisor:5 ,supertick:5,tick:5},
		'8':   {datalevel:4 ,rpat:'ruler-year'  ,lpat:'lcd-day'   ,even:1 ,jyear:1         ,ms:msyear            ,p:1    ,r:1 ,unit:'Year'            ,divisor:2 ,supertick:6,tick:12},
		'7':   {datalevel:4 ,rpat:'ruler-month' ,lpat:'lcd-day'   ,even:0 ,jyear:0.5       ,ms:msyear/2          ,p:'m'  ,r:6 ,unit:'Half-year'       ,divisor:2 ,supertick:6,tick:6},
		'6':   {datalevel:3 ,rpat:'ruler-month' ,lpat:'lcd-day'   ,even:0 ,jyear:0.25      ,ms:msyear/4          ,p:'m'  ,r:3 ,unit:'Quarter-year'    ,divisor:3 ,supertick:5,tick:10},
		'5':   {datalevel:3 ,rpat:'ruler-month' ,lpat:'lcd-day'   ,even:1 ,jyear:1/12      ,ms:msday*30          ,p:'m'  ,r:1 ,unit:'Month'           ,divisor:2 ,supertick:5,tick:10},
		'4':   {datalevel:3 ,rpat:'ruler-day'   ,lpat:'lcd-day'   ,even:0 ,jyear:1/12/2    ,ms:msday*14          ,p:'d'  ,r:14,unit:'Half-month'      ,divisor:2 ,supertick:5,tick:10},
		'3':   {datalevel:3 ,rpat:'ruler-day'   ,lpat:'lcd-day'   ,even:0 ,jyear:1/12/4    ,ms:msday*7           ,p:'d'  ,r:7 ,unit:'Quarter-month'   ,divisor:2 ,supertick:5,tick:10},
		'2':   {datalevel:2 ,rpat:'ruler-day'   ,lpat:'lcd-day'   ,even:0 ,jyear:1/12/8    ,ms:msday*4           ,p:'d'  ,r:4 ,unit:'Eighth-month'    ,divisor:2 ,supertick:5,tick:10},
		'1':   {datalevel:2 ,rpat:'ruler-day'   ,lpat:'lcd-minute',even:0 ,jyear:1/12/16   ,ms:msday*2           ,p:'d'  ,r:2 ,unit:'Sixteenth-month' ,divisor:2 ,supertick:5,tick:10},
		'0':   {datalevel:2 ,rpat:'ruler-day'   ,lpat:'lcd-minute',even:1 ,jyear:jday      ,ms:msday             ,p:'d'  ,r:1 ,unit:'Day'             ,divisor:2 ,supertick:2,tick:4},
		'-1':  {datalevel:2 ,rpat:'ruler-hour'  ,lpat:'lcd-minute',even:0 ,jyear:jday/2    ,ms:1000*60*60*12     ,p:'H'  ,r:12,unit:'Half-day'        ,divisor:2 ,supertick:2,tick:4},
		'-2':  {datalevel:2 ,rpat:'ruler-hour'  ,lpat:'lcd-minute',even:0 ,jyear:jday/4    ,ms:1000*60*60*6      ,p:'H'  ,r:6 ,unit:'Quarter-day'     ,divisor:2 ,supertick:3,tick:6},
		'-3':  {datalevel:2 ,rpat:'ruler-hour'  ,lpat:'lcd-minute',even:0 ,jyear:jday/8    ,ms:1000*60*60*3      ,p:'H'  ,r:3 ,unit:'Eighth-day'      ,divisor:3 ,supertick:3,tick:3},
		'-4':  {datalevel:2 ,rpat:'ruler-hour'  ,lpat:'lcd-minute',even:1 ,jyear:jday/24   ,ms:1000*60*60        ,p:'H'  ,r:1 ,unit:'Hour'            ,divisor:2 ,supertick:2,tick: 4},  //
		'-5':  {datalevel:1 ,rpat:'ruler-hour'  ,lpat:'lcd-minute',even:0 ,jyear:jsec*60*30,ms:1000*60*30        ,p:'M'  ,r:30,unit:'Half-hour'       ,divisor:2 ,supertick:2,tick: 6},  //
		'-6':  {datalevel:1 ,rpat:'ruler-hour'  ,lpat:'lcd-minute',even:0 ,jyear:jsec*60*15,ms:1000*60*15        ,p:'M'  ,r:15,unit:'Quarter-hour'    ,divisor:3 ,supertick:3,tick:15},  //
		'-7':  {datalevel:1 ,rpat:'ruler-hour'  ,lpat:'lcd-second',even:0 ,jyear:jsec*60*5 ,ms:1000*60*5         ,p:'M'  ,r:5 ,unit:'Twelfth-hour'    ,divisor:5 ,supertick:5,tick: 5},  // currently lowest level enforced by zoombar
		'-8':  {datalevel:1 ,rpat:'ruler-hour'  ,lpat:'lcd-second',even:1 ,jyear:jsec*60   ,ms:1000*60           ,p:'M'  ,r:1 ,unit:'Minute'          ,divisor:2 ,supertick:2,tick:4},
		'-9':  {datalevel:1 ,rpat:'ruler-hms'   ,lpat:'lcd-second',even:0 ,jyear:jsec*30   ,ms:1000*30           ,p:'S'  ,r:30,unit:'Half-minute'     ,divisor:2 ,supertick:5,tick:10},
		'-10': {datalevel:1 ,rpat:'ruler-hms'   ,lpat:'lcd-second',even:0 ,jyear:jsec*15   ,ms:1000*15           ,p:'S'  ,r:15,unit:'Quarter-minute'  ,divisor:3 ,supertick:5,tick:10},
		'-11': {datalevel:1 ,rpat:'ruler-hms'   ,lpat:'lcd-second',even:0 ,jyear:jsec*5    ,ms:1000*5            ,p:'S'  ,r:5 ,unit:'Twelfth-minute'  ,divisor:5 ,supertick:5,tick:10},
		'-12': {datalevel:1 ,rpat:'ruler-hms'   ,lpat:'lcd-second',even:1 ,jyear:jsec      ,ms:1000              ,p:'S'  ,r:1 ,unit:'Second'          ,divisor:10,supertick:5,tick:10},
		'-13': {datalevel:1 ,rpat:'ruler-msec'  ,lpat:'lcd-second',even:1 ,jyear:jsec/10   ,ms:100               ,p:0.1  ,r:1 ,unit:'Decisecond'      ,divisor:10,supertick:5,tick:10},
		'-14': {datalevel:1 ,rpat:'ruler-msec'  ,lpat:'lcd-second',even:1 ,jyear:jsec/100  ,ms:10                ,p:0.01 ,r:1 ,unit:'Centisecond'     ,divisor:10,supertick:5,tick:10},
		'-15': {datalevel:1 ,rpat:'ruler-msec'  ,lpat:'lcd-second',even:1 ,jyear:jsec/1000 ,ms:1                 ,p:0.001,r:1 ,unit:'Millesecond'     ,divisor:10,supertick:5,tick:10},
		'-16': {datalevel:1 ,rpat:'ruler-msec'  ,lpat:'lcd-second',even:1 ,jyear:jsec/1E-4 ,ms:1/10              ,p:1E-4 ,r:1 ,unit:'Nanosecond'      ,divisor:10,supertick:5,tick:10},
		'-17': {datalevel:1 ,rpat:'ruler-msec'  ,lpat:'lcd-second',even:1 ,jyear:jsec/1E-5 ,ms:1/100             ,p:1E-5 ,r:1 ,unit:'1E-5 second'     ,divisor:10,supertick:5,tick:10},
		'-18': {datalevel:1 ,rpat:'ruler-msec'  ,lpat:'lcd-second',even:1 ,jyear:jsec/1E-6 ,ms:1/1000            ,p:1E-6 ,r:1 ,unit:'1E-6 second'     ,divisor:10,supertick:5,tick:10},
		'-19': {datalevel:1 ,rpat:'ruler-msec'  ,lpat:'lcd-second',even:1 ,jyear:jsec/1E-7 ,ms:1/10000           ,p:1E-7 ,r:1 ,unit:'1E-7 second'     ,divisor:10,supertick:5,tick:10},
		'-20': {datalevel:1 ,rpat:'ruler-msec'  ,lpat:'lcd-second',even:1 ,jyear:jsec/1E-8 ,ms:1/100000          ,p:1E-8 ,r:1 ,unit:'1E-8 second'     ,divisor:10,supertick:5,tick:10},
		'-21': {datalevel:1 ,rpat:'ruler-msec'  ,lpat:'lcd-second',even:1 ,jyear:jsec/1E-9 ,ms:1/1000000         ,p:1E-9 ,r:1 ,unit:'1E-9 second'     ,divisor:10,supertick:5,tick:10}
	}
	return alevels;
}
