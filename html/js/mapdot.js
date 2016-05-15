// (c) Copyright 2007,2014 voyc.com
/**
 * Create a new MapDot object.
 * @class Represents one dot on the map.  Embeds a google maps api Marker object.
 * @constructor
 * @param {id} id The id.
 * @param {map} map The map object.
 * @param {record} record The data record object.
 */
voyc.MapDot = function(id,map,record) {
	this.id = id;
	this.map = map;
	this.record = record;  // note: (this.record.ms == this)

	this.color = voyc.color.colornames[this.record.c];
	this.latlng = null;
	this.state = 'n';
	this.marker = null;
}

voyc.MapDot.imgBase = "../images/jdots/";
voyc.MapDot.startingIndex = 100;  // constant
voyc.MapDot.zIndex = 100;  // working index, increment by 1 with every click

/**
 * Create a dot.
 */
voyc.MapDot.prototype.create = function() {
	// create a lat/lng object from the point x.p
	this.latlng = new google.maps.LatLng( this.record.p[0][0], this.record.p[0][1]);

	// normal state
	this.state = 'n';
	
	var opacity = this.calcOpacity(); // initial value

	// create the marker
	this.marker = new voyc.MapMarker({
		position: this.latlng,
		icon:voyc.MapDot.imgBase + this.color + '-dot-sm-n.png',
		voycId: this.id,
		zIndex: voyc.MapDot.zIndex,
		width: 16,
		height: 16,
		opacity: opacity
	});
	this.marker.mapdot = this;
}

/**
 * Callback from gmap.
 */
voyc.MapDot.prototype.onMarkerAdded = function() {
	// add the DOM event handlers
	var self = this;
	voyc.addEvent(this.marker.img,'click',function(){
		voyc.event.publish('story_selected', 'mapdot', {record:self.record});
		return false;
	}); 
	voyc.addEvent(this.marker.img,'mouseover',function(){
		voyc.event.publish('story_hovered', 'mapdot', {state:'on', record:self.record});
	}); 
	voyc.addEvent(this.marker.img,'mouseout',function(){
		voyc.event.publish('story_hovered', 'mapdot', {state:'off', record:self.record});
	});
}

/**
 * Destroy a dot.
 */
voyc.MapDot.prototype.destroy = function() {
	this.marker = null;
	this.latlng = null;
	this.state = 'n';
}

/**
 * Add a dot to the map.
 */
voyc.MapDot.prototype.add = function() {
	if (!this.marker) {
		this.create();
	}
	if (!this.marker.getMap()) {
		this.marker.setMap(this.map.gmap);
	}
}

/**
 * Remove a dot from the map.
 */
voyc.MapDot.prototype.remove = function() {
	if (this.marker && this.marker.getMap()) {
		this.marker.setMap(null);
	}
}

/**
 * Show this dot.
 */
voyc.MapDot.prototype.show = function(id, latlng) {
	if (this.marker.img)
		this.marker.img.style.display = 'block';
}

/**
 * Hide this dot.
 */
voyc.MapDot.prototype.hide = function(id) {
	if (this.marker)
		this.marker.img.style.display = 'none';
}

/**
 * Calculate the opacity value based on distance from time center.
 * Duplicated in class timebar.
 */
voyc.MapDot.prototype.calcOpacity = function() {
	var opacity = 0;
	var diff = Math.abs(this.record.b - this.map.time.center);
	var maxdistance = (this.map.time.end - this.map.time.begin) / 2;
	var opacity = (maxdistance-diff)/maxdistance;
	if (opacity < 0.0) opacity = 0.0;
	else if (opacity < 0.5) opacity = 0.5;
	else if (opacity > 0.9) opacity = 1.0;
	return opacity;
}

/**
 * Set the opacity on this dot.
 */
voyc.MapDot.prototype.setOpacity = function() {
	if (this.marker.img) {
		var opacity = this.calcOpacity();
		if (opacity <= 0) {
			this.hide();
		}
		else {
			this.marker.img.style.opacity = opacity;
			this.show();
		}
	}
}

/**
 * Event Handler. Called when a single record has been hovered.
 * @event
 */
voyc.MapDot.prototype.onHover = function(evt, pub, obj) {
	if (!this.marker || !this.marker.img) {
		voyc.debug.alert('Tried to hover a non-existent dot.');
		return;
	}

	if (this.state == "d") {
		return;
	}
	if (obj.state == "off") {
		this.state = "n";
		this.marker.img.src = voyc.MapDot.imgBase + this.color + "-dot-sm-n.png";
	}
	else {
		this.state = "h";
		this.marker.img.src = voyc.MapDot.imgBase + this.color + "-dot-sm-h.png";
		this.marker.img.style.zIndex = voyc.MapDot.zIndex++;
	}
}

voyc.MapDot.prototype.onSelect = function(evt,pub,obj) {
	// undo previous selection
	if (this.map.selected) {
		var prev = this.map.selected;
		prev.state = 'n';
		prev.marker.img.src = voyc.MapDot.imgBase + this.color + "-dot-sm-n.png";
	}

	// select this one
	this.map.selected = this;
	this.state = 'd';
	this.marker.img.src = voyc.MapDot.imgBase + this.color + "-dot-sm-d.gif";
}
