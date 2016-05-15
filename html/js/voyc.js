// (c) Copyright 2007,2014 voyc.com
/**
 *  Main window UI layout manager.  Contains startup script.
 *	@constructor
 */
voyc.Voyc = function() {
	this.map = null;
	this.timeline = null;
	this.layout = null;
	this.dashboard = null;
	this.detail = null;
	this.dispatch = null;
//	this.color = null;
//	this.card = null;

	this.defaultStartingBounds = {
		timecenter: voyc.When.fromJSDate(new Date()),
		timedatalevel: 2,
		timelevel: 0,
		mapcenter: { lat:20, lng:0},
		maplevel: 18,
		maptype: 'satellite'
	}
	var x = '';
}


voyc.Voyc.prototype = {
	/**
	 * DOM Event Handler. Called when the browser opens.
	 * Instantiate all objects.
	 * Layout the screen.
	 */
	create : function() {
		voyc.debug.alert("Voyc.create");
		
		// create global singletons
		voyc.event = new voyc.Event();
		voyc.color = new voyc.Color();
		voyc.animator = new voyc.Animator();
		voyc.dragger = new voyc.Dragger();
		voyc.card = new voyc.Card();
		voyc.options = new voyc.Options();

		// fixup the layout
		this.layout = new voyc.Layout();
		this.layout.create();

		// set folder pointers
		// this is a central location where we can reorganize the disk 
		voyc.MapDot.imgBase = 'images/jdots/';
		voyc.Timeline.imgBase = 'images/jdots/';
		voyc.MapCard.imgBase = 'images/';
		voyc.Dispatch.svcBase = 'svc/';
		voyc.Xhr.svcBase = 'svc/';

		// for local testing
		if (window.location.protocol == 'file:') {
			voyc.Dispatch.svcBase = 'http://www.voyc.com/html/svc/';
			voyc.Xhr.svcBase = 'http://www.voyc.com/html/svc/';
		}

		// map.create() will trigger these events
		var self = this;
		voyc.event.subscribe('gmap_api_ready', 'voyc', function(evt,pub,o) {
			voyc.debug.alert('voyc.onLoad received gmap_api_ready');
		});
		voyc.event.subscribe('map_initialized', 'voyc', function(evt,pub,o) {
			voyc.debug.alert("voyc.onLoad received map_initialized");
		});

		// get starting location from cookies
		var startingBounds = this.readCookies();
		startingBounds = voyc.mergeOptions(this.defaultStartingBounds, startingBounds);

		// create the dispatch object
		this.dispatch = new voyc.Dispatch();
		this.dispatch.create();

		// create the four main UI window managers
		this.map = new voyc.Map(voyc.$('map'));
		this.map.create(startingBounds);

		this.dashboard = new voyc.Dashboard(document.getElementById('dashboard'));
		this.dashboard.create(startingBounds);

		this.timeline = new voyc.Timeline(document.getElementById('timeline'));
		this.timeline.create(startingBounds);

		this.detail = new voyc.Detail(document.getElementById('detail'));
		this.detail.create();

		// store future changes to location in cookies
		this.bindCookieWriters();

		// authorize user
//		this.user = new User();
		var tk = voyc.Cookie.get("tk");
		if (tk) {
//			this.user.authorize(tk);
		}


		// layout size and position of container divs for visible screen elements
//		this.layout();
//		this.dashboard.resize();
		
//		this.synchSearchForms();
//      put the one in the Dashboard, and the other two in Meta

		voyc.debug.alert('Voyc.create complete');
	},
	/**
	 * Get saved coordinates from the cookies.
	 * This happens once only at startup.
	 */
	readCookies: function() {
		var bounds = {};
		var t = voyc.Cookie.get("t");
		if (t) {
			var timecenter = new voyc.When();
			timecenter.deserialize(t);
			bounds.timecenter = timecenter.decidate;
		}

		t = voyc.Cookie.get("tz");
		if (t) {
			bounds.timelevel = parseInt(t);
		}

		t = voyc.Cookie.get("m");
		if (t) {
			var a = t.split("_");
			bounds.mapcenter = {lat:a[0],lng:a[1]};
		}

		t = voyc.Cookie.get("mz");
		if (t) {
			bounds.maplevel = parseInt(t);
		}

		t = voyc.Cookie.get("mt");
		if (t) {
			bounds.maptype = t;
		}


		t = voyc.Cookie.get("q");
		if (t) {
			bounds.q = t;
//			document.getElementById("searchinput").value = t;
		}

		return bounds;

		// story ? onetime
		// startq ? onetime
		// Perhaps we should NOT keep these in cookies.

		t = voyc.Cookie.get("story");
		if (t) {
			g.voyc.startupStoryId = t;
			voyc.Cookie.del("story");
		}

		t = voyc.Cookie.get("startq");
		if (t) {
			g.voyc.startupq = t;
			voyc.Cookie.del("startq");
		}
		return bounds
	},
	/**
	 * Creates event listeners that write cookies whenever coordinates change.
	 */
	bindCookieWriters: function() {
		voyc.event.subscribe("time_moved", "cookie", function(evt,pub,obj) {
			var timecenter = new voyc.When(obj.bounds.timecenter);
			var t = timecenter.serialize();
			if (t) {
				voyc.Cookie.set("t", t);
			}
		});
		voyc.event.subscribe("time_zoomed", "cookie", function(evt,pub,obj) {
			var bounds = obj.bounds;
			voyc.Cookie.set("tz", bounds.timelevel);
			var timecenter = new voyc.When(obj.bounds.timecenter);
			var t = timecenter.serialize();
			if (t) {
				voyc.Cookie.set("t", t);
			}
		});
		voyc.event.subscribe("map_moved", "cookie", function(evt,pub,obj) {
			var bounds = obj.bounds;
			var mc = bounds.mapcenter.lat + "_" + bounds.mapcenter.lng;
			voyc.Cookie.set("m", mc);
		});
		voyc.event.subscribe("map_zoomed", "cookie", function(evt,pub,obj) {
			var bounds = obj.bounds;
			voyc.Cookie.set("mz", bounds.maplevel);
			if (bounds.mapcenter) {
				var mc = bounds.mapcenter.lat + "_" + bounds.mapcenter.lng;
				voyc.Cookie.set("m", mc);
			}
		});

		voyc.event.subscribe('map_type_changed', 'cookie',  function(evt,pub,obj) {
			var bounds = obj.bounds;
			voyc.Cookie.set("mt", bounds.maptype);
		});

		voyc.event.subscribe('query_search', 'dispatch', function(evt,pub,obj) {
			voyc.Cookie.set("q", obj.bounds.q);
		});
		/*
		voyc.event.subscribe("OnLogin", "cookie", function(evt,pub,token) {
			voyc.Cookie.set("tk", token);
		});
		voyc.event.subscribe("OnLogout", "cookie", function(evt,pub) {
			voyc.Cookie.del("tk");
		});
		*/
	}
}
