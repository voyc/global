// (c) Copyright 2009,2014 voyc.com

/*
Developer notes: dispatch algorithms.

Multiple Bounds Objects

	1) Bounds on-screen
		This information is in the map and timeline objects.
		We considered keeping this in dispatch also.
		Then in addition to qualifying each record,
		we would mark each record as on-screen or not.
		Events, if not on-screen in the timeline, should not be shown on the map.
		We now handle this with Map.setOpacity().
		Polygons, if not centered on timeline, should not be shown on the map.
	
	2) Bounds pending
	3) Bounds databuffer
		When we get a dataread request, we could update the pending bounds,
		and then make the same update to databuffer bounds after the data returns.
		This is double work, and does not buy us anything.
		So we eliminate pending.
		We update databuffer immediately on the read request, and let it be 
		wrong until the data comes back.
	
	4) Bounds for each data request.
	5) Bounds for each response received from server.

Special cases:
	Time panning
		Databuffer bounds is wider than what's on-screen.
		The data requests are incremental.
		We don't need to do a read until the threshold is crossed.
	Query search
		After data returns, we reset the map and timeline, centers and levels.
		Gmap sends us a late onidle, we don't want it to trigger a dataread.
	Time animation
		We don't always need to do a dataread.

We decided to maximize simplicity:
	Keep only the bounds for the databuffer.
	Not pending.
	Not onscreen.
	Update the bounds on readdata.  So it's wrong until data comes back.  No problem.
	? Use a flag during reset, turn it off in the map onidle
		flag options
			qm is 'search'
			event suspend

What happens when readdata and dataready overlap?
	right now, nothing
	in the case of incremental read, we need the outstanding packet
	in the case of replace, we can drop the outstanding packet and wait for the new request
		but that's not necessary.  It's also ok to process the intermediate request	
	on data ready, delete request and do merge pending
	then proceed with qualify and publish

Dropped data requests leave a big hole in the timeline
	retry?
	net:ERR_CONNECTION_TIMED_OUT
	before implementing retry
		go to xhr
		implement origin-allowed, so we can test locally

Dispatch panning algorithm
	supports only panning in increment of one screen span		
	When we scroll time with zoombar, we get much larger span
	Do we keep filling the timeline, changing maxdots?
	Do we leave holes?
	Do we clear and start over?
	The trigger is: distance between request and databuffer.
*/


/**
 * Create a new Dispatch object.
 * @class Represents a Dispatch object.  Handle server data requests.
 */
voyc.Dispatch = function() {
	this.timeMostRecentRequest = null;
	this.timeMostRecentDetail = null;
	this.data = {};
	this.recordCount = 0;
	this.bounds = new voyc.Bounds();
	this.initialized = {
		map:false,
		time:false
	}
	this.maxrows = 300;
	this.thresholdMultiplier = 0.10;
	this.requests = {};

	// for developers
	this.divInternals = null;
	this.divOptions = null;
}

voyc.Dispatch.svcBase = 'svc/';
voyc.Dispatch.searchName = 'search';
voyc.Dispatch.searchCallbackName = 'voyc.voyc.dispatch.dataReady';
voyc.Dispatch.detailName = 'get';
voyc.Dispatch.detailCallbackName = 'voyc.voyc.dispatch.detailReady';

