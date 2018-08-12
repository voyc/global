/**
 * Creates a Map object.
 * @constructor
 * @param {HTMLElement} eid The id of the HTML element to contain the map.
 *
 * @class
 * Represents a Map UI object.
 * Embeds and wraps the GMap object.
 * Prior to GMap v3 this class subclassed the GMap2 class.
 *
 * Remember: SOUTH latitude is negative, like a graph
 */
voyc.Map = function(e) {
	this.e = e;
	this.gmap = null;
	this.changed = {
		center:false,
		zoom:false,
		bounds:false,
		maptype:false,
		reset:false
	}
	this.startingBounds = null;
	this.width = 0;
	this.height = 0;
	this.time = {};
	this.selected = null;
	this.center = {};
	this.resizeInProgress = false;
}

/**
 * Create part 1 of 3.
 * Load the GMap API.
 * Instantiate other subsidiary objects.
 */
voyc.Map.prototype.create = function(bounds) {
	voyc.debug.alert('Map.create requesting GMap API');
	this.startingBounds = bounds;
	
	// load the google maps api javscript file
	var gmapapikey = 'AIzaSyDEaOtyOoFPn8XFhJNWA2-UwiBMfjTuPiw';  // todo: hide this
	var gmapapiurl = 'https://maps.googleapis.com/maps/api/js?v=3.exp&sensor=false&callback=voyc.voyc.map.onGMapAPILoaded';
	var url = gmapapiurl + '&key=' + gmapapikey;
	voyc.appendScript(url);

	// instantiate embedded helper objects
	this.mapcard = new voyc.MapCard(this);
	this.level = new voyc.MapLevel(this);

	// voyc event handlers
	var self = this;
	voyc.event.subscribe('data_ready', 'map', function(evt,pub,obj) { self.onData(evt,pub,obj);});
	voyc.event.subscribe('story_hovered', 'map', function(evt,pub,obj) { self.onHover(evt,pub,obj);});
	voyc.event.subscribe('story_selected', 'map', function(evt,pub,obj) { self.onSelect(evt,pub,obj);});
	voyc.event.subscribe('story_disqualified', 'map', function(evt,pub,obj) { self.onDisqualify(evt,pub,obj);});
	voyc.event.subscribe('time_initialized', 'map', function(evt,pub,obj) { self.onTimeEvent(evt,pub,obj);});
	voyc.event.subscribe('time_moved', 'map', function(evt,pub,obj) { self.onTimeEvent(evt,pub,obj);});
	voyc.event.subscribe('time_zoomed', 'map', function(evt,pub,obj) { self.onTimeEvent(evt,pub,obj);});
	voyc.event.subscribe('time_animated', 'map', function(evt,pub,obj) { self.onTimeEvent(evt,pub,obj);});
	voyc.event.subscribe('window_resized', 'timeline', function(evt,pub,obj) { self.resized(evt,pub,obj);});
	voyc.event.subscribe('window_resizing', 'timeline', function(evt,pub,obj) { self.resizing(evt,pub,obj);});
}

/**
 * Create part 2 of 3.
 * Callback. Receives control after map api is loaded.
 * Create and initialize the google map object.
 */
voyc.Map.prototype.onGMapAPILoaded = function() {
	voyc.event.publish('gmap_api_ready', 'map', {});

	// subclass the GMapAPI-subclasses
	voyc.subClass(voyc.MapCard, google.maps.OverlayView);
	voyc.subClass(voyc.MapMarker, google.maps.OverlayView);

	// instantiate a blank gmap object	
	this.gmap = new google.maps.Map(this.e);

	// set a onetime idle handler
	var self = this;
	google.maps.event.addListenerOnce(this.gmap, 'idle', function() {
		voyc.debug.alert('Map.onGMapAPILoaded onetime idle event received');
		self.onMapReady();
	});

	// set the options to position the map
	// this will trigger the first idle event
	this.gmap.setOptions({
		center: new google.maps.LatLng(this.startingBounds.mapcenter.lat,this.startingBounds.mapcenter.lng),
		zoom: this.level.getGoogleFromVoyc(this.startingBounds.maplevel),
		mapTypeId: this.startingBounds.maptype
	});
	this.center = this.startingBounds.mapcenter;
}

