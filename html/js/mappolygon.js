/**
 * Create a new MapPolygon object.
 * @class Represents one polygon on the map.  Embeds one google maps api polygon object.
 * @constructor
 * @param {id} id The id.
 * @param {map} map The map object.
 * @param {record} record The data record object.
 */
voyc.MapPolygon = function(id,map,record) {
	this.id = id;
	this.map = map;
	this.record = record;  // note: (this.record.ms == this)

	this.polygon = null;
	this.latlngs = null;
	this.latlng = null;
	this.shown = false;
}

/**
 * Create this shape.
 */
voyc.MapPolygon.prototype.create = function() {
	// create an array of lat/lng objects from the array of coordinates x.p
	this.latlngs = [];
	
	switch(this.record.mt) {
		case voyc.MapShapeType.Polygon:
			for (var co in this.record.p) {
				this.latlngs.push(new google.maps.LatLng(this.record.p[co][0],this.record.p[co][1]));
			}
			break;
		case voyc.MapShapeType.MultiPolygon:
			var poly;
			for (var po in this.record.p) {
				poly = [];
				for (var co in this.record.p[po]) {
					poly.push(new google.maps.LatLng(this.record.p[po][co][0],this.record.p[po][co][1]));
				}
				this.latlngs.push(poly);
			}
			break;
	}

	// create the gmap polygon
	this.polygon = new google.maps.Polygon({
		paths: this.latlngs,
		strokeColor: voyc.color.get(this.record.c),
		strokeOpacity: 1,
		strokeWeight: 1,
		fillColor: voyc.color.get(this.record.c),
		fillOpacity: 0.5,
		voycId: id
	});

	this.latlng = this.getCenter();

	// add the event handlers
	var self = this;
	google.maps.event.addListener(this.polygon,'click',function(){
		if (self.map.selected) {
			voyc.event.publish('story_selected', 'mappolygon', {state:'off', record:self.map.selected.record});
		}
		self.map.selected = self;
		voyc.event.publish('story_selected', 'mappolygon', {state:'on', record:self.record});
	});
	google.maps.event.addListener(this.polygon,'mouseover',function(){
		voyc.event.publish('story_hovered', 'mappolygon', {state:'on', record:self.record});
	});
	google.maps.event.addListener(this.polygon,'mouseout',function(){
		voyc.event.publish('story_hovered', 'mappolygon', {state:'off', record:self.record});
	});
}

/**
 * Destroy this shape.
 */
voyc.MapPolygon.prototype.destroy = function() {
	this.polygon = null;
	this.latlngs = [];
}

/**
 * Add a shape to the map.
 */
voyc.MapPolygon.prototype.add = function() {
	if (!this.polygon) {
		this.create();
	}
	this.polygon.setMap(this.map.gmap);
}

/**
 * Remove this shape from the map.
 */
voyc.MapPolygon.prototype.remove = function() {
	if (this.polygon) {
		this.polygon.setMap(null);
	}
	this.destroy();
}

/**
 * Set opacity.
 */
voyc.MapPolygon.prototype.setOpacity = function() {
	if (this.record.b < this.map.time.center && this.map.time.center < this.record.e) {
		this.show();
		this.shown = true;
	}
	else {
		this.hide();
		this.shown = false;
	}
}

/**
 * event handler
 */
voyc.MapPolygon.prototype.onHover = function(evt,pub,obj) {
	if (this.polygon) {
		if (obj.state == 'on') {
			this.polygon.setOptions({
				strokeColor: voyc.color.get(voyc.color.white),
				strokeWeight:3,
				visible:true
			});
		}
		else if (obj.state == 'off') {
			this.polygon.setOptions({
				strokeColor: voyc.color.get(this.record.c),
				strokeWeight: 1,
				visible:this.shown
			});
		}
	}
}

/**
 * event handler
 */
voyc.MapPolygon.prototype.onSelect = function(evt,pub,obj) {
	voyc.debug.alert('MapPolygon::onSelect  state:' + obj.state);
	// undo previous selection
	if (this.map.selected) {
		var prev = this.map.selected;
		prev.state = 'n';
	}

	// select this one
	this.map.selected = this;
	this.state = 'd';
}

/**
 * Show this polygon.
 */
voyc.MapPolygon.prototype.show = function() {
	if (this.polygon) {
		this.polygon.setVisible(true);
	}
}

/**
 * Hide this polygon.
 */
voyc.MapPolygon.prototype.hide = function() {
	if (this.polygon) {
		this.polygon.setVisible(false);
	}
}

/**
 * Return centerpoint of this polygon.
 */
voyc.MapPolygon.prototype.getCenter = function() {
	var b = this.getBounds();
	return b.getCenter();
}

/**
 * Return bounds of this polygon.
 */
voyc.MapPolygon.prototype.getBounds = function() {
	var bounds = new google.maps.LatLngBounds();
	var paths = this.polygon.getPaths();
	var path;
	for (var p=0; p<paths.getLength(); p++) {
		path = paths.getAt(p);
		for (var i=0; i<path.getLength(); i++) {
			bounds.extend(path.getAt(i));
		}
	}
	return bounds;
}
