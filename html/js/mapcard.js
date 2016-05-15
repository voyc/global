// (c) Copyright 2007,2014 voyc.com
/**
 * Create a new MapCard object.
 * @constructor
 * @param {Map} map The map object.
 *
 * @class
 * A subclass of google.maps.OverlayView class that represents 
 * the map pane on which we open a mouseover HoverCard-like popup window.
 *
 * This subclassing is now done in voyc.js
 *  	voyc.MapCard.prototype = new google.maps.OverlayView();
 *
 * Three methods are required by google.maps.OverlayView:
 *     onAdd()
 *     onRemove()
 *     draw()
 *
 * MapPanes are documented here:
 * 	https://developers.google.com/maps/documentation/javascript/reference?csw=1#MapPanes
 * 	Note: In v2, getPane() was in the Map class.  Now in v3, it is in the OverlayView class.
 * 
 * There are seven absolutely positioned divs laid over the map.
 * 	6 floatPane - DOM events:Unknown; above all overlays
 * 	5 overlayMouseTarget - DOM events:Yes; transparent targets for markers
 * 	4 floatShadow - DOM events:Yes; info window shadow
 * 	3 overlayImage - DOM events:Unknow; marker foreground images
 * 	2 overlayShadow - DOM events:No
 * 	1 overlayLayer - DOM events:No; polygons drawn here
 * 	0 mapPane - DOM events:No; bottom pane, just above the tiles
 */

voyc.MapCard = function(vmap) {
	this.vmap = vmap;
	// this.map in the superclass, points to this.vmap.gmap

	this.parentDiv = null;
	this.div = null;
	this.img = null;
	this.caption = null;

	this.defaultOffsetX = 20;
	this.defaultOffsetY = -20;
	this.defaultWidth = 175;
	this.defaultHeight = 40;
	this.defaultImage = "images/pixel150.gif"; // purpose: init width to 150 pixels
}

/**
 * URL base for image files
 * @static
 */
voyc.MapCard.imgBase = "../images/";

/**
 * Called by GMap when object added to map.
 */
voyc.MapCard.prototype.onAdd = function() {
	voyc.debug.alert('MapCard::onAdd');

	// id all panes for debugging, in order from high to low
	this.getPanes().floatPane.id          = 'pane_floatPane';          // 6. above all overlays, DOM events:Unknown
	this.getPanes().overlayMouseTarget.id = 'pane_overlayMouseTarget'; // 5. transparent targets for markers, DOM events:Yes
	this.getPanes().floatShadow.id        = 'pane_floatShadow';        // 4. info window shadow, DOM events:Yes
	this.getPanes().overlayImage.id       = 'pane_overlayImage';       // 3. marker foreground images, DOM events:Unknown
	this.getPanes().overlayShadow.id      = 'pane_overlayShadow';      // 2. DOM events:No
	this.getPanes().overlayLayer.id       = 'pane_overlayLayer';       // 1. polygons drawn here, DOM events:No
	this.getPanes().mapPane.id            = 'pane_mapPane';            // 0. bottom pane, just above the tiles, DOM events:No

	// map panes become available during OverlayView onAdd()
	this.parentDiv = this.getPanes().floatPane;
	
	this.div = document.createElement("div");
	this.div.id = "mapcard";

	var imgcontainer = document.createElement("div");
	imgcontainer.id = "imgcontainer";
	this.div.appendChild(imgcontainer);

	this.img = document.createElement("img");
	imgcontainer.appendChild(this.img);

	this.caption = document.createElement("div");
	this.div.appendChild(this.caption);

	this.parentDiv.appendChild(this.div);

	// handle voyc events
	var self = this;
	voyc.event.subscribe('story_hovered', 'mapcard', function(evt,pub,obj) {
		if (obj.state == 'on') {
			self.show(obj.record);
		}
		else {
			self.hide(obj.record);
		}
	});
}

/**
 * Called by GMap when object is removed from map.
 */
voyc.MapCard.prototype.onRemove = function() {
}

/**
 * Called by GMap when map must be redrawn.
 */
voyc.MapCard.prototype.draw = function() {
}

/**
 * Hide the window.
 * @private
 */
voyc.MapCard.prototype.hide = function(record) {
	this.div.style.display = "none";
	this.img.src = "";
}

/**
 * Show the window for a specified data record.
 * @private
 */
voyc.MapCard.prototype.show = function(record) {
	// set content in div
	this.caption.innerHTML = record.h;

	// show the div
	this.div.style.display = "block";

	// set the position of the div
	this.setPosition(record);

	// re-position after the photo loads
	var self = this;
	this.img.onload = function() {self.setPosition(record)};

	// set image in div, thumbnail url or "No Photo"
	if (record.tu) {
		this.img.src = record.tu;
	}
	else {
		this.img.src = this.defaultImage;
	}
}

/**
 * Set position of the div, 
 * adjusting to keep it from going offscreen to the right or bottom.
 * @private
 */
voyc.MapCard.prototype.setPosition = function(record) {
	// get the location of the dot
	var lat,lng;
	var overlayProjection = this.getProjection();
	var pos = overlayProjection.fromLatLngToDivPixel(record.ms.latlng);
	var top = parseInt(pos.y);
	var left = parseInt(pos.x);

	// apply normal (right/down) spacing between dot and hovercard
	top = top + this.defaultOffsetY;
	left = left + this.defaultOffsetX;

	// position the div
	this.div.style.top = top + "px";
	this.div.style.left = left + "px";

	// find the max pixel positions of the screen
	var b = this.map.getBounds();
	var e = b.getNorthEast().lng();
	var s = b.getSouthWest().lat();
	var se = new google.maps.LatLng(s,e);
	var screen = overlayProjection.fromLatLngToDivPixel(se);

	// shift up if necessary to stay on screen
	var mapcardBottom = top + this.div.offsetHeight;
	var viewportBottom = screen.y;
	var diff = mapcardBottom - viewportBottom; 
	if (diff > 0) {
		top -= diff;
		this.div.style.top = top + "px";
	}

	// shift left if necessary to stay on screen
	var mapcardRight = left + this.div.offsetWidth;
	var viewportRight = screen.x;
	var diff = mapcardRight - viewportRight; 
	if (diff > 0) {
		left -= this.div.offsetWidth;
		left -= this.defaultOffsetX;
		left -= this.defaultOffsetX;
		this.div.style.left = left + "px";
	}
}