/**
 * Create part 3 of 3.
 * GMap Event Handler. Receives control on first idle event.
 * Set the GMap event handlers.
 */
voyc.Map.prototype.onMapReady = function() {
	var self = this;

	google.maps.event.addListener(this.gmap, 'click', function(e) { 
		var x = e.latLng;
		console.log('click lat:'+e.latLng.lat()+' lng:'+e.latLng.lng());
	});

	google.maps.event.addListener(this.gmap, 'center_changed', function() { 
		//voyc.debug.alert( 'gmap: center_changed');
		self.changed.center = true;
	});
	google.maps.event.addListener(this.gmap, 'zoom_changed', function() { 
		//voyc.debug.alert( 'gmap: zoom_changed');
		self.changed.zoom = true;
	});
	google.maps.event.addListener(this.gmap, 'bounds_changed', function() { 
		//voyc.debug.alert( 'gmap: bounds_changed');
		self.changed.bounds = true;
	});
	google.maps.event.addListener(this.gmap, 'maptypeid_changed', function() { 
		//voyc.debug.alert( 'gmap: maptypeid_changed');
		self.changed.maptype = true;
		self.onidle();
	});
	google.maps.event.addListener(this.gmap, "idle", function() { 
		//voyc.debug.alert( 'gmap: idle');
		self.onidle();
	});

	this.mapcard.setMap(this.gmap);

	// We knew the starting center and level before.
	var bounds = {};
	bounds.maplevel = this.startingBounds.maplevel;
	bounds.mapcenter = this.startingBounds.mapcenter;

	// Now that the map is positioned, we can ask it for n,w,e,w.
	var b = this.gmap.getBounds();
	bounds.n = b.getNorthEast().lat();
	bounds.s = b.getSouthWest().lat();
	bounds.e = b.getNorthEast().lng();
	bounds.w = b.getSouthWest().lng();
	voyc.event.publish('map_initialized', 'map', {bounds:bounds});
}

/**
 * GMap Event Handler.  Called after zooming and moving are complete.
 */
voyc.Map.prototype.onidle = function() {

	// get all the changed info into a bounds object
	var bounds = {}; //new voyc.Bounds;

	if (this.changed.zoom) {
		var mapLevelGoogle = this.gmap.getZoom();
		bounds.maplevel = this.level.getVoycFromGoogle(mapLevelGoogle);
	}
	if (this.changed.bounds) {
		var b =  this.gmap.getBounds();
		bounds.n = b.getNorthEast().lat();
		bounds.s = b.getSouthWest().lat();
		bounds.e = b.getNorthEast().lng();
		bounds.w = b.getSouthWest().lng();
	}
	if (this.changed.center) {
		var c = this.gmap.getCenter();
		bounds.mapcenter = {
			lat: c.lat(),
			lng: c.lng()
		}
	}
	if (this.changed.maptype) {
		bounds.maptype = this.gmap.getMapTypeId();
	}

	// publish an event, always passing the bounds object
	if (this.changed.zoom) {
		voyc.event.publish('map_zoomed', 'map', {bounds:bounds,reset:this.changed.reset});
	}
	else if (this.changed.center || this.changed.bounds) {
		voyc.event.publish('map_moved', 'map', {bounds:bounds,reset:this.changed.reset});
		if (!this.resizeInProgress) {
			this.center = bounds.mapcenter;
		}
	}
	if (this.changed.maptype) {
		this.gmap.getMapTypeId();
		voyc.event.publish('map_type_changed', 'map', {bounds:bounds,reset:this.changed.reset});
	}

	this.changed.reset = false;
	this.changed.center = false;
	this.changed.zoom = false;
	this.changed.bounds = false;
	this.changed.maptype = false;
}

/**
 * Voyc Event Handler.  Called when a single record has been hovered.
 * @event
 */
voyc.Map.prototype.onHover = function(evt,pub,obj) {
	if (obj.record.ms) {
		obj.record.ms.onHover(evt,pub,obj);
	}
}

/**
 * Voyc Event Handler.  Called when a single record has been selected.
 * @event
 */
