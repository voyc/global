/**
 * Create a new MapLevel object.
 * @class Translates among scales.
 * @constructor
 */
voyc.MapLevel = function(map) {
	this.map = map;
	this.pixelsPerCM = voyc.voyc.layout.pixelsPerCM;
}

/**
 * MapLevel
 *
 * Discrete MapLevel per Google.
 * Google numbers zoom levels in reverse, 19 to 0, smallest number at the highest altitude.
 * (Sometimes 17 to 0.)
 *
 * Discrete MapLevel per Voyc.
 * Voyc levels go from 1 to 20, largest number at highest altitude.
 *
 * Miles of latitude per cm is most reliable value 
 * because it is infinite in scale and precision.
 *
 * For details, see design doc mapLevelZoom.xls
 */

/**
 * Get MapLevelVoyc from MapLevelGoogle.
 */
voyc.MapLevel.prototype.getVoycFromGoogle = function(mapLevelGoogle) {
//voyc.MapLevel.prototype.convertGoogleLevelToVoycLevel = function(googleLevel) {
	return voyc.MapLevel.maxGoogleLevel - mapLevelGoogle;
}

/**
 * Get MapLevelGoogle from MapLevelVoyc.
 */
voyc.MapLevel.prototype.getGoogleFromVoyc = function(mapLevelVoyc) {
//voyc.MapLevel.prototype.convertVoycLevelToGoogleLevel = function(voycLevel) {
	return voyc.MapLevel.maxGoogleLevel - mapLevelVoyc;
}

/**
 * Get milesPerCM from boundaries.
 */
voyc.MapLevel.prototype.calcMilesPerCM = function(bounds) {
	var milesPerDegree = 60;  // 1 degree latitude is about 60 nautical miles, 111 kilometres, or 69 statute miles at any latitude

	// aspectRatio of current map
	var b = this.map.gmap.getBounds();
	var n = b.getNorthEast().lat();
	var s = b.getSouthWest().lat();
	var e = b.getNorthEast().lng();
	var w = b.getSouthWest().lng();
	var latSpread = n - s;
	var lngSpread = e - w;
	if (e < w) {
		lngSpread = (180 - w) + (180 - Math.abs(e));
	}
	var arOld = latSpread / lngSpread;

	// aspect ratio of new boundaries
	latSpread = bounds.n - bounds.s;
	lngSpread = bounds.e - bounds.w;
	if (bounds.e < bounds.w) {
		lngSpread = (180 - bounds.w) + (180 - Math.abs(bounds.e));
	}
	var arNew = latSpread / lngSpread;

	// distance from equator converted to a ratio
	var latCenter = bounds.s + ((bounds.n - bounds.s) / 2);
	var latDiff = Math.abs(latCenter);
	var latRatio = latDiff/90;

	// height in degrees Latitude
	var htDegrees = latSpread;

	// adjust for aspect ratio (wide longitude spread)
	if (arNew < arOld) {
		arDiff = arOld / arNew;
		htDegrees = latSpread * arDiff; // * latRatio;
	}

	// calculate based on adjusted height in degrees latitude
	var htPixels = this.map.e.offsetHeight;	

	var htCM = htPixels / this.pixelsPerCM;
	var degreesPerCM = htDegrees / htCM;
	var milesPerCM = degreesPerCM * milesPerDegree;
	return milesPerCM;
}

/**
 * Get MapLevelVoyc from map bounds.
 */
voyc.MapLevel.prototype.calcLevel = function(bounds) {
	var milesPerCM = this.calcMilesPerCM(bounds);
	var level = 0;
	var max = voyc.MapLevel.b.length;
	for (; level<max; level++) {
		if (milesPerCM < voyc.MapLevel.b[level]) {
			break;
		}
	}
	level++;
	return level;
}

voyc.MapLevel.maxGoogleLevel = 20; 

// miles per cm at each MapLevelVoyc
voyc.MapLevel.b = [];
voyc.MapLevel.b[ 0] = 0;
voyc.MapLevel.b[ 1] = 0.0108298133;
voyc.MapLevel.b[ 2] = 0.0216596267;
voyc.MapLevel.b[ 3] = 0.0433192533;
voyc.MapLevel.b[ 4] = 0.0866385067;
voyc.MapLevel.b[ 5] = 0.1732770134;
voyc.MapLevel.b[ 6] = 0.3465540268;
voyc.MapLevel.b[ 7] = 0.6931080537;
voyc.MapLevel.b[ 8] = 1.3862161075;
voyc.MapLevel.b[ 9] = 2.7724322150;
voyc.MapLevel.b[10] = 5.5448644297;
voyc.MapLevel.b[11] = 11.089728859;
voyc.MapLevel.b[12] = 22.179457720;
voyc.MapLevel.b[13] = 44.358915436;
voyc.MapLevel.b[14] = 88.717830877;
voyc.MapLevel.b[15] = 177.43566175;
voyc.MapLevel.b[16] = 354.87132352;
voyc.MapLevel.b[17] = 709.74264701;
voyc.MapLevel.b[18] = 1270.5882352;
