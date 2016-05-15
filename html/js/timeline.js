// (c) Copyright 2014 voyc.com
/**
 * Create a new Timeline object.
 * @class Represents a Timeline object.
 */
voyc.Timeline = function(e) {
	this.parentdiv = e || null;
	this.when = null;
	this.level = null;
	this.div = null;
	this.divScroller = null;
	this.divRuler = null;
	this.canvasRuler = null;
	this.ctxRuler = null;
	this.divVerticalContainer = null;
	this.divVertical = [];
	this.divRulerTime = [];
	this.divZoombar = null;
	this.divPlayhead = null;

	// background rows: variable height, depending on the number of rows
	// foreground rows: fixed height, number limited by height of container
	this.bkd = {
		div:null,
		rows:[],
		numRows:0,
		lastUsedRowNum:0
	};
	this.fgd = {
		div:null,
		rows:[],
		numRows:0,
		lastUsedRowNum:0
	};

	// constant
	this.minCenter = -3500;
	this.maxCenter = 2500;
	this.rulerHeight = 20;
	this.tickHeight = 3;
	this.superHeight = 6;

	this.zoombarHeight = 10;
	this.zoombarWingWidth = 10;
	this.zoombarMinimumThumbWidth = 10;
	this.zoombarMultiplier = 25;

	this.framesPerPan = {
		coarse:40,
		medium:8
	}
	this.pixelsPerFrame = 24;
	this.optCMPerPeriod = 3;
	this.minCMPerPeriod = 1;
	this.maxCMPerPeriod = 5;
	this.minPixelsPerTick = 6;
	this.minPixelsPerDotWidth = 75;
	this.optFramesPerAnimation = 64;
	this.maxFramesPerAnimation = 128;
	
	// screen dimensions, fixed, but we wish this would change on user magification
	this.optPixelsPerPeriod = 0;
	this.minPixelsPerPeriod = 0;
	this.maxPixelsPerPeriod = 0;

	// working
	this.grabYearsBegin = 0;
	this.grabZoombarThumbWidth = 0;
	this.playing = false;  // for playPause
	this.framecount = 0;  // for pan animation
	this.yearsPerFrame = 0;  // for pan animation
	this.zoomingDirection = 0;  // for zoom animation
	this.zoomingNextYPCM = 0;  // for zoom animation
	this.numVerticals = 0;
	this.firstVertical = 0;
	this.lastVertical = 0;
	this.tick = {};
	this.zoombarUniverse = {};
	this.zoombarResetIsDue = true;
	this.zoombarDragging = false;
	this.maxDots = 0;
	this.resetInProgress = false;

	// factors
	this.pixels = {
		perCM: 0.0,  // fixed, though in future it may vary by user magnification
		perPeriod: 0.0,
		perTick: 0.0,
		begin: 0.0,
		end: 0.0,
		width: 0.0,
		center: 0.0,
		verticals:[]
	};
	this.years = {
		perCM: 0.0,  // the bottom-line indicator of time zoom level
		perPeriod: 0.0,
		perTick: 0.0,
		begin: 0.0,
		end: 0.0,
		width: 0.0,
		center: 0.0,
		verticals:[]
	};
	this.ms = {
		perCM: 0.0,
		perPeriod: 0.0,
		perTick: 0.0,
		begin: 0.0,
		end: 0.0,
		width: 0.0,
		center: 0.0,
		verticals:[]
	};

	// for developers
	this.divInternals = null;
	this.divOptions = null;
}

voyc.datatype = {
	political:2,
	national:3,
	person:5,      // previously 6 greek
	work:6,        // previously greek
	headofstate:7, // previously person
	bigevent:8,
	ww:10,
	newsevent:11
}

voyc.Timeline.imgBase = 'images/jdots/';

voyc.Timeline.prototype.setTime = function(time) {
	this.when.setDecidate(time);
	this.draw();
}

voyc.Timeline.prototype.setLevel = function(level) {
	this.level.setLevel(level);
	this.draw();
}

voyc.Timeline.prototype.publish = function(event) {
	var bounds = {
		timecenter:this.when.decidate,
		timelevel:this.level.level,
		timedatalevel:this.level.datalevel,
		timemaxdots:this.maxDots,
		begin:this.years.begin,
		end:this.years.end
	};

	var obj = {
		bounds:bounds,
		lcdpattern:this.level.lcdPattern,
		reset:this.resetInProgress
	};
	voyc.event.publish(event,'timeline',obj);
}

