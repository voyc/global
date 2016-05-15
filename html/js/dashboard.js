// (c) Copyright 2008, 2014 voyc.com
/**
 * Creates a Dashboard Object.
 * @constructor
 * @param {HTMLElement} e The HTML element to contain the Dashboard.
 *
 * @class
 * Manages the Dashboard UI element, the slider, lcd, logo, etc.
 */
voyc.Dashboard = function(e) {
	this.e = null;
	this.timecenter = null;
	this.lcdPattern = '';
	this.divInternals = null;
	this.divLog = null;
	this.divMenu = null;
	this.divSearch = null;
	this.q = '';
	this.qm = '';
}

voyc.language = 'en';
voyc.string = {};
voyc.string.en = {
	defaultSearch: 'Search...'
};

voyc.Dashboard.prototype = {
	/**
	 * Create the object.
	 */
	create : function(bounds) {
		this.timecenter = new voyc.When(bounds.timecenter);
		this.lcdtext = voyc.$('db-lcd');
		this.searchbox = voyc.$('db-searchbox');

		// Voyc events
		var self = this;
		voyc.event.subscribe('time_initialized', 'dashboard', function(evt,pub,obj) {self.onTimeEvent(evt,pub,obj);});
		voyc.event.subscribe('time_moved', 'dashboard', function(evt,pub,obj) {self.onTimeEvent(evt,pub,obj);});
		voyc.event.subscribe('time_zoomed', 'dashboard', function(evt,pub,obj) {self.onTimeEvent(evt,pub,obj);});
		voyc.event.subscribe('time_animated', 'dashboard', function(evt,pub,obj) {self.onTimeEvent(evt,pub,obj);},false);
		voyc.event.subscribe('data_requested', 'dashboard', function(evt,pub,obj) {self.onDataRequested(evt,pub,obj);});
		voyc.event.subscribe('data_ready', 'dashboard', function(evt,pub,obj) {self.onDataReady(evt,pub,obj);});
		voyc.event.subscribe('window_resizing', 'dashboard', function(evt,pub,obj) {self.resize(evt,pub,obj);});

		// DOM events
		voyc.addEvent(voyc.$('db-searchbtn'), 'click', function() {
			self.doSearch('s');
		});
		voyc.addEvent(voyc.$('db-searchcancel'), 'click', function() {
			self.enableSearchInput(false);
			self.doSearch('f');
		});
		voyc.addEvent(voyc.$('db-searchoptbtn'), 'click', function() {
			self.openSearchOpt(true);
		});
		voyc.addEvent(voyc.$('db-searchinput'), 'keyup', function(event) {
			if (event.keyCode == 13) {  // return key
				self.doSearch('s');
			}
		});
		voyc.addEvent(voyc.$('db-menu'), 'click', function() {
			self.openMenu(true);
		});

		this.addButtonEvents(voyc.$('db-menu'));
		this.addButtonEvents(voyc.$('db-searchbtn'));
		this.addButtonEvents(voyc.$('db-searchoptbtn'));

		voyc.addEvent(voyc.$('db-searchinput'), 'focus', function(event) {
			self.enableSearchInput(true);
		});
		voyc.addEvent(voyc.$('db-searchinput'), 'blur', function(event) {
			if (voyc.$('db-searchinput').value == '') {
				self.enableSearchInput(false);
			}
		});


		
		// these were hidden during startup
		voyc.$('db-loader').style.display = 'inline';
		voyc.$('db-menu').style.display = 'block';
		voyc.$('db-searchbox').style.display = 'block';
		voyc.$('db-searchcancel').style.display = 'block';
		voyc.$('db-searchoptbtn').style.display = 'block';
		voyc.$('db-searchbtn').style.display = 'block';

		this.resize();
		this.draw();

		if (voyc.options.bOpenInternals) {
			this.openInternals(true);
			var s = this.divInternals.style;
			var pt = voyc.getAbsolutePosition(voyc.$('detail'));
			s.top = pt.y + 'px';
			s.left = (pt.x - 200) + 'px';
			s.width = '400px';
			s.height = '400px'; 
		}
	},

	/**
	 * Toggle styles to enable or disable the search input field.
	 */
	enableSearchInput: function(enable) {
		if (enable) {
			voyc.addClass(voyc.$('db-searchcancel'), 'enabled');
			voyc.addClass(voyc.$('db-searchbox'), 'enabled');
			voyc.addClass(voyc.$('db-searchinput'), 'enabled');
			if (voyc.$('db-searchinput').value == voyc.string[voyc.language].defaultSearch) {
				voyc.$('db-searchinput').value = '';
			}
		}
		else {
			voyc.removeClass(voyc.$('db-searchcancel'), 'enabled');
			voyc.removeClass(voyc.$('db-searchbox'), 'enabled');
			voyc.removeClass(voyc.$('db-searchinput'), 'enabled');
			voyc.$('db-searchinput').value = voyc.string[voyc.language].defaultSearch;
		}
	},

	/**
	 * Add mouse events for button behavior.
	 */
	addButtonEvents: function(e) {
		voyc.addEvent(e, 'mouseover', function() {voyc.addClass(e,'btnover');});
		voyc.addEvent(e, 'mouseout', function() {voyc.removeClass(e,'btnover');});
		voyc.addEvent(e, 'mousedown', function() {voyc.addClass(e,'btndown');});
		voyc.addEvent(e, 'mouseup', function() {voyc.removeClass(e,'btndown');});
	},

	/**
	 * Do a search.
	 */
	doSearch: function(qm) {
		var s = voyc.$('db-searchinput').value;
		if (!s) {
			return;
		}
		if (s == voyc.string[voyc.language].defaultSearch) {
			s = '';
		}

		var commandProcessed = this.processCommand(s);
		if (!commandProcessed) {
			this.q = s;
			this.qm = qm;
			voyc.event.publish( 'query_search', 'dashboard', {bounds:{q:this.q,qm:this.qm}});
		}
	},

	/**
	 * Show the advanced search box.
	 */
	openSearchOpt: function(bshow) {
		if (bshow) {
			var pt = voyc.getAbsolutePosition(voyc.$('searcher'));
			var wid = voyc.$('searcher').offsetWidth;
			wid -= 22; // less padding, border, shadow
			if (!this.divSearch) {
				var d = document.createElement('div');
				d.id = 'searchopt';
				d.innerHTML = voyc.Dashboard.searchopt_content;
				voyc.$('meta').appendChild(d);
				this.divSearch = d;
				
				var self = this;
				voyc.addEvent(voyc.$('searchoptclose'), 'click', function() {self.openSearchOpt(false)});
				voyc.addEvent(voyc.$('searchoptgo'), 'click', function() {self.openSearchOpt(false)});
			}

			this.divSearch.style.display = 'block';
			this.divSearch.style.width = wid + 'px';
			this.divSearch.style.left = pt.x + 'px';
			var ht = Math.min(this.divSearch.offsetHeight, document.body.clientHeight);
			var top = document.body.clientHeight - ht;
			this.divSearch.style.height = ht + 'px';
			this.divSearch.style.top = top + 'px';
			this.populateSearchOpt();
		}
		else {
			this.divSearch.style.display = 'none';
			this.dePopulateSearchOpt();
		}
	},

	/**
	 * Populate the fields of the SearchOpt dialog.
	 */
	populateSearchOpt: function() {
		clearField = function(label) {
			voyc.$(label).value = '';
		};
		
		addWord = function(label,word) {
			var v = voyc.$(label).value;
			if (v) {
				v += ' ';
			} 
			v += word;
			voyc.$(label).value = v;
		};
		
		var s = voyc.$('db-searchinput').value;
		if (!s || s == voyc.string[voyc.language].defaultSearch) {
			return;
		}

		clearField('so-include');
		clearField('so-exclude');
		clearField('so-tag');
		clearField('so-source');
		clearField('so-author');
		clearField('so-contributor');

		// split s on space
		var a = s.split(' ');
		
		// look for minus sign
		var b;
		for (var i=0; i<a.length; i++) {
			if (a[i].substr(0,1) == '-') {
				addWord('exclude', a[i].substr(1));
			}
			else {
				var b = a[i].split(':');
				if (b[1]) {
					addWord(b[0], b[1]);
				}
				else {
					addWord('include', a[i]);
				}
			}
		}
	},

	/**
	 * Compose a search string from the fields of the SearchOpt dialog.
	 */
	dePopulateSearchOpt: function() {

		addField = function(label, prefix) {
			var s = '';
			var v = voyc.$(label).value;
			var a = v.split(' ');
			for (var i=0; i<a.length; i++) {
				if (a[0]) {
					s += prefix + a[i];
					s += ' ';
				}
			}
			return s;
		}

		var s = '';
		s += addField('so-include', '');
		s += addField('so-exclude', '-');
		s += addField('so-tag', 'tag:');
		s += addField('so-source', 'source:');
		s += addField('so-author', 'author:');
		s += addField('so-contributor', 'contributor:');

		voyc.$('db-searchinput').value = s;
		this.enableSearchInput(true);
	},

	/**
	 * Show the menu.
	 */
	openMenu: function(bshow) {
		var pt = voyc.getAbsolutePosition(voyc.$('db-menu'));
		if (!this.divMenu) {
			this.divMenu = voyc.card.create({
				top:pt.y + 'px',
				left:pt.x + 'px',
				title:'',
				id:'card-menu',
				content:'',
				className:'menu',
				draggable:false,
				resizeable:false,
				closeOnBlur:true,
				hasHandle:false,
				hasCloseButton:false,
				parentNode:voyc.$('meta')
			});
			var contentdiv = voyc.$('card-menu-content');
			
			var content = "" +
				"<div id='menu-now' class='menuitem'>Now</div>" +
				"<div id='menu-world' class='menuitem'>World</div>" +
				"<div id='menu-about' class='menuitem'>About Us</div>";

			contentdiv.innerHTML = content;

			var self = this;
			voyc.addEvent(voyc.$('menu-now'), 'mousedown', function() { self.doMenu('now');});
			voyc.addEvent(voyc.$('menu-world'), 'mousedown', function() { self.doMenu('world');});
			voyc.addEvent(voyc.$('menu-about'), 'mousedown', function() { self.doMenu('about');});

			voyc.debug.alert('menu initialized');
		}
		this.divMenu.style.display = (bshow) ? 'block' : 'none';
		this.divMenu.style.top = pt.y + 'px';
		this.divMenu.style.left = pt.x + 'px';
	},

	/**
	 * Execute a menu item.
	 */
	doMenu : function(item) {
		//this.openMenu(false);
		voyc.debug.alert('domenu: ' + item);
		if (item == 'now') {
			voyc.voyc.timeline.animateTo(voyc.When.fromJSDate(new Date()), 0);
		}
		else if (item == 'world') {
			voyc.voyc.map.gmap.setZoom(voyc.voyc.map.level.getGoogleFromVoyc(18)),
			voyc.voyc.map.gmap.panTo(new google.maps.LatLng(20,0));
		}
		else if (item == 'about') {
			voyc.voyc.layout.switchPanel('welcome');
		}
	},

	/**
	 * Show/hide loader message.
	 */
	showLoader : function(bShow) {
		voyc.$('db-loader').style.display = (bShow) ? 'block' : 'none';
	},

	/**
	 * Event Handler.  Called when a read request has been sent to the server.
	 * @event
	 */
	onDataRequested : function(evt,pub,obj) {
		this.showLoader(true);
	},

	/**
	 * Event Handler.  Called when data request returns from the server.
	 * @event
	 */
	onDataReady : function(evt,pub,obj) {
		this.showLoader(false);
	},

	/**
	 * Event Handler.  Called when search keywords have changed.
	 * @event
	 */
	onSearchRequested : function(evt,pub,obj) {
		this.searchbox.value = obj.q;
	},

	onTimeEvent : function(evt,pub,obj) {
		this.timecenter.setDecidate(obj.bounds.timecenter);
		this.lcdPattern = obj.lcdpattern;
		this.draw();
	},

	/**
	 * Draw the time value in the lcd.
	 * @event
	 */
	draw : function() {
		this.lcdtext.innerHTML = this.timecenter.format(this.lcdPattern); //'default'
	},

	/**
	 * DOM Event Handler.  Called when the window is resized.
	 */
	resize : function() {
		// populate Dashboard bar depending on its width
		var cliW = document.body.clientWidth;
		voyc.$('db-copyright').style.display = (cliW < 777) ? 'none' : 'block';
		voyc.$('db-menu').style.display = (cliW < 583) ? 'none' : 'block';
		voyc.$('db-logo').style.display = (cliW < 483) ? 'none' : 'block';

		voyc.$('db-searchoptbtn').style.display = (cliW < 741) ? 'none' : 'block';
		voyc.$('db-searchbtn').style.display = (cliW < 600) ? 'none' : 'block';

		var searchon = (voyc.$('db-searchinput').value != voyc.string[voyc.language].defaultSearch);
		var searchboxThreshold = (searchon) ? 400 : 600;
		voyc.$('db-searchbox').style.display = (cliW < searchboxThreshold) ? 'none' : 'block';
		voyc.$('db-searchcancel').style.display = (cliW < searchboxThreshold) ? 'none' : 'block';

		if (this.divSearch) {
			this.divSearch.style.display = (cliW < 741) ? 'none' : 'block';
			if (this.divSearch.style.display == 'block') {
				var pt = voyc.getAbsolutePosition(voyc.$('searcher'));
				var wid = voyc.$('searcher').offsetWidth;
				wid -= 22; // less padding, border, shadow
				this.divSearch.style.width = wid + 'px';
				this.divSearch.style.left = pt.x + 'px';
				var ht = Math.min(this.divSearch.offsetHeight, document.body.clientHeight);
				var top = document.body.clientHeight - ht;
				this.divSearch.style.height = ht + 'px';
				this.divSearch.style.top = top + 'px';
			}
		}
	},

	/**
	 * Process developers commands.
	 */
	processCommand: function(s) {
		var r = false;
		if (s == 'voycLog') {
			this.openLog(true);
			r = true;
		}
		else if (s == 'voycInternals') {
			this.openInternals(true);
			r = true;
		}
		return r;
	},
		
	/**
	 * Open the internals window.  Developer's tool.
	 */
	openInternals: function(bshow) {
		if (!this.divInternals) {
			var pt = voyc.getAbsolutePosition(voyc.$('db-searchbox'));
			this.divInternals = voyc.card.create({
				top:pt.y + 'px',
				left:pt.x + 'px',
				title:'Internals',
				id:'card-internals',
				content:'',
				parentNode:voyc.$('meta')
			});
			var content = voyc.$('card-internals-content');

			voyc.event.publish('internals_opened', 'dashboard', {div:content, classname:'internals-component'});
		}
		this.divInternals.style.display = (bshow) ? 'block' : 'none';
	},

	/**
	 * Open the log window.  Developer's tool. Contains debug alerts.
	 */
	openLog: function(bshow) {
		if (!this.divLog) {
			var pt = voyc.getAbsolutePosition(voyc.$('db-searchbox'));
			this.divLog = voyc.card.create({
				top:pt.y + 'px',
				left:pt.x + 'px',
				title:'Log',
				id:'card-log',
				content:'',
				parentNode:voyc.$('meta')
			});
			var content = voyc.$('card-log-content');
			voyc.debug.setOptions({div:content});
			voyc.debug.alert('Dashboard.openLog log window initialized');
		}
		this.divLog.style.display = (bshow) ? 'block' : 'none';
	}
}

