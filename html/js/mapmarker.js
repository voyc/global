// (c) Copyright 2014 voyc.com
/**
 * Create a new MapMarker object.
 * @constructor
 * @param {object} opts Marker options.
 *
 * @class
 * A subclass of google.maps.OverlayView class that represents one marker.
 * This class is intended to mimic and replace the google maps api Marker class.
 *
 * This subclassing is now done in voyc.js
 *  	voyc.MapMarker.prototype = new google.maps.OverlayView();
 *
 * Three methods are required by google.maps.OverlayView:
 *     onAdd()
 *     onRemove()
 *     draw()
 */

voyc.MapMarker = function(opts) {
	this.opts = {};
	this.latlng = opts.position;
	this.src = opts.icon;
	this.id = voyc.MapMarker.idprefix + opts.voycId;
	this.zIndex = opts.zIndex;
	this.width = opts.width;
	this.height = opts.height;
	this.opacity = opts.opacity;

	// note: this.map in the superclass, points to this.vmap.gmap
	this.mapdot = null;  // set by caller
	this.img = null;
}

/**
 * URL base for image files
 * @static
 */
voyc.MapMarker.imgBase = "../images/";
voyc.MapMarker.idprefix = 'vm_';

/**
 * Called by GMap when object added to map.
 */
voyc.MapMarker.prototype.onAdd = function() {
	// Create the img element
	this.img = document.createElement('img');
	this.img.id = this.id;
	this.img.src = this.src;
	this.img.style.width = this.width + 'px';
	this.img.style.height = this.height + 'px';
	this.img.style.position = 'absolute';
	this.img.style.zIndex = this.zIndex;
	this.img.style.opacity = this.opacity;
	this.img.style.cursor = 'pointer';
	
	// Add the element to the pane
	var panes = this.getPanes();
	panes.overlayMouseTarget.appendChild(this.img);
	
	this.mapdot.onMarkerAdded();
}

/**
 * Called by GMap when object is removed from map.
 */
voyc.MapMarker.prototype.onRemove = function() {
	this.img.parentNode.removeChild(this.img);
	this.img = null;
}

/**
 * Called by GMap when map must be redrawn.
 */
voyc.MapMarker.prototype.draw = function() {
	var overlayProjection = this.getProjection();
	var pt = overlayProjection.fromLatLngToDivPixel(this.latlng);
	//this.img.style.left = pt.x + 'px';
	//this.img.style.top = pt.y + 'px';
	this.img.style.left = pt.x - (this.width/2) + 'px';
	this.img.style.top = pt.y - (this.height/2) + 'px';
}