voyc.Timeline.prototype.create = function(bounds) {
	voyc.debug.alert('Timeline.create');

	// calculation factors dependent on screen dimensions
	this.pixels.perCM = voyc.voyc.layout.pixelsPerCM;
	this.optPixelsPerPeriod = this.pixels.perCM * this.optCMPerPeriod;
	this.minPixelsPerPeriod = this.pixels.perCM * this.minCMPerPeriod;
	this.maxPixelsPerPeriod = this.pixels.perCM * this.maxCMPerPeriod;

	// initial time and level
	this.when = new voyc.When(bounds.timecenter);
	this.level = new voyc.TimeLevel(this);
	this.level.setLevel(bounds.timelevel);

	// create our own div to nest inside the container
	var e = document.createElement('div');
	e.id = 'tline';
	e.style.height = 'inherit';
	e.style.width = 'inherit';
	e.style.position = 'relative';
	this.parentdiv.appendChild(e);
	this.div = e;

	// create the scroller, contains ruler, verticals, bkd, and fgd
	var e = document.createElement('div');
	e.id = 'tline-scroller';
	this.div.appendChild(e);
	this.divScroller = e;

	// create the ruler
	e = document.createElement('div');
	e.id = 'tline-ruler';
	e.style.position = 'relative';
	e.style.height = this.rulerHeight + 'px';
	this.divScroller.appendChild(e);
	this.divRuler = e;

	// create the ruler canvas and drawing context
	c = document.createElement('canvas');
	c.id = 'tline-ruler-canvas';
	this.divRuler.appendChild(c);
	this.canvasRuler = c;
	c.width = e.offsetWidth;
	c.height = e.offsetHeight;
	c.style.width = e.offsetWidth + 'px';
	c.style.height = e.offsetHeight + 'px';
	this.ctxRuler = c.getContext("2d");
	this.ctxRuler.translate(0.5,0.5);  // makes thin clear lines
	this.ctxRuler.lineWidth = 1;
	this.ctxRuler.strokeStyle = '#088';

	// create the bkd container
	e = document.createElement('div');
	e.id = 'tline-bkdcontainer';
	e.style.position = 'relative';
	var ht = (this.div.offsetHeight-this.rulerHeight-this.zoombarHeight);
	e.style.height = ht + 'px';
	this.divScroller.appendChild(e);
	this.bkd.div = e;

	// create the verticals container
	e = document.createElement('div');
	e.id = 'tline-vertcontainer';
	e.style.position = 'relative';
	e.style.height = ht + 'px';
	e.style.top = (0-ht) + 'px';
	this.divScroller.appendChild(e);
	this.divVerticalContainer = e;

	// create the fgd container
	e = document.createElement('div');
	e.id = 'tline-fgdcontainer';
	e.style.position = 'relative';
	e.style.height = (ht) + 'px';
	e.style.top = (0-(ht*2)) + 'px';
	this.divScroller.appendChild(e);
	this.fgd.div = e;

	// create fgd rows and verticals. Can be changed on resize.
	this.createFgdRows();
	this.createVerticals();
	this.maxDots = Math.floor(this.fgd.numRows * (this.fgd.div.offsetWidth / this.minPixelsPerDotWidth));

	// create the playhead
	d = document.createElement('div');
	d.id = 'playhead';
	this.div.appendChild(d);
	this.divPlayhead = d;

	// create the control buttons
	e = document.createElement('div');
	e.id = 'tline-widget-container';
	e.style.zIndex = voyc.TimeBar.maxZIndex+1;
	e.innerHTML = '<div class="tline-control" id="panback"></div><div class="tline-control" id="playpause"></div><div class="tline-control" id="panforward"></div><div class="tline-control" id="zoomin"></div><div class="tline-control" id="zoomout"></div>';
	this.div.appendChild(e);
	this.divWidgetContainer = e;

	// add click handlers for the control buttons
	var self = this;
	voyc.addEvent(voyc.$('panback'), 'click', function(event) {self.pan(event, -1)});
	voyc.addEvent(voyc.$('panforward'), 'click', function(event) {self.pan(event, +1)});
	voyc.addEvent(voyc.$('playpause'), 'click', function() {self.playPause()});
	voyc.addEvent(voyc.$('zoomin'), 'click', function(event) {self.zoom(event, -1)});
	voyc.addEvent(voyc.$('zoomout'), 'click', function(event) {self.zoom(event, +1)});

	// prevent timeline drag when clicking on control buttons
	voyc.addEvent(voyc.$('panback'), 'mousedown', function(e) {e.stopPropagation(); return false;});
	voyc.addEvent(voyc.$('panforward'), 'mousedown', function(e) {e.stopPropagation(); return false;});
	voyc.addEvent(voyc.$('playpause'), 'mousedown', function(e) {e.stopPropagation(); return false;});
	voyc.addEvent(voyc.$('zoomin'), 'mousedown', function(e) {e.stopPropagation(); return false;});
	voyc.addEvent(voyc.$('zoomout'), 'mousedown', function(e) {e.stopPropagation(); return false;});

	// create the zoombar
	e = document.createElement('div');
	e.id = 'tline-zoombar';
	e.style.position = 'relative';
	e.style.height = this.zoombarHeight + 'px';
	e.style.top = (0-(ht*2)) + 'px';
	this.div.appendChild(e);
	this.divZoombar = e;

	// create the zoombar thumb
	e = document.createElement('div');
	e.id = 'tline-zoombar-thumb';
	e.style.position = 'absolute';
	e.style.height = this.zoombarHeight + 'px';
	e.style.width = '100px';
	e.style.left = '70px';
	e.style.top = '0px';
	this.divZoombar.appendChild(e);
	this.divZoombarThumb = e;
	
	// create the zoombar left
	e = document.createElement('div');
	e.id = 'tline-zoombar-left';
	e.style.position = 'absolute';
	e.style.height = this.zoombarHeight + 'px';
	e.style.width = this.zoombarWingWidth + 'px';
	e.style.left = '50px';
	e.style.top = '0px';
	this.divZoombar.appendChild(e);
	this.divZoombarLeft = e;

	// create the zoombar right
	e = document.createElement('div');
	e.id = 'tline-zoombar-right';
	e.style.position = 'absolute';
	e.style.height = this.zoombarHeight + 'px';
	e.style.width = this.zoombarWingWidth + 'px';
	e.style.left = '170px';
	e.style.top = '0px';
	this.divZoombar.appendChild(e);
	this.divZoombarRight = e;

	// zoombar hover states
	voyc.addEvent(this.divZoombarThumb, 'mouseover', function() {
		if (!self.zoombarDragging) {
			voyc.addClass(self.divZoombarThumb,'over');
		}
	});
	voyc.addEvent(this.divZoombarThumb, 'mouseout', function() {
		voyc.removeClass(self.divZoombarThumb,'over');
	});
	voyc.addEvent(this.divZoombarLeft, 'mouseover', function() {
		if (!self.zoombarDragging) {
			voyc.addClass(self.divZoombarLeft,'over');
		}
	});
	voyc.addEvent(this.divZoombarLeft, 'mouseout', function() {
		voyc.removeClass(self.divZoombarLeft,'over');
	});
	voyc.addEvent(this.divZoombarRight, 'mouseover', function() {
		if (!self.zoombarDragging) {
			voyc.addClass(self.divZoombarRight,'over');
		}
	});
	voyc.addEvent(this.divZoombarRight, 'mouseout', function() {
		voyc.removeClass(self.divZoombarRight,'over');
	});

	this.setupDragging();

	var self = this;
	voyc.event.subscribe('data_ready', 'timeline', function(evt,pub,obj) {
		self.onDataReady(evt,pub,obj);
	});
	voyc.event.subscribe('window_resized', 'timeline', function(evt,pub,obj) {
		self.resize();
	});
	voyc.event.subscribe('story_hovered', 'timeline', function(evt,pub,obj) {
		obj.record.ts.onHover(evt,pub,obj);
	});
	voyc.event.subscribe('story_selected', 'timeline', function(evt,pub,obj) {
		obj.record.ts.onSelect(evt,pub,obj);
	});
	voyc.event.subscribe('story_disqualified', 'timeline', function(evt,pub,obj) {
		if (obj.record.ts) {
			obj.record.ts.remove();
		}
	});
	voyc.event.subscribe('internals_opened', 'timeline', function(evt,pub,obj) {
		self.setInternals(evt,pub,obj);
	});

	this.draw();
	this.publish('time_initialized');
}

/**
 * Create the fgd rows.
 * Called by resize.  Number of fgd rows depends on height of container.
**/
voyc.Timeline.prototype.createFgdRows = function() {
	var oldNumRows = this.fgd.numRows;
	this.fgd.numRows = Math.floor((this.fgd.div.offsetHeight) / (voyc.TimeBar.fgd.heightNormal+voyc.TimeBar.fgd.spacer));
	if (this.fgd.numRows > oldNumRows) {
		for (var i=oldNumRows; i<this.fgd.numRows; i++) {
			this.fgd.rows[i] = {
				forebear:0,
				bars:[],
				begin:7777,
				end:-7777
			};
		}
	}
	else if (this.fgd.numRows < oldNumRows) {
		for (var i=this.fgd.numRows; i<oldNumRows; i++) {
			delete this.fgd.rows[i];
		}
	}
}

