// (c) Copyright 2009,2014 voyc.com
/**
 * Create a new Bounds object.
 * @class Represents the boundaries of a position in time and space.
 */
voyc.Bounds = function(bounds) {
	/**
	 * The time centerpoint.
	 * @type When
	 */
	this.timecenter = 0.0;

	/**
	 * The beginning time of the range.
	 * @type When
	 */
	this.begin = 0.0;

	/**
	 * The ending time of a range.
	 * @type When
	 */
	this.end = 0.0;

	/**
	 * Time zoom level.
	 * @type Number
	 */
	this.timelevel = 0;

	/**
	 * Time data level. An integer 1 thru 8.
	 * @type Number
	 */
	this.timedatalevel = 0;

	/**
	 * Time max dots.  An integer. Depends on size of timeline.  
	 * The number of dots it can hold comfortably.
	 * @type Number
	 */
	this.timemaxdots = 0;

	/**
	 * The centerpoint on the map.
	 * @type When
	 */
	this.mapcenter = {
		lat:0.0,
		lng:0.0
	};

	/**
	 * The north latitude boundary.
	 * @type double
	 * @private
	 */
	this.n = 0.0;

	/**
	 * The south latitude boundary.
	 * @type double
	 * @private
	 */
	this.s = 0.0;

	/**
	 * The east latitude boundary.
	 * @type double
	 * @private
	 */
	this.e = 0.0;

	/**
	 * The west latitude boundary.
	 * @type double
	 * @private
	 */
	this.w = 0.0;

	/**
	 * Map zoom level.
	 * @type integer
	 */
	this.maplevel = 0;

	/**
	 * Map type.
	 * @type string
	 */
	this.maptype = '';

	/**
	 * Search text
	 * @type string
	 * @private
	 */
	this.q = '';

	/**
	 * Query method.  'f' or 's'
	 * @type string
	 * @private
	 */
	this.qm = '';

	/**
	 * Center ID.  The ID of the record nearest the timecenter.
	 * @type string
	 * @private
	 */
	this.cid = '';

	if (bounds) {
		this.copy(bounds);
	}
}

voyc.Bounds.prototype = {
	copy: function(bounds) {
		this.timecenter = bounds.timecenter;
		this.begin = bounds.begin;
		this.end = bounds.end;
		this.timelevel = bounds.timelevel;
		this.timedatalevel = bounds.timedatalevel;
		this.timemaxdots = bounds.timemaxdots;
		this.mapcenter.lat = bounds.mapcenter.lat;
		this.mapcenter.lng = bounds.mapcenter.lng;
		this.n = bounds.n;
		this.s = bounds.s;
		this.e = bounds.e;
		this.w = bounds.w;
		this.maplevel = bounds.maplevel;
		this.maptype = bounds.maptype;
		this.q = bounds.q;
		this.qm = bounds.qm;
		this.cid = bounds.cid;
	},

	toString: function() {
		var s = '';
		s += 'time level:' + this.timelevel + '<br/>';
		s += 'time data level:' + this.timedatalevel + '<br/>';
		s += 'map level:' + this.maplevel + '<br/>';
		return s;
	}
}
