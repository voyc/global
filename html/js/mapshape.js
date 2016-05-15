// (c) Copyright 2007,2014 voyc.com
/**
 * Create a new MapShape object.
 * @class This is a dummy base class to use when the MapShapeType is unknown, missing, or not yet supported.
 * @constructor
 * @param {id} id The id.
 * @param {map} map The map object.
 * @param {record} record The data record object.
 */
voyc.MapShape = function(id,map,record) {
	this.id = id;
	this.map = map;
	this.record = record;  // note: (this.record.ms == this)
}

/**
 * Create
 */
voyc.MapShape.prototype.create = function() {
}

/**
 * Destroy.
 */
voyc.MapShape.prototype.destroy = function() {
}

/**
 * Add to the map.
 */
voyc.MapShape.prototype.add = function() {
}

/**
 * Remove from the map.
 */
voyc.MapShape.prototype.remove = function() {
}

/**
 * Show.
 */
voyc.MapShape.prototype.show = function() {
}

/**
 * Hide.
 */
voyc.MapShape.prototype.hide = function() {
}

/**
 * Set the opacity.
 */
voyc.MapShape.prototype.setOpacity = function() {
}