voyc.Timeline.prototype.createVerticals = function() {
	var oldNumVerticals = this.numVerticals;
	this.numVerticals = Math.floor(this.fgd.div.offsetWidth / this.minPixelsPerPeriod);
	this.numVerticals*=2; // just to be safe
	if (this.numVerticals > oldNumVerticals) {
		for (var i=oldNumVerticals; i<this.numVerticals; i++) {
			d = document.createElement('div');
			d.className = 'verticalrule';
			this.divVerticalContainer.appendChild(d);
			this.divVertical[i] = d;

			// above each vertical, in the ruler, create the box for formatted time
			d = document.createElement('div');
			d.className = 'rulertime';
			this.divRuler.appendChild(d);
			this.divRulerTime[i] = d;
		}
	}
}

voyc.Timeline.prototype.setupDragging = function() {
	// scroller contains ruler, verticals, bkd, fgd
	voyc.dragger.enableDrag(this.divScroller);
	var self = this;
	voyc.dragger.addListener( this.divScroller, 'grab', function(x,y) {
		self.grabYearsBegin = self.years.begin;
	});
	voyc.dragger.addListener( this.divScroller, 'drag', function(x,y) {
		var x = self.pixels.center + voyc.dragger.grabx - voyc.dragger.mousex;
		var d = ((x * self.years.width) / self.pixels.width) + self.grabYearsBegin;
		d = Math.min(d, self.maxCenter);
		d = Math.max(d, self.minCenter);
		self.when = new voyc.When(d);
		self.draw();
		self.publish('time_animated');
		return false;
	});
	voyc.dragger.addListener( this.divScroller, 'drop', function(x,y) {
		self.grabYearsBegin = 0;
		self.publish('time_moved');
		self.zoombarResetIsDue = true;
		self.draw();
	});

	// zoombar thumb
	voyc.dragger.enableDrag(this.divZoombarThumb);
	var self = this;
	voyc.dragger.addListener( this.divZoombarThumb, 'grab', function(x,y) {
		self.grabYearsBegin = self.years.begin;
		voyc.removeClass(self.divZoombarThumb,'over');
		voyc.addClass(self.divZoombarThumb,'dragging');
		self.zoombarDragging = true;
	});
	voyc.dragger.addListener( this.divZoombarThumb, 'drag', function(x,y) {
		var x = self.pixels.center + ((voyc.dragger.mousex - voyc.dragger.grabx) * self.zoombarMultiplier);
		var d = ((x * self.years.width) / self.pixels.width) + self.grabYearsBegin;
		d = Math.min(d, self.maxCenter);
		d = Math.max(d, self.minCenter);
		self.when = new voyc.When(d);
		self.draw();
		self.publish('time_animated');
		return false;
	});
	voyc.dragger.addListener( this.divZoombarThumb, 'drop', function(x,y) {
		self.grabYearsBegin = 0;
		voyc.removeClass(self.divZoombarThumb,'dragging');
		self.zoombarDragging = false;
		self.publish('time_moved');
		self.zoombarResetIsDue = true;
		self.draw();
	});

	// zoombar left
	voyc.dragger.enableDrag(this.divZoombarLeft);
	var self = this;
	voyc.dragger.addListener( this.divZoombarLeft, 'grab', function(x,y) {
		self.grabZoombarThumbWidth = self.divZoombarThumb.offsetWidth;
		voyc.removeClass(self.divZoombarLeft,'over');
		voyc.addClass(self.divZoombarLeft,'dragging');
		self.zoombarDragging = true;
	});
	voyc.dragger.addListener( this.divZoombarLeft, 'drag', function(x,y) {
		// pixels distance mouse has been dragged
		var r = (voyc.dragger.grabx - voyc.dragger.mousex);
		self.dragZoom(r);
		self.publish('time_animated');
		return false;
	});
	voyc.dragger.addListener( this.divZoombarLeft, 'drop', function(x,y) {
		self.grabZoombarThumbWidth = 0;
		self.publish('time_zoomed');
		self.zoombarResetIsDue = true;
		voyc.removeClass(self.divZoombarLeft,'dragging');
		self.zoombarDragging = false;
		self.draw();
	});

	// zoombar right
	voyc.dragger.enableDrag(this.divZoombarRight);
	var self = this;
	voyc.dragger.addListener( this.divZoombarRight, 'grab', function(x,y) {
		self.grabZoombarThumbWidth = self.divZoombarThumb.offsetWidth;
		voyc.removeClass(self.divZoombarRight,'over');
		voyc.addClass(self.divZoombarRight,'dragging');
		self.zoombarDragging = true;
	});
	voyc.dragger.addListener( this.divZoombarRight, 'drag', function(x,y) {
		// pixels distance mouse has been dragged
		var r = (voyc.dragger.mousex - voyc.dragger.grabx);
		self.dragZoom(r);
		self.publish('time_animated');
		return false;
	});
	voyc.dragger.addListener( this.divZoombarRight, 'drop', function(x,y) {
		self.grabZoombarThumbWidth = 0;
		self.publish('time_zoomed');
		self.zoombarResetIsDue = true;
		voyc.removeClass(self.divZoombarRight,'dragging');
		self.zoombarDragging = false;
		self.draw();
	});
}

voyc.Timeline.prototype.dragZoom = function(r) {
	// r = distance mouse has dragged
	
	// pixels new width of thumb
	var px = this.grabZoombarThumbWidth + (r*2)
	if (px <= this.zoombarMinimumThumbWidth) {
		return false;
	}
	if (px >= this.zoombarUniverse.maxThumbWidth) {
		return false;
	}

	// years new width of the thumb
	var yrs = px/(this.divZoombar.offsetWidth) * this.zoombarUniverse.totalLengthOfTime;

	// years per cm for new thumb width
	var ypcm = yrs/(this.grabZoombarThumbWidth/this.pixels.perCM);
	var discrete = (px / this.zoombarUniverse.maxThumbWidth) * this.level.maxZoomDiscrete;
	var ypcm = this.level.getYPCMFromDiscrete(discrete);
	this.level.set(ypcm);
	this.draw();
}

voyc.Timeline.prototype.resize = function() {
	var newHt = (this.div.offsetHeight-this.rulerHeight-this.zoombarHeight);
	this.bkd.div.style.height = newHt + 'px';
	this.fgd.div.style.height = newHt + 'px';
	this.fgd.div.style.top = (0-newHt) + 'px';
	this.divZoombar.style.top = (0-newHt) + 'px';

	// hide all the existing verticals. draw will reshow the ones we need.
	for (n=0; n<this.numVerticals; n++) {
		this.divVertical[n].style.display = 'none';
		this.divRulerTime[n].style.display = 'none';
	}

	// create additional fgd rows and verticals, only if necessary
	this.createFgdRows();
	this.createVerticals();
	this.maxDots = Math.floor(this.fgd.numRows * (this.fgd.div.offsetWidth / this.minPixelsPerDotWidth));

	this.zoombarResetIsDue = true;
	this.draw();
}