voyc.Dispatch.prototype = {
	/**
	 * Create object.
	 */
	create: function() {
		var self = this;
		voyc.event.subscribe('map_initialized', 'dispatch', function(evt,pub,obj) {self.startup(evt,pub,obj)});
		voyc.event.subscribe('time_initialized', 'dispatch', function(evt,pub,obj) {self.startup(evt,pub,obj)});
		voyc.event.subscribe('map_zoomed', 'dispatch', function(evt,pub,obj) {self.mapZoomed(evt,pub,obj)});
		voyc.event.subscribe('map_moved', 'dispatch', function(evt,pub,obj) {self.mapPanned(evt,pub,obj)});
		voyc.event.subscribe('time_movestarted', 'dispatch', function(evt,pub,obj) {self.timePanned(evt,pub,obj)});
		voyc.event.subscribe('time_moved', 'dispatch', function(evt,pub,obj) {self.timePanned(evt,pub,obj)});
		voyc.event.subscribe('time_zoomed', 'dispatch', function(evt,pub,obj) {self.timeZoomed(evt,pub,obj)});
		voyc.event.subscribe('time_zoomstarted', 'dispatch', function(evt,pub,obj) {self.timeZoomed(evt,pub,obj)});
		voyc.event.subscribe("story_selected", "dispatch", function(evt,pub,obj) {self.readDetail(evt,pub,obj);});
		voyc.event.subscribe("story_disqualified", "dispatch", function(evt,pub,obj) {self.disqualifyStory(evt,pub,obj);});
		voyc.event.subscribe('query_search', 'dispatch', function(evt,pub,obj) {self.onSearch(evt,pub,obj);});
		voyc.event.subscribe('internals_opened', 'dispatch', function(evt,pub,obj) {self.setInternals(evt,pub,obj);});
	},

	/**
	 * Voyc Event Handler.
	 */
	startup: function(evt,pub,obj) {
		// during initialization, wait for two events
		if (evt == 'map_initialized') {
			this.bounds = voyc.mergeOptions(this.bounds,obj.bounds);
			this.initialized.map = true;
		}
		if (evt == 'time_initialized') {
			this.bounds = voyc.mergeOptions(this.bounds, obj.bounds);
			//this.bounds.timelevel = obj.timedatalevel;  // temporary
			this.initialized.time = true;
		}

		// reset this.bounds, it was used temporarily
		if (this.initialized.map && this.initialized.time) {
			voyc.debug.alert('First server data call');
			var bounds = new voyc.Bounds(this.bounds);
			this.readData(bounds,evt);
		}
	},

	/**
	 * Voyc Event Handler.
	 * When panning time, the begin/end bounds of this.bounds get stretched
	 * wider than the onscreen timeline bounds.
	 * We proceed to readdata only when the panning has passed a threshold.
	 * The bounds we send to readdata is incremental.
	 */
	timePanned: function(evt,pub,obj) {
		var requestBounds = obj.bounds;
		var span = requestBounds.end - requestBounds.begin;
		var threshold = (span * this.thresholdMultiplier);
		var change = false;

		// create an incremental bounds request, starting with current databuffer bounds
		var incrBounds = new voyc.Bounds(this.bounds);

		// panning back in time
		if (requestBounds.begin < (this.bounds.begin)) {
			if (requestBounds.begin < (this.bounds.begin+threshold)) {
				incrBounds.begin = Math.min(requestBounds.begin, this.bounds.begin - span);
				incrBounds.end = this.bounds.begin;
				this.bounds.begin = incrBounds.begin;
				change = true;
			}
		}

		// panning forward in time
		else if (requestBounds.end > this.bounds.end-threshold) {
			incrBounds.end = Math.max(requestBounds.end, this.bounds.end + span);
			incrBounds.begin = this.bounds.end;
			this.bounds.end = incrBounds.end;
			change = true;
		}

		if (change) {
			this.readData(incrBounds,evt);
		}
	},

	/**
	 * Voyc Event Handler.
	 */
	timeZoomed: function(evt,pub,obj) {
		if (obj.reset) return;
		this.bounds = voyc.mergeOptions(this.bounds,obj.bounds);
		this.readData(this.bounds,evt);
	},

	/**
	 * Voyc Event Handler.
	 */
	mapPanned: function(evt,pub,obj) {
		if (obj.reset) return;
		this.bounds = voyc.mergeOptions(this.bounds,obj.bounds);
		this.readData(this.bounds,evt);
	},

	/**
	 * Voyc Event Handler.
	 */
	mapZoomed: function(evt,pub,obj) {
		if (obj.reset) return;
		this.bounds = voyc.mergeOptions(this.bounds,obj.bounds);
		this.readData(this.bounds,evt);
	},

	onSearch: function(evt,pub,obj) {
		this.bounds = voyc.mergeOptions(this.bounds,obj.bounds);
		this.readData(this.bounds,evt);
	},

	/**
	 * Call the server to request data.
	 */
	readData : function(bounds,evt) {
		if (!(this.initialized.map && this.initialized.time)) {
			return;
		}

		this.timeMostRecentRequest = new Date().getTime();
		var rf = this.timeMostRecentRequest;
		var url = this.composeURL(bounds, rf);
		this.requests[rf] = {evt:evt,bounds:bounds,url:url};

		// create a script object and load it into the dom
		voyc.appendScript(url,rf);

		obj = {
			rf:rf,
			bounds: bounds
		};
		voyc.event.publish('data_requested', 'dispatch', obj);
	},

	composeURL: function(bounds,rf) {
		var url = voyc.Dispatch.svcBase + voyc.Dispatch.searchName;
		url += '?rf=' + rf;
		url += (bounds.begin) ? '&begin=' + bounds.begin : '';
		url += (bounds.end) ? '&end=' + bounds.end : '';
		url += (bounds.timecenter) ? '&ctime=' + bounds.timecenter : '';
		url += (bounds.timedatalevel) ? '&tl=' + bounds.timedatalevel : ''; 
		url += (bounds.n) ? '&n=' + bounds.n : ''; 
		url += (bounds.s) ? '&s=' + bounds.s : ''; 
		url += (bounds.e) ? '&e=' + bounds.e : ''; 
		url += (bounds.w) ? '&w=' + bounds.w : ''; 
		url += (bounds.maplevel) ? '&ml=' + bounds.maplevel : ''; 
		url += (bounds.q) ? '&q=' + bounds.q : '';
		url += (bounds.qm) ? '&qm=' + bounds.qm : '';
		url += '&max=' + String((bounds.timemaxdots) ? bounds.timemaxdots : this.maxrows);
		url += '&callback=' + voyc.Dispatch.searchCallbackName;
		return url;
	},

	/**
	 * Callback.  Called by the script returned from the server.
	 */
	dataReady : function(obj) {
		voyc.debug.alert(['Dispatch.dataReady received']);
		var datarows = obj.data;
		var rf = obj.rf;
		var numrows = obj.count;
		var responsebounds = obj.bounds; 
		var executionTime = obj.executionTime;
		var event = this.requests[rf].evt;
		var requestbounds = this.requests[rf].bounds;

		if (rf < this.timeMostRecentRequest) {
			var scrpt = document.getElementById(rf);
			document.getElementsByTagName('head')[0].removeChild(scrpt);
			voyc.debug.alert(['Dispatch.dataReady, late packet discarded, numrows', numrows]);
			return;
		}
		voyc.debug.alert(['Dispatch.dataReady numrows',numrows]);

		// bring new records into dataset with merge or replace
		if (responsebounds.qm == 's') {
			this.bounds = voyc.mergeOptions(this.bounds,responsebounds);
			this.bounds.qm = 'f';
			this.replaceDataset(datarows);
		}
		if (this.requests[rf].evt == 'time_zoomed') {
			this.replaceDataset(datarows);
		}
		else {
			this.mergeDataset(datarows);
		}

		// let all subscribers know data has refreshed
		voyc.event.publish('data_ready', 'dispatch', {data:this.data, bounds:responsebounds});

		// remove all non-qualified records
		var total = 0;
		var remaining = 0;
		for (id in this.data) {
			total++;
			if (this.data[id].q) {
				remaining++;
			}
			else {
				delete this.data[id];
			}
		}
		voyc.debug.alert(['Dispatch.dataReady, data refresh complete, total, remaining', total, remaining]);
		this.recordCount = remaining;
		this.drawInternals();

		// remove this script from the head		
		var scrpt = document.getElementById(rf);
		document.getElementsByTagName('head')[0].removeChild(scrpt);
		delete this.requests[rf];
	},
 
	/**
	 * Replace the data in the databuffer with the incoming response.
	 */
	replaceDataset: function(datarows) {
		// mark all current records unqualified
		for (id in this.data) {
			this.data[id].q = false;
		}

		// insert and mark all new records qualified
		for (id in datarows) {
			if (!this.data[id]) {
				this.data[id] = datarows[id];
				this.data[id].id = id;
				this.data[id].ms = null;
				this.data[id].ts = null;
			}
			this.data[id].q = true;
		}
	},

	/**
	 * Merge incoming response data into the databuffer.
	 */
	mergeDataset: function(datarows) {
		// merge new records into the data array
		for (id in datarows) {
			if (!this.data[id]) {
				this.data[id] = datarows[id];
				this.data[id].id = id;
				this.data[id].ms = null;
				this.data[id].ts = null;
			}
		}
		this.requalify();
	},

	/**
	 * Requalify all records.
	 */
	requalify: function() {
		for (id in this.data) {
			this.data[id].q = this.qualify(this.data[id]);
		}
	},

	/**
	 * Return true if the record is qualified.
	 */
	qualify: function(record) {
		var timespan = (record.b <= this.bounds.end
			&& record.e >= this.bounds.begin);
		var latspan = record.gs <= this.bounds.n
			&& record.gn >= this.bounds.s;

		var lngspan = false;
		if (this.bounds.w < this.bounds.e) {
			lngspan = record.ge >= this.bounds.w
				&& record.gw <= this.bounds.e;
		}
		else {
			lngspan = (record.gw <= 180 && record.ge > this.bounds.w)
				|| (record.gw <= this.bounds.e && record.ge > -180);
		}
		
		var optq = voyc.options.dtstats[record.dt].show;

		var timelevel = (this.bounds.timedatalevel) ?
			(record.tll <= this.bounds.timedatalevel && this.bounds.timedatalevel <= record.tlh) : true;
		var maplevel = (this.bounds.maplevel) ?
			(record.mll <= this.bounds.maplevel && this.bounds.maplevel <= record.mlh) : true;

		return (timespan && latspan && lngspan && optq && timelevel && maplevel);
	},

	/**
	 * Event handler.
	 */
	disqualifyStory: function(event,pub,obj) {
		var record = obj.record;
		record.q = false;
	},

	/**
	 * Call the server to read details of a record.
	 */
	readDetail: function(evt,pub,obj) {
		var id = obj.record.id;
		// compose url
		this.timeMostRecentDetail = new Date().getTime();
		var rf = this.timeMostRecentDetail;
		var url = voyc.Dispatch.svcBase + voyc.Dispatch.detailName;
		url += '?rf=' + rf;
		url += '&id=' + id;
		//url += '&token=' + voyc.user.token;
		url += '&callback=' + voyc.Dispatch.detailCallbackName;

		// create a script object and load it into the dom
		voyc.appendScript(url,rf);
		obj = {
			id:id,
			rf:rf
		};
		voyc.event.publish('detail_requested', 'dispatch', obj);
	},

	/**
	 * Event Handler.  Details of a record have been received from the server.
	 * @event
	 */
	detailReady: function(o) {
		var record = o.record;
		var id = o.record.id;
		var rf = o.rf;
		var state = o.state;
		var executionTime = o.executionTime;

		// after an insert, the record is not in memory yet, so add it
		if (!this.data[id]) {
			this.data[id] = {};
		}

		// copy the input record to memory
		var x = this.data[id];

		// these have already been provided by the search results
		x.h = record.h;
		x.b = record.b;
		x.e = record.e;
		x.c = record.c;
		x.f = record.f;
		x.gn = record.gn,
		x.gs = record.gs,
		x.ge = record.ge,
		x.gw = record.gw,
		x.mlh = record.mlh,
		x.mll = record.mll,
		x.tlh = record.tlh,
		x.tll = record.tll,
		x.mt = record.mt,
		x.tt = record.tt,
		x.tu = record.tu,
		x.p = record.p,

		// these are additional provided by get
		x.id = record.id;
		x.v = record.v;
		x.s = record.s;
		x.su = record.su;
		x.iu = record.iu;
		x.t = record.t;
		x.src = record.src;
		x.plc = record.plc;
		x.aut = record.aut;
		x.dt = record.dt;
		x.prec = record.prec;
		x.mag = record.mag;
		x.vote = record.vote;

		//x.wb = new voyc.When(x.b, x.prec);
		x.wb = new voyc.When(x.b, voyc.When.precision.MINUTE);
		x.we = new voyc.When(x.e, x.prec);
		
		var obj = {
			id:id,
			record:x
		}
		voyc.event.publish('detail_ready', 'dispatch', obj);

		// remove this script from the head		
		var scrpt = document.getElementById(rf);
		document.getElementsByTagName('head')[0].removeChild(scrpt);
	},

	/**
	 * Voyc Event Handler.  User has opened internals window.
	 *	obj contains two members
	 *		div: internals div.  Add components to this.
	 *		classname: internals component classname.
	 */
	setInternals: function(evt,pub,obj) {
		this.divInternals = document.createElement('div');
		this.divInternals.className = obj.classname;
		this.divInternals.id = 'internals-dispatch';
		obj.div.appendChild(this.divInternals);
		this.drawInternals();

		// add an options view
		this.divOptions = document.createElement('div');
		this.divOptions.className = obj.classname;
		this.divOptions.id = 'internals-options';
		obj.div.appendChild(this.divOptions);
	
		// draw datatype table
		var s = '';
		s += '<div><h3>Options</h3>';
		s += '<table>';
		var stat;
		for (var dt in voyc.options.dtstats) {
			stat = voyc.options.dtstats[dt];
			s += '<tr>';
			s += '<td><input type="checkbox" id="option-dt-'+dt+'" dt="'+dt+'"/></td>';
			s += '<td>'+stat.name+'</td>';
			s += '<td><span id="option-dt-cnt-total-'+dt+'">'+stat.cntTotal+'</span></td>';
			s += '<td><span id="option-dt-cnt-qualified-'+dt+'">'+stat.cntQualified+'</span></td>';
			s += '<td><span id="option-dt-cnt-onscreen-'+dt+'">'+stat.cntOnscreen+'</span></td>';
			s += '</tr>';
		}
		s += '</table>';
		s += '<input type="checkbox" id="option-disqualify-overlaps"/>Disqualify overlapping timeline bars<br/>';
		s += '<input type="checkbox" id="option-open-internals"/>Open internals window on startup<br/>';
		s += '<input type="checkbox" id="option-developer-detail"/>Show developer info in detail window<br/>';
		s += '<input type="checkbox" id="option-dispatch-merge"/>Use merge algorithms during dispatch<br/>';
		s += '</div>';
		this.divOptions.innerHTML = s;

		// bind checkbox handlers for datatypes
		var self = this;
		var cb;
		for (var dt in voyc.options.dtstats) {
			cb = voyc.$('option-dt-'+dt);
			cb.checked = (voyc.options.dtstats[dt].show) ? true : false;
			voyc.addEvent(cb, 'change', function() {
				var dt = this.getAttribute('dt');
				voyc.options.dtstats[dt].show = this.checked;
				self.readData(self.bounds,'options_changed');
			});
		}
	
		// bind checkbox handlers for other options
		cb = voyc.$('option-disqualify-overlaps');
		cb.checked = (voyc.options.bDisqualifyOverlaps) ? true : false;
		voyc.addEvent(cb, 'change', function() {
			voyc.options.bDisqualifyOverlaps = this.checked;
		});

		cb = voyc.$('option-open-internals');
		cb.checked = (voyc.options.bOpenInternals) ? true : false;
		voyc.addEvent(cb, 'change', function() {
			voyc.options.bOpenInternals = this.checked;
		});

		cb = voyc.$('option-developer-detail');
		cb.checked = (voyc.options.bDeveloperDetail) ? true : false;
		voyc.addEvent(cb, 'change', function() {
			voyc.options.bDeveloperDetail = this.checked;
		});

		cb = voyc.$('option-dispatch-merge');
		cb.checked = (voyc.options.bDispatchMerge) ? true : false;
		voyc.addEvent(cb, 'change', function() {
			voyc.options.bDispatchMerge = this.checked;
		});
	},

	/**
	 * For developers.  Re-draw the internals div.
	 */
	drawInternals: function(count) {
		if (this.divInternals) {
			var s = this.bounds.toString();
			s += this.recordCount + ' records: ';
			for (var id in this.data) {
				//s += '<a href=\'javascript:voyc.event.publish("story_selected", "internals", {record:voyc.voyc.dispatch.data['+id+']})\'>';
				s += '<a href="javascript:return(0)" id="dev_'+id+'" voycid="'+id+'">';
				s += id;
				s += '</a> ';
			}
			this.divInternals.innerHTML = s;

			// bind hover and click handlers
			var self = this;
			var ah;
			for (var id in this.data) {
				ah = voyc.$('dev_'+id);
				voyc.addEvent(ah, 'mouseover', function(e) {
					var id = e.srcElement.getAttribute('voycid');
					voyc.event.publish('story_hovered', 'internals', {state:'on', record:self.data[id]});
				});
				voyc.addEvent(ah, 'mouseout', function(e) {
					var id = e.srcElement.getAttribute('voycid');
					voyc.event.publish('story_hovered', 'internals', {state:'off', record:self.data[id]});
				});
				voyc.addEvent(ah, 'click', function(e) {
					var id = e.srcElement.getAttribute('voycid');
					voyc.event.publish('story_selected', 'internals', {state:'off', record:self.data[id]});
				});
			}
		}

		if (this.divOptions) {
			// reset stats
			for (var dt in voyc.options.dtstats) {
				voyc.options.dtstats[dt].cntTotal = 0;
				voyc.options.dtstats[dt].cntQualified = 0;
				voyc.options.dtstats[dt].cntOnscreen = 0;
			}

			// count stats
			var record;
			for (var i in this.data) {
				record = this.data[i];
				voyc.options.dtstats[record.dt].cntTotal++;
				if (record.q) {
					voyc.options.dtstats[record.dt].cntQualified++;
					voyc.options.dtstats[record.dt].cntOnscreen++;
				}
			}

			// draw stats
			var stat;
			for (var dt in voyc.options.dtstats) {
				stat = voyc.options.dtstats[dt];
				voyc.$('option-dt-cnt-total-'+dt).innerHTML = stat.cntTotal;
				voyc.$('option-dt-cnt-qualified-'+dt).innerHTML = stat.cntQualified;
				voyc.$('option-dt-cnt-onscreen-'+dt).innerHTML = stat.cntOnscreen;
			}
		}
	}
}