voyc.Map.prototype.onSelect = function(evt,pub,obj) {
	if (obj.record.ms) {
		obj.record.ms.onSelect(evt,pub,obj);
	}
}

/**
 * Voyc Event Handler.  Called when a single record has been disqualified.
 * @event
 */
voyc.Map.prototype.onDisqualify = function(evt,pub,obj) {
	//if (obj.record.ms) {
		obj.record.ms.remove();
	//}
}

voyc.Map.prototype.resizing = function() {
	this.resizeInProgress = true;
}

voyc.Map.prototype.resized = function() {
	this.resizeInProgress = false;
	if (this.gmap) {
		voyc.debug.alert('Map.resize');
		
		// map api reference says to do this
		google.maps.event.trigger(this.gmap, 'resize');
		
		// retain map center, ignore center_changed event
		this.gmap.setCenter( new google.maps.LatLng(this.center.lat,this.center.lng));
	}
}

/**
 * Event Handler.  Called on time events.
 * @event
 */
voyc.Map.prototype.onTimeEvent = function(evt,pub,obj) {
	this.time.begin = obj.bounds.begin;
	this.time.center = obj.bounds.timecenter;
	this.time.end = obj.bounds.end;
	this.time.level = obj.bounds.timelevel;
	this.draw();
}

/**
 * Voyc Event Handler.  Called when new data has arrived from server.
 * @event
 */
voyc.Map.prototype.onData = function(evt,pub,obj) {
	this.data = obj.data;
	this.mapcard.data = this.data;
	if (obj.bounds.qm == 's') {
		this.changed.reset = true;
		this.resetPosition(obj.bounds);
	}
	this.draw();
}

/**
 * Reset map position.
 */
voyc.Map.prototype.resetPosition = function(bounds) {
	// calc new center
	var lat = bounds.s + ((bounds.n - bounds.s)/2);
	var lng = bounds.w + ((bounds.e - bounds.w)/2);
	bounds.mapcenter = {lat:lat,lng:lng};
	this.center = bounds.mapcenter;

	// calc new level
	bounds.maplevel = this.level.calcLevel(bounds);

	// zoom and move map
	this.gmap.setZoom(this.level.getGoogleFromVoyc(bounds.maplevel));
	this.gmap.panTo(new google.maps.LatLng(bounds.mapcenter.lat,bounds.mapcenter.lng));
}

/**
 * Redraw the shapes on the map.
 */
voyc.Map.prototype.draw = function() {
	var count = {
		dot:0,
		polygon:0,
		shape:0
	}
	var record;
	for (var id in this.data) {
		record = this.data[id];
		if (record.q) {
			if (!record.ms) {
				switch (record.mt) {
					case voyc.MapShapeType.Dot:
						record.ms = new voyc.MapDot(id, this, record);
						count.dot++;
						break;
					case voyc.MapShapeType.MultiPolygon:
					case voyc.MapShapeType.Polygon:
						record.ms = new voyc.MapPolygon(id, this, record);
						count.polygon++;
						break;
					default:
						record.ms = new voyc.MapShape(id, this, record);
						count.shape++;
						break;
				}
				record.ms.add();
			}
			record.ms.setOpacity();
		}
		else {
			if (record.ms) {
				record.ms.remove();
			}
		}
	}
	//voyc.debug.alert(['dot,polygon,shape',count.dot,count.polygon,count.shape]);
}

voyc.Map.prototype.openEditor = function(id) {
	this.mapcard.openEditor(id);
}

/**
 * MapType
 * In v2, the MapType was a code into a table of structures, and we translated between the two.
 * In v3, the MapTypeId is a string, also equated to an ID. 
 * We use the string (id) as-is, but we call it MapType.
 * 
 *   google.maps.MapTypeId.HYBRID = 'hybrid'
 *   google.maps.MapTypeId.ROADMAP = 'roadmap'
 *   google.maps.MapTypeId.SATELLITE = 'satellite'
 *   google.maps.MapTypeId.TERRAIN = 'terrain'
 */

voyc.MapShapeType = {
	None:0,
	Dot:2,
	Polygon:3,
	MultiPolygon:4,
	LineString:5,
	MultiGeometry:6
}