voyc.Timeline.prototype.animateTo = function(time,level) {
	//	this.when.setDecidate(time);
	//	this.level.setLevel(level);
	//	this.draw();
	if (this.playing) this.pause();

	// given time and level
	this.animating = {
		panTarget:time,
		panComplete:false,
		panIncrement: (time - this.when.decidate) / this.optFramesPerAnimation,
		zoomTarget:level,
		zoomTargetYPCM:this.level.alevels[String(level)].jyear / this.optCMPerPeriod,
		zoomComplete:false,
		zoomDirection:((this.level.level - level) > 0) ? -1 : +1,
		frameNumber:0
	}

	var self = this;
	voyc.animator.callback = function() {self.animateToCallback();};

	// publish event with bounds we will have when animation is finished
	var bounds = {};
	bounds.timecenter = this.when.decidate;
	var width = (this.pixels.width/this.pixels.perCM) * this.zoomingNextYPCM;
	bounds.begin = this.years.center - (this.years.width / 2);
	bounds.end = this.years.center + (this.years.width / 2);
	var levela = this.level.alevels[String(level)];
	bounds.timedatalevel = levela.datalevel;
	bounds.timemaxdots = this.maxDots;
	obj = {
		bounds:bounds,
		lcdpattern:levela.lcdPattern,
		reset:this.resetInProgress
	}
	voyc.event.publish('time_zoomstarted','timeline',obj);

	// start zoom animation
	voyc.animator.start();
}

voyc.Timeline.prototype.animateToCallback = function() {

	// pan
	if (!this.animating.panComplete) {
		var nextTime = this.when.decidate + this.animating.panIncrement;
		if (this.animating.frameNumber >= this.optFramesPerAnimation) {
			nextTime = this.animating.panTarget;
			this.animating.panComplete = true;
		}
		this.when.setDecidate(nextTime);
	}

	// zoom
	if (!this.animating.zoomComplete) {
		this.level.zoom(this.animating.zoomDirection);
	}

	// draw
	this.draw();
	this.publish('time_animated');

	// check pan for completion
	if (!this.animating.panComplete) {
		if (nextTime == this.animating.targetTime) {
			this.animating.panComplete = true;
		}
	}
	
	// check zoom for completion
	if (!this.animating.zoomComplete) {
		var diff = this.animating.zoomTargetYPCM - this.years.perCM;
		diff *= this.animating.zoomDirection;
		if (diff < 0) {
			this.animating.zoomComplete = true;
		}
	}

	// stop animation when both pan and zoom complete
	if (this.animating.zoomComplete && this.animating.panComplete) {
		voyc.animator.stop();
		this.zoombarResetIsDue = true;
		this.publish('time_zoomed');
		this.draw();
		if (this.resetInProgress) {
			this.resetInProgress = false;
		}
	}
	else {
		this.animating.frameNumber++;
	
		// abort
		if (this.animating.frameNumber > this.maxFramesPerAnimation) {
			voyc.animator.stop();
			this.zoombarResetIsDue = true;
			this.when.setDecidate(this.animating.panTarget);
			this.level.setLevel(this.animating.zoomTarget);
			this.draw();
			this.publish('time_zoomed');
			if (this.resetInProgress) {
				this.resetInProgress = false;
			}
		}
	}
}

voyc.Timeline.prototype.zoom = function(event,direction) {
	if (this.playing) this.pause();

	this.zoomingDirection = direction;

	// fine zoom
	if (event.shiftKey) {
		this.level.zoom(this.zoomingDirection);
		this.draw();
		this.publish('time_zoomed');
		return;
	}

	// coarse or medium zoom
	var coarse = (event.ctrlKey) ? false : true;
	var nextLevel = this.level.nextLevel(this.zoomingDirection,coarse);
	if (nextLevel === false) {
		return;
	}
	var nextJYear = this.level.alevels[String(nextLevel)].jyear;
	this.zoomingNextYPCM = nextJYear / this.optCMPerPeriod;
	var self = this;
	voyc.animator.callback = function() {self.zoomCallback();};

	// publish event with bounds we will have when zoom is finished
	var bounds = {};
	bounds.timecenter = this.when.decidate;
	var width = (this.pixels.width/this.pixels.perCM) * this.zoomingNextYPCM;
	bounds.begin = this.years.center - (this.years.width / 2);
	bounds.end = this.years.center + (this.years.width / 2);
	var levela = this.level.alevels[String(nextLevel)];
	bounds.timedatalevel = levela.datalevel;
	bounds.timemaxdots = this.maxDots;
	obj = {
		bounds:bounds,
		lcdpattern:levela.lcdPattern
	}
	voyc.event.publish('time_zoomstarted','timeline',obj);

	// start zoom animation
	voyc.animator.start();
}

voyc.Timeline.prototype.zoomCallback = function() {
	this.level.zoom(this.zoomingDirection);
	this.draw();

	var diff = this.zoomingNextYPCM - this.years.perCM;
	diff *= this.zoomingDirection;
	if (diff < 0) {
		this.zoombarResetIsDue = true;
		voyc.animator.stop();
		this.publish('time_zoomed');
	}
}

voyc.Timeline.prototype.playPause = function() {
	if (this.playing) {
		this.pause();
	}
	else {
		this.playing = true;
		voyc.addClass(voyc.$('playpause'),'playing');
		var yearsPerFrame = this.years.width / (this.pixels.width / this.pixelsPerFrame);
		var self = this;
		voyc.animator.callback = function() {
			var nextTime = self.when.decidate + yearsPerFrame;
			if (nextTime > self.maxCenter) {
				nextTime = Math.min( nextTime, self.maxCenter);
				self.pause();
			}
			self.when.setDecidate(nextTime);
			self.draw();
			self.publish('time_animated');
		}
		voyc.animator.start();
	}
}

voyc.Timeline.prototype.pause = function() {
	this.zoombarResetIsDue = true;
	this.draw();
	voyc.animator.stop();
	this.playing = false;
	voyc.removeClass(voyc.$('playpause'),'playing');
	this.publish('time_moved');
}