voyc.Dashboard.searchopt_content = ''+
'<div id=searchoptclose></div>'+
'<fieldset>'+
'<ol>'+
'<li>'+
'<input id=search name=qm type=radio checked>'+
'<label for=search>Search all time and space</label>'+
'</li>'+
'<li>'+
'<input id=filter name=qm type=radio>'+
'<label for=filter>Filter within current time and space</label>'+
'</li>'+
'</ol>'+
'</fieldset>'+
'<ol id=fields>'+
'<li>'+
'<label for=so-include>Has the words</label>'+
'<input id=so-include type=text>'+
'</li>'+
'<li>'+
'<label for=so-exclude>Doesn\'t have</label>'+
'<input id=so-exclude type=text>'+
'</li>'+
'<li>'+
'<label for=so-tag>Tag</label>'+
'<input id=so-tag type=text>'+
'</li>'+
'<li>'+
'<label for=so-source>Source</label>'+
'<input id=so-source type=text>'+
'</li>'+
'<li>'+
'<label for=so-author>Author</label>'+
'<input id=so-author type=text>'+
'</li>'+
'<li>'+
'<label for=so-contributor>Contributor</label>'+
'<input id=so-contributor type=text>'+
'</li>'+
'</ol>'+
'<button id=searchoptgo>search</button>';
