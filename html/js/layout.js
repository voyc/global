/**
 * UI layout manager.
 *
 * Publishes two events: window_resizing, window_resized.
 * Clients have the choice to subscribe to either one.
 *	@constructor
 */
voyc.Layout = function() {
	this.resizing = null;
	this.knob = {
		point: {x:0,y:0},
		pct: {x:0.66,y:0.66},
		offset:6,
		e:null,
		dragging:false
	};

	// constants
	this.dividerWidth = 7;
	this.dashboardHeight = 50;

	this.panel = '';
	this.divPanel = null;
}

voyc.Layout.prototype = {
	/**
	 * Initial setup.  Instantiate all objects.
	 */
	create: function() {
		this.panel = 'welcome';
		this.divPanel = voyc.$(this.panel);
		voyc.$('welcomelinks').style.display = 'none';

		// initialize the knob
		this.knob.e = voyc.$('knob');

		this.knob.point.x = voyc.$('tmap').offsetWidth;
		this.knob.point.y = voyc.$('tmap').offsetHeight;

		var cliW = document.body.clientWidth;
		var cliH = document.body.clientHeight;
		this.knob.point.x = Math.floor(cliW * this.knob.pct.x);
		this.knob.point.y = Math.floor(cliH * this.knob.pct.y);

		this.knob.e.style.left = this.knob.point.x - this.knob.offset + 'px';
		this.knob.e.style.top = this.knob.point.y - this.knob.offset + 'px';
		this.knob.e.style.display = "block";

		// we used the table width and height pcts only for the startup layout
		voyc.removeClass(voyc.$('tlayout'),'startup');
		voyc.removeClass(voyc.$('tmap'),'startup');
		voyc.removeClass(voyc.$('tdetail'),'startup');

		// now we set div sizes with javascript
		this.layout();

		// handle mouse events
		var self = this;
		voyc.addEvent(this.knob.e, 'mouseover', function() {
			if (!self.knob.dragging) {
				self.knob.e.style.backgroundPosition = "0px -17px"; 
				self.knob.e.style.cursor = 'pointer';
			}
		});
		voyc.addEvent(this.knob.e, 'mouseout', function () {
			if (!self.knob.dragging) {
				self.knob.e.style.backgroundPosition = "0px 0px"; 
				self.knob.e.style.cursor = 'default';
			}
		});

		// setup drag
		voyc.dragger.enableDrag(this.knob.e);
		voyc.dragger.addListener( this.knob.e, 'grab', function(x,y) {
			self.knob.e.style.backgroundPosition = "0px -17px"; 
			self.knob.e.style.cursor = 'move';
			self.knob.dragging = true;
		});
		voyc.dragger.addListener( this.knob.e, 'drag', function(x,y) {
			self.knob.point.x = x + self.knob.offset;
			self.knob.point.y = y + self.knob.offset;
			self.layout();
			return {x:x,y:y};
		});
		voyc.dragger.addListener( this.knob.e, 'drop', function(x,y) {
			self.knob.e.style.backgroundPosition = "0px -17px";
			self.knob.e.style.cursor = 'default';
			self.knob.dragging = false;
			self.resizing = setTimeout(function() {self.onResizeEnd()}, 100);
			var cliW = document.body.clientWidth;
			var cliH = document.body.clientHeight;
			self.knob.pct.x = self.knob.point.x / cliW;
			self.knob.pct.y = self.knob.point.y / cliH;
		});

		// global measurements
		var sd = this.getScreenDimensions();
		this.pixelsPerCM = sd.pixelsPerCM;
		this.pixelsPerEMHeight = sd.emHeight;
	},

	/**
	 * Set widths and heights of major divs: map, timeline, detail.
	 * This is called from three places: create, resize, knob drag.
	 */
	layout: function() {
		var cliW = document.body.clientWidth;
		var cliH = document.body.clientHeight;
		voyc.$('map').style.width = this.knob.point.x + 'px';
		voyc.$('map').style.height = this.knob.point.y + 'px';
		voyc.$('detail').style.width = cliW - this.knob.point.x - this.dividerWidth + 'px';
		voyc.$('detail').style.height = this.knob.point.y + 'px';
		voyc.$('timeline').style.height = cliH - this.knob.point.y - this.dashboardHeight + 'px';
	},

	/**
	 * DOM Event Handler.  Called when the user changes the size of the browser window.
	 */
	resize : function() {
		var cliW = document.body.clientWidth;
		var cliH = document.body.clientHeight;
		//voyc.$('internals-wid').innerHTML = cliW;
		//voyc.$('internals-ht').innerHTML = cliH;
		this.knob.point.x = Math.round(cliW * this.knob.pct.x);
		this.knob.point.y = Math.round(cliH * this.knob.pct.y);
		this.knob.e.style.left = this.knob.point.x - this.knob.offset + 'px';
		this.knob.e.style.top = this.knob.point.y - this.knob.offset + 'px';
		this.layout();

		if (this.resizing) {
			clearTimeout(this.resizing);
		}
		var self = this;
		this.resizing = setTimeout(function() {self.onResizeEnd()}, 500);
		voyc.event.publish('window_resizing','layout',null);
	},
	/**
	 * Fake Event Handler.  
	 * Called after user resizing has stopped.
	 * Also called on knob drop.
	 */
	onResizeEnd : function() {
		this.resizing = null;
		voyc.event.publish('window_resized','layout',null);
	},

	/**
	 * The so-called "detail" div can contain any number of detail components.
	 * Not to be confused with the Detail object, which manages the primary detail div.
	 * detail div
	 * detail object
	 * detail panel
	 * meta panel
	 * meta
	 * panel
	**/
	switchPanel: function(s) {
		this.panel = s;
		this.divPanel.style.display = 'none';
		this.divPanel = voyc.$(this.panel);
		this.divPanel.style.display = 'block';
	},

	/**
	 * Use a temporary div to get drawing values:
	 *   pixels per CM
	 *   pixels per height of em
	 * Future: these dimensions should change on user magnification.
	**/
	getScreenDimensions: function() {
		// create div at width 10 cm
		var times = 10;
		var div = document.createElement('div');
		div.style.position = 'absolute';
		div.style.top = 0-2*times+'cm';
		div.style.left = 0-2*times+'cm';
		div.style.width = times+'cm';
		div.style.height = '1em';
		document.getElementsByTagName('body')[0].appendChild(div);
		var w = div.offsetWidth;
		var h = div.offsetHeight;
		var pxPerCM = Math.floor(w / times);
		div.parentNode.removeChild(div);
		return {pixelsPerCM:pxPerCM, emHeight:h};
	}
}