voyc.Timeline.prototype.pan = function(event, direction) {
	if (this.playing) this.pause();

	// fine-grain pan
	if (event.shiftKey) {
		this.yearsPerFrame = this.years.width / (this.pixels.width / this.pixels.perTick);
		this.yearsPerFrame *= direction;
		var nextTime = this.when.decidate + this.yearsPerFrame;
		nextTime = Math.min(nextTime, this.maxCenter);
		nextTime = Math.max(nextTime, this.minCenter);
		this.when.setDecidate(nextTime);
		this.draw();
		this.publish('time_moved');
		return;
	}

	// coarse or medium-grain pan
	var grain = (event.ctrlKey) ? 'medium' : 'coarse';
	this.framecount = this.framesPerPan[grain];
	this.yearsPerFrame = this.years.width / (this.pixels.width / this.pixelsPerFrame);
	this.yearsPerFrame *= direction;
	var self = this;
	voyc.animator.callback = function() {self.panCallback();};

	// publish event
	var increment = this.yearsPerFrame * this.framecount;
	var bounds = {};
	bounds.timecenter = this.when.decidate + increment;
	bounds.begin = this.years.begin + increment;
	bounds.end = this.years.end + increment;
	bounds.timedatalevel = this.level.datalevel;
	bounds.timemaxdots = this.maxDots;
	obj = {
		bounds:bounds,
		lcdpattern: this.level.lcdPattern
	}
	voyc.event.publish('time_movestarted','timeline',obj);

	// start the animation
	voyc.animator.start();
}

voyc.Timeline.prototype.panCallback = function() {
	var nextTime = this.when.decidate + this.yearsPerFrame;
	if (nextTime > this.maxCenter) {
		nextTime = this.maxCenter;
		this.framecount = 1;
	}
	if (nextTime < this.minCenter) {
		nextTime = this.minCenter;
		this.framecount = 1;
	}
	this.when.setDecidate(nextTime);
	this.zoombarResetIsDue = (this.framecount == 1) ? true : false;
	this.draw();
	this.publish('time_animated');
	this.framecount--;
	if (!this.framecount) {
		voyc.animator.stop();
		this.publish('time_moved');
	}
}

voyc.Timeline.prototype.draw = function() {

	// given
	this.years.center = this.when.decidate;
	this.pixels.begin = 0;
	this.pixels.end = this.div.offsetWidth;
	this.pixels.width = this.pixels.end - this.pixels.begin;
	this.pixels.center = this.pixels.width / 2;

	// calculate
	this.calcVerticals();
	this.years.width = (this.pixels.width/this.pixels.perCM) * this.years.perCM;
	this.years.begin = this.years.center - (this.years.width / 2);
	this.years.end = this.years.center + (this.years.width / 2);
	this.pixels.perPeriod = this.pixels.verticals[0] - this.pixels.verticals[1];

	// calculate tick marks
	var pixelsPerSuper = 0;
	if (this.level.level >= 2 && this.level.level <= 5) {
		var pxPerDay = this.pixelsFromMS(1000*60*60*24);
		pixelsPerSuper = pxPerDay;
		
		this.pixels.perTick = 0;
		var x = pixelsPerSuper / 2;
		while (x > this.minPixelsPerTick) {
			this.pixels.perTick = x;
			x /= 2;
		}
		if (this.pixels.perTick == 0) {
			this.pixels.perTick = pxPerDay;
			pixelsPerSuper = 0;
		}
	}
	else {
		this.tick = this.level.calcTick(this.pixels.perPeriod);
		this.pixels.perTick = this.pixels.perPeriod / this.tick.tick;
		pixelsPerSuper = this.pixels.perPeriod / this.tick.superticktick;
	}

	// draw
	this.drawInternals();
	this.drawVerticals();
	this.drawRuler(this.pixels.verticals[this.firstVertical], this.pixels.perTick, pixelsPerSuper);
	this.drawZoombar();
	this.drawData();

	// draw playhead
	var playheadPixel = Math.floor(this.div.offsetWidth / 2);
	this.divPlayhead.style.left = playheadPixel + 'px';
}

/**
 * Unit Conversions
 */
voyc.Timeline.prototype.pixelsFromYears = function(years,isDiff) {
	if (!isDiff) {
		years -= this.years.begin;
	}
	return (years/this.years.perCM)*this.pixels.perCM;
}
voyc.Timeline.prototype.yearsFromPixels = function(pixels) {
	return (pixels/this.pixels.perCM)*this.years.perCM;
	return Math.floor((pixels/this.pixels.perCM)*this.years.perCM);
}
voyc.Timeline.prototype.pixelsFromMS = function(ms) {
	return (ms/this.ms.perCM)*this.pixels.perCM;
}
voyc.Timeline.prototype.msFromYears = function(years) {
	// depending on the leap-year-or-not of the center date
	return years * voyc.When.getMSperYear(Math.floor(this.when.decidate));
}

/**
 * Calculate positions for verticals.  
 * One vertical is drawn at each period peak.
 */
voyc.Timeline.prototype.calcVerticals = function() {
	// start with center date
	var whenWork = new voyc.When(this.years.center);
	whenWork.setPrecision(this.level.p);

	// at lower levels we also use ms as calculated by JSDate
	var usingMS = (voyc.When.isNumber(this.level.p) && this.level.p > 10000) ? false : true;

	if (usingMS) {
		var jscenter = voyc.When.toJSDate(new voyc.When(this.years.center));
		this.ms.center = jscenter.valueOf();
	}

	// step backwards to previous period boundaries
	var n = 0;
	var yrdiff,msdiff,pxdiff;
	while (n==0 || this.pixels.verticals[n-1] > this.pixels.begin) {
		whenWork.prevPeriod(this.level.r);
		this.years.verticals[n] = whenWork.getDecidate();
		
		if (usingMS) {
			this.ms.verticals[n] = voyc.When.toJSDate(whenWork).valueOf();
			msdiff = this.ms.center - this.ms.verticals[n];
			pxdiff = this.pixelsFromMS(msdiff);
			this.pixels.verticals[n] = this.pixels.center - pxdiff;
		}
		else {
			yrdiff = this.years.center - this.years.verticals[n];
			pxdiff = this.pixelsFromYears(yrdiff, true);
			this.pixels.verticals[n] = this.pixels.center - pxdiff;
		}

		this.firstVertical = n;
		n++;
		if (n >= this.numVerticals) {
			voyc.debug.alert('Timeline.draw ran out of verticals.  Impossible.');
			break;
		}
	}

	// now go forward from center to end
	whenWork.setDecidate(this.years.verticals[0]);
	while (this.pixels.verticals[n-1] < this.pixels.end) {
		whenWork.nextPeriod(this.level.r);
		this.years.verticals[n] = whenWork.getDecidate();
		if (usingMS) {
			this.ms.verticals[n] = voyc.When.toJSDate(whenWork).valueOf();
			msdiff = this.ms.center - this.ms.verticals[n];
			pxdiff = this.pixelsFromMS(msdiff);
			this.pixels.verticals[n] = this.pixels.center - pxdiff;
		}
		else {
			yrdiff = this.years.center - this.years.verticals[n];
			pxdiff = this.pixelsFromYears(yrdiff,true);
			this.pixels.verticals[n] = this.pixels.center - pxdiff;
		}

		this.lastVertical = n;
		n++;
		if (n >= this.numVerticals) {
			voyc.debug.alert('Timeline.draw ran out of verticals.  Impossible.');
			break;
		}
	}

	// zero out remaining verticals
	for ( ; n< this.numVerticals; n++) {
		this.pixels.verticals[n] = 0;
		this.years.verticals[n] = 0;
		this.ms.verticals[n] = 0;
	}
}

/**
 * Draw verticals.
 */
voyc.Timeline.prototype.drawVerticals = function() {
	var len = this.lastVertical+1;
	for (var i=0; i<len; i++) {
		pixels = this.pixels.verticals[i];
		years = this.years.verticals[i];

		// draw the vertical
		this.divVertical[i].style.display = 'block';
		this.divVertical[i].style.left = pixels + 'px';

		// draw the formatted time in the ruler, then center it above the vertical
		this.divRulerTime[i].innerHTML = new voyc.When(years,this.level.p).format(this.level.rulerPattern);
		this.divRulerTime[i].style.display = 'block';
		var w = this.divRulerTime[i].offsetWidth;
		this.divRulerTime[i].style.left = pixels-Math.floor(w/2) + 'px';
	}
	
	// hide leftover verticals
	for (; i<this.numVerticals; i++) {
		this.divVertical[i].style.display = 'none';
		this.divRulerTime[i].style.display = 'none';
	}
}

/**
	@param s Start position in pixels
	@param t Width of tickmark in pixels
	@param n Count of super ticks within period
 */
voyc.Timeline.prototype.drawRuler = function(s,t,n) {
	var w = this.divRuler.offsetWidth;
	var h = this.divRuler.offsetHeight;
	var ctx = this.ctxRuler;
	ctx.clearRect(0, 0, this.canvasRuler.width, this.canvasRuler.height);

	// draw ticks
	if (t) {
		var ticktop = h - this.tickHeight;
		for (var i=s; i<w; i+=t) {
			ctx.beginPath();
			ctx.moveTo(i, ticktop);
			ctx.lineTo(i, h);
			ctx.stroke();
		}
	}
	
	// draw super ticks
	var supertop = h - this.superHeight;
	if (n) {
		for (var i=s; i<w; i+=n) {
			ctx.beginPath();
			ctx.moveTo(i, supertop);
			ctx.lineTo(i, h);
			ctx.stroke();
		}
	}
	else {
		// draw a supertick above each vertical
		var len = this.pixels.verticals.length;
		var i;
		for (var n=0; n<len; n++) {
			i = this.pixels.verticals[n];
			if (i > 0) {
				ctx.beginPath();
				ctx.moveTo(i, supertop);
				ctx.lineTo(i, h);
				ctx.stroke();
			}
		}
	}
}

/**
 * Draw the zoombar.
 */
voyc.Timeline.prototype.drawZoombar = function() {
	//initialize zoombar position front and center
	if (this.zoombarResetIsDue) {
		this.zoombarUniverse = {
			beginningOfTime: this.years.center - ((this.years.width * this.zoombarMultiplier) / 2),
			endOfTime: this.years.center + ((this.years.width * this.zoombarMultiplier) / 2),
			totalLengthOfTime: this.years.width * this.zoombarMultiplier,
			maxThumbWidth: this.divZoombar.offsetWidth - (this.zoombarWingWidth*2)
		}
		this.zoombarResetIsDue = false;
	}

	// calc thumbleft and thumbwidth
	var thumbwidth = ((this.level.zoomDiscrete) / this.level.maxZoomDiscrete) * (this.zoombarUniverse.maxThumbWidth);
	var thumbcenter = ((this.years.center - this.zoombarUniverse.beginningOfTime) / this.zoombarUniverse.totalLengthOfTime) * this.zoombarUniverse.maxThumbWidth;
	var thumbleft = thumbcenter - (thumbwidth/2);	
	thumbleft += this.zoombarWingWidth;

	// reposition zoombar
	this.divZoombarThumb.style.left = thumbleft + 'px';
	this.divZoombarThumb.style.width =  thumbwidth + 'px';
	this.divZoombarLeft.style.left = (thumbleft - this.zoombarWingWidth) + 'px';
	this.divZoombarRight.style.left = (thumbleft + thumbwidth) + 'px';
	return;
}

/**
 * Voyc Event Handler.  User has opened internals window.
 *	obj contains two members
 *		div: internals div.  Add components to this.
 *		classname: internals component classname.
 */
voyc.Timeline.prototype.setInternals = function(evt,pub,obj) {
	this.divInternals = document.createElement('div');
	this.divInternals.className = obj.classname;
	this.divInternals.id = 'internals-timeline';
	obj.div.appendChild(this.divInternals);
	
	var s = "<table id='tline-internals'><tr><td><table>"+
		"<tr><td>level</td><td><span id='level'></span></td></tr>"+
		"<tr><td>datalevel</td><td><span id='datalevel'></span></td></tr>"+
		"<tr><td>unit</td><td><span id='unit'></span></td></tr>"+
		"<tr><td>tick_unit</td><td><span id='tick_unit'></span></td></tr>"+
		"<tr><td>tick_tick</td><td><span id='tick_tick'></span></td></tr>"+
		"<tr><td>tick_super</td><td><span id='tick_super'></span></td></tr>"+
		"</table></td><td><table>"+
		"<tr><td>&nbsp;</td><td>Years</td><td>Pixels</td><td>MS</td></tr>"+
		"<tr><td>perCM</td> <td><span id='years_perCM'></span></td> <td><span id='pixels_perCM'></span></td> <td><span id='ms_perCM'></span></td> </tr>"+
		"<tr><td>perPeriod</td> <td><span id='years_perPeriod'></span></td> <td><span id='pixels_perPeriod'></span></td> <td><span id='ms_perPeriod'></span></td> </tr>"+
		"<tr><td>perTick</td> <td><span id='years_perTick'></span></td> <td><span id='pixels_perTick'></span></td> <td><span id='ms_perTick'></span></td> </tr>"+
		"<tr><td>begin</td> <td><span id='years_begin'></span></td> <td><span id='pixels_begin'></span></td> <td><span id='ms_begin'></span></td> </tr>"+
		"<tr><td>end</td>   <td><span id='years_end'></span></td>   <td><span id='pixels_end'></span></td>   <td><span id='ms_end'></span></td>   </tr>"+
		"<tr><td>width</td> <td><span id='years_width'></span></td> <td><span id='pixels_width'></span></td> <td><span id='ms_width'></span></td> </tr>"+
		"<tr><td>center</td><td><span id='years_center'></span></td><td><span id='pixels_center'></span></td><td><span id='ms_center'></span></td></tr>"+
		"<tr><td>verticals</td><td><span id='years_verticals'></span></td>  <td><span id='pixels_verticals'></span></td>  <td><span id='ms_verticals'></span></td>  </tr>"+
		"</table></td></tr></table>";
	this.divInternals.innerHTML = s;

	// do the same for the dragger object
	var draggerInternals = document.createElement('div');
	draggerInternals.className = obj.classname;
	draggerInternals.id = 'internals-dragger';
	obj.div.appendChild(draggerInternals);
	voyc.dragger.setInternals(draggerInternals);
	this.drawInternals();
}

voyc.Timeline.prototype.drawInternals = function() {
	if (this.divInternals) {
		voyc.$('level').innerHTML  = this.level.level;
		voyc.$('datalevel').innerHTML  = this.level.datalevel;
		voyc.$('unit').innerHTML  = this.level.unit;
		voyc.$('tick_unit').innerHTML  = this.tick.unit;
		voyc.$('tick_tick').innerHTML  = this.tick.tick;
		voyc.$('tick_super').innerHTML  = this.tick.supertick;
	
		voyc.$('pixels_perCM').innerHTML  = Number(this.pixels.perCM).toFixed(9);
		voyc.$('pixels_perPeriod').innerHTML  = Number(this.pixels.perPeriod).toFixed(9);
		voyc.$('pixels_perTick').innerHTML  = Number(this.pixels.perTick).toFixed(9);
		voyc.$('pixels_end').innerHTML  = Number(this.pixels.end).toFixed(9);
		voyc.$('pixels_begin').innerHTML  = Number(this.pixels.begin).toFixed(9);
		voyc.$('pixels_width').innerHTML  = Number(this.pixels.width).toFixed(9);
		voyc.$('pixels_center').innerHTML  = Number(this.pixels.center).toFixed(9);
	
		voyc.$('years_perCM').innerHTML  = Number(this.years.perCM).toFixed(9);
		voyc.$('years_perPeriod').innerHTML  = Number(this.years.perPeriod).toFixed(9);
		voyc.$('years_perTick').innerHTML  = Number(this.years.perTick).toFixed(9);
		voyc.$('years_begin').innerHTML  = Number(this.years.begin).toFixed(9);
		voyc.$('years_end').innerHTML  = Number(this.years.end).toFixed(9);
		voyc.$('years_width').innerHTML  = Number(this.years.width).toFixed(9);
		voyc.$('years_center').innerHTML  = Number(this.years.center).toFixed(9);
	
		voyc.$('ms_perCM').innerHTML  = Number(this.ms.perCM).toFixed(9);
		voyc.$('ms_perPeriod').innerHTML  = Number(this.ms.perPeriod).toFixed(9);
		voyc.$('ms_perTick').innerHTML  = Number(this.ms.perTick).toFixed(9);
		voyc.$('ms_begin').innerHTML  = Number(this.ms.begin).toFixed(9);
		voyc.$('ms_end').innerHTML  = Number(this.ms.end).toFixed(9);
		voyc.$('ms_width').innerHTML  = Number(this.ms.width).toFixed(9);
		voyc.$('ms_center').innerHTML  = Number(this.ms.center).toFixed(9);
	
		var s = '';
		var t = '';
		var u = '';
		var len = this.years.verticals.length
		for (var i=0; i<len; i++) {
			s += String(this.years.verticals[i]) + '<br/>';
			t += String(this.pixels.verticals[i]) + '<br/>';
			u += String(this.ms.verticals[i]) + '<br/>';
		}
		voyc.$('years_verticals').innerHTML  = s;
		voyc.$('pixels_verticals').innerHTML  = t;
		voyc.$('ms_verticals').innerHTML  = u;
	}
}

voyc.Timeline.prototype.onDataReady = function(evt,pub,obj) {
	this.data = obj.data;

	if (obj.bounds.qm == 's') {
		this.resetPosition(obj.bounds);
		this.draw();
	}
	else {
		this.drawData();
	}
}

voyc.Timeline.prototype.resetPosition = function(bounds) {
	// calc center
	this.resetInProgress = true;
	bounds.timecenter = bounds.begin + ((bounds.end - bounds.begin)/2);
	
	// calc level
	bounds.timelevel = this.level.calcLevel(bounds.begin,bounds.end);

	// zoom and pan to new position
	this.animateTo(bounds.timecenter, bounds.timelevel);
	bounds.timedatalevel = this.level.datalevel;
}

voyc.Timeline.prototype.drawData = function() {
	// loop thru data records to add all bars to timeline
	var record, bar;
	for (var i in this.data) {
		record = this.data[i];
		// show or hide each record
		if (record.q) {
			if (!record.ts) {
				record.ts = new voyc.TimeBar(record.id, this, record);
				record.ts.add();
			}
			record.ts.setPosition();
			record.ts.setOpacity();
		}
		else {
			if (record.ts) {
				record.ts.remove();
			}
		}
	}

	// create sort array 
	var datasortedforward = [];
	var datasortedreverse = [];
	for (var i in this.data) {
		record = this.data[i];
		bar = record.ts;
		if (record.q && bar.layer == 'bkd' && bar.rowNum < 0) {
			datasortedforward.push({id:record.id, b:record.b, e:record.e});
			datasortedreverse.push({id:record.id, b:record.b, e:record.e});
		}
	}

	// sort data
	var sortforward = function(a,b) { 
		return (a.b - b.b) ? (a.b - b.b) : (a.e - b.e);
	};
	var sortreverse = function(a,b) { 
		return (b.b - a.b) ? (b.b - a.b) : (b.e - a.e);
	};
	datasortedforward.sort(sortforward);
	datasortedreverse.sort(sortreverse);

	// pass one: forebear
	for (var o in datasortedforward) {
		record = this.data[datasortedforward[o].id];
		bar = record.ts;
		if (bar.rowNum < 0 && record.f) {
			this.assignBarToRowBkd(record,'forebear');
		}
	}
	
	// pass two: add bars in front
	for (var o in datasortedreverse) {
		record = this.data[datasortedreverse[o].id];
		bar = record.ts;
		if (bar.rowNum < 0) {
			this.assignBarToRowBkd(record,'reverse');
		}
	}

	// pass three: add bars after end
	for (var o in datasortedforward) {
		record = this.data[datasortedforward[o].id];
		bar = record.ts;
		if (bar.rowNum < 0) {
			this.assignBarToRowBkd(record,'forward');
		}
	}

// finish background
	// reset vertical position of rows depending on number of rows needed
	this.finishRows();

// finish foreground
	// remove excessive timebars from foreground
	if (voyc.options.bDisqualifyOverlaps) {
		this.disqualifyOverlaps();
	}
}

voyc.Timeline.prototype.finishRows = function() {
	// collapse
	var numRowsShowing = 0;
	var row;
	for (var i=0; i<this.bkd.numRows; i++) {
		row = this.bkd.rows[i];
		row.showing = (row.begin<this.years.end && row.end>this.years.begin);
		row.vertPosition = -1;
		if (row.showing) {
			row.vertPosition = numRowsShowing;
			numRowsShowing++;
		}
	}

	// interleave: merge forebear rows where possible without overlap
	var numRowsVertical = numRowsShowing;
	for (var i=0; i<this.bkd.numRows; i++) {
		row = this.bkd.rows[i];
		row.cbegin = row.begin;
		row.cend = row.end;
	}
	var rowi, rowj;
	var collapsed = [];
	for (var i=0; i<this.bkd.numRows; i++) {
		rowi = this.bkd.rows[i];
		if (rowi.showing) {
			for (var j=i+1; j<this.bkd.numRows-1; j++) {
				rowj = this.bkd.rows[j];
				if (rowj.showing) {
					if (rowj.cend < rowi.cbegin) {
						collapsed.push(rowj.vertPosition);
						rowj.vertPosition = rowi.vertPosition;
						rowj.cend = rowi.cend;
						rowi.begin = rowj.cbegin;
						numRowsVertical--;
					}
					if (rowj.cbegin > rowi.cend) {
						collapsed.push(rowj.vertPosition);
						rowj.vertPosition = rowi.vertPosition;
						rowj.cbegin = rowi.cbegin;
						rowi.cend = rowj.cend;
						numRowsVertical--;
					}
				}
			}
		}
	}
	var len = collapsed.length;
	var pos;
	for (var n=0; n<len; n++) {
		pos = collapsed[n];
		for (var i=0; i<this.bkd.numRows; i++) {
			row = this.bkd.rows[i];
			if (row.vertPosition >= pos) {
				row.vertPosition--;
			}
		}
	}


	// set top and height of each bar
	var rowHeight = Math.floor(this.bkd.div.offsetHeight / numRowsVertical);
	rowHeight = Math.min(rowHeight, voyc.TimeBar.bkd.maxHeight);
	var rowFontsize = voyc.TimeBar.bkd.fontsizeNormal;
	if (rowHeight < voyc.TimeBar.bkd.maxTextHeight) {
		rowFontsize = voyc.TimeBar.bkd.fontsizeNone;
	}
	var bar;
	for (var i=0; i<this.bkd.numRows; i++) {
		row = this.bkd.rows[i];
		for (var n in row.bars) {
			bar = row.bars[n];
			bar.height = rowHeight;
			bar.div.style.height = rowHeight + 'px';
			bar.top = (rowHeight * row.vertPosition);
			bar.div.style.top = bar.top + 'px';
			bar.fontSize = voyc.TimeBar.bkd.fontsizeNone;
			bar.div.style.fontSize = bar.fontSize;
		}
	}
}

voyc.Timeline.prototype.assignBarToRowBkd = function(record,direction) {
	var bar = record.ts;
	var n = -1;
	// find a row with the same forebear
	if (direction == 'forebear') {
		if (record.f) {
			for (var i=0; i<this.bkd.numRows; i++) {
				if (this.bkd.rows[i].forebear == record.f) {
					n = i;
					break;
				}
			}
		}
	}
		
	// find the last row that has room in front
	else if (direction == 'reverse') {
		for (var i=this.bkd.numRows-1; i>=0; i--) {
			if (this.bkd.rows[i].begin > record.e) {
				n = i;
				break;
			}
		}
	}

	// find the first row that has room on the end
	else if (direction == 'forward') {
		for (var i=0; i<this.bkd.numRows; i++) {
			if (this.bkd.rows[i].end < record.b) {
				n = i;
				break;
			}
		}
	}
	
	// create a new row
	if (n < 0 && direction != 'reverse') {
		n = this.bkd.numRows++;
		this.bkd.rows[n] = {
			forebear:0,
			bars:[],
			begin:7777,
			end:-7777
		};
	}

	// set the occupied positions on this.bkd row
	if (n >= 0) {
		this.bkd.rows[n].forebear = record.f;
		if (this.bkd.rows[n].begin > record.b) {
			this.bkd.rows[n].begin = record.b;
		}
		if (this.bkd.rows[n].end < record.e) {
			this.bkd.rows[n].end = record.e;
		}
		bar.rowNum = n;
		this.bkd.rows[n].bars.push(bar);
	}
	return n;
}

voyc.Timeline.prototype.assignBarToRowFgd = function(record) {
	var bar = record.ts;
	var n = -1;
	// find a row with the same forebear
	if (record.f) {
		for (var i=0; i<this.fgd.numRows; i++) {
			if (this.fgd.rows[i].forebear == record.f) {
				n = i;
				break;
			}
		}
	}

	// choose the next lower row	
	var n = this.fgd.lastUsedRowNum;
	n = ((n+1) < this.fgd.numRows) ? n+1 : 0;
	var failsafe = 0;
	while (this.fgd.rows[n].forebear) {
		n = ((n+1) < this.fgd.numRows) ? n+1 : 0;
		failsafe++;
		if (failsafe > this.fgd.numRows) {
			voyc.debug.alert('failsafe break encountered');
			break; 
		}
	}
	this.fgd.lastUsedRowNum = n;

	// set the occupied positions on this.fgd row
	if (n >= 0) {
		this.fgd.rows[n].forebear = record.f;
		if (this.fgd.rows[n].begin > record.b) {
			this.fgd.rows[n].begin = record.b;
		}
		if (this.fgd.rows[n].end < record.e) {
			this.fgd.rows[n].end = record.e + this.yearsFromPixels(this.minPixelsPerDotWidth);
		}
	}
	return n;
}

/**
loop thru all bars on a row
compare each bar to every other bar
when an overlap is found
are they dots or bars
dots
truncate the width the first one
if that makes it too narrow, hide the one with the lower magnitude
**/
voyc.Timeline.prototype.disqualifyOverlaps = function() {
	// loop thru all rows
	var removal = [];
	var row;
	var x,y,w,t;
	for (var n=0; n<this.fgd.numRows; n++) {
		row = this.fgd.rows[n];
		barcount = row.bars.length;
		if (barcount) {
			// on each row		
			// use nested loops to compare each bar to every other bar
			for (var i=0; i<barcount; i++) {
				x = row.bars[i];
				for (var j=0; j<barcount; j++) {
					y = row.bars[j];
					
					// compare x and y
					if (x != y && x.record.q && y.record.q) {

						// if y overlaps, truncate x
						if (x.div.offsetLeft <= y.div.offsetLeft && x.div.offsetLeft+x.div.offsetWidth > y.div.offsetLeft) {
							w = y.div.offsetLeft - x.div.offsetLeft;
							if (w > 30) {
								x.div.style.width = w + 'px';
							}
							
							// if x width too small, delete the lesser of the pair
							else {
								t = (x.record.mag < y.record.mag) ? x : y;
								removal.push(t);
								t.record.q = false;
							}
						}
					}
				}
			}
		}
	}

	var t;
	while (removal.length) {
		t = removal.pop();
		voyc.event.publish('story_disqualified','timebar',{record:t.record});
	}
}
