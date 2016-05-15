// (c) Copyright 2007,2014 voyc.com
/**
 * Create a new TimeBar object.
 * @class Represents one bar on the TimeBar.
 * @constructor
 * @param {id} id The id.
 * @param {TimeBar} TimeBar The TimeBar object.
 * @param {record} record The data record object.
 */
voyc.TimeBar = function(id,timeline,record) {
	this.id = id;
	this.timeline = timeline;
	this.record = record;  // note: (this.record.ts == this)

	this.layer = (this.record.dt <= voyc.datatype.national) ? 'bkd' : 'fgd';
	this.timetype = this.record.tt;  // dot vs bar
	
	this.state = 'n';  // n:normal, h:hovered, d:down
	this.div = null;   // html element
	this.img = null;   // image element within the div
	this.txtnode = null;  // textnode within the div
	this.txt = '';     // value in the textnode (headline)
	this.rowNum = -1;   // top row is zero
//	this.headpos = '';  // first, last, middle

	// style attributes
	this.top = 0;
	this.left = 0;
	this.width = 0;
	this.height = voyc.TimeBar[this.layer].heightNormal;
	this.fontSize = voyc.TimeBar[this.layer].fontsizeNormal;
	this.zIndex = voyc.TimeBar[this.layer].zIndexNormal;
	this.color = voyc.color.colornames[this.record.c];
}

voyc.TimeBar.minZIndex = 100;  // constant
voyc.TimeBar.maxZIndex = 2000000000;  // constant
voyc.TimeBar.zIndex = 100;  // working index, increment by 1 with every click
voyc.TimeBar.selected = null;  // currently select story

voyc.TimeBar.bkd = {
	heightNormal:1,
	heightHovered:20,
	spacer:0,
	maxHeight:20,
	maxTextHeight:10,
	fontsizeNone:'0pt',
	fontsizeNormal:'8pt',
	fontsizeHovered:'12pt',
	zIndexNormal:100,
	zIndexHovered:200
}
voyc.TimeBar.fgd = {
	heightNormal:20,
	heightHovered:20,
	spacer:2,
	maxHeight:20,
	maxTextHeight:10,
	fontsizeNone:'0pt',
	fontsizeNormal:'12pt',
	fontsizeHovered:'12pt',
	zIndexNormal:300,
	zIndexHovered:400
}

/**
 * Create a bar.
 */
voyc.TimeBar.prototype.create = function() {
	// normal state
	this.state = 'n';
	
	// create div
	this.div = document.createElement('div');
	this.div.className = 'timebar';
	//this.div.id = 'timebar_'+this.id;
	//this.div.setAttribute('voycid',this.id);
	this.div.style.zIndex = this.zIndex;
	this.record.ts = this;

	// add dot for events
	if (this.timetype == voyc.TimeType.Dot) {
		this.img = document.createElement('img');
		this.img.src = this.chooseIcon();
		this.div.appendChild(this.img);
	}

	// adjust style for bars
	else if (this.timetype == voyc.TimeType.Bar) {
		var color;
		if (this.layer == 'bkd') {
			color = voyc.color.getPastel(this.record.c);
		}
		else {
			color = voyc.color.get(this.record.c);
		}
		this.div.style.backgroundColor = color;
		voyc.addClass(this.div,'bar');
		var textColor = (this.record.c < 4) ? voyc.color.white : voyc.color.black;
		this.div.style.color = voyc.color[textColor];
	}
	
	// add headline text
	this.txt = this.record.h;
	this.txtnode = document.createTextNode(this.txt);
	this.div.appendChild(this.txtnode);

	// add class fgd or bkd
	voyc.addClass(this.div,this.layer);

	// DOM event handlers
	var self = this;
	voyc.addEvent(this.div, 'click', function(event) {
		voyc.event.publish('story_selected', 'timebar', {record:self.record, state:'on'});
		return false;
	}); 

	voyc.addEvent(this.div, 'mouseover', function(){
		voyc.event.publish('story_hovered', 'timebar', {state:'on', record:self.record});
	}); 
	voyc.addEvent(this.div, 'mouseout', function(){
		voyc.event.publish('story_hovered', 'timebar', {state:'off', record:self.record});
	});
	voyc.addEvent(this.div, 'mousedown', function(event){
		// prevent grab of scroller
		event = event || window.event;
		if (event.stopPropagation) {
			event.stopPropagation();
		}
		else {
			event.cancelBubble = true;
		}
	});
}

/**
 * Destroy a timebar.
 */
voyc.TimeBar.prototype.destroy = function() {
	this.div = null;
	this.img = null;
	this.record.ts = null;
	delete this;
}

/**
 * Add a bar to the timeline.
 */
voyc.TimeBar.prototype.add = function() {
	if (!this.div) {
		this.create();
	}
	this.timeline[this.layer].div.appendChild(this.div);
//?	this.div.style.top = this.top + 'px';
	this.div.style.height = this.height + 'px';
	this.div.style.fontSize = this.fontSize;
	this.div.style.zIndex = this.zIndex;

	if (this.layer == 'fgd') {
		this.rowNum = this.timeline.assignBarToRowFgd(this.record);
		if (this.rowNum >= 0) {
			this.timeline[this.layer].rows[this.rowNum].bars.push(this);
			this.top = this.rowNum * this.height;			
			this.div.style.top = this.top + 'px';
		}
	}
}

/**
 * Remove a bar from the timeline.
 */
voyc.TimeBar.prototype.remove = function() {
	var bars = this.timeline[this.layer].rows[this.rowNum].bars;
	var len = bars.length;
	for (var i=0; i<len; i++) {
		var x = bars[i];
		if (x == this) {
			bars.splice(i,1);
		}
	}

	if (this.div) {
		this.div.parentNode.removeChild(this.div);
	}
	this.destroy();
}

/**
 * Show this bar.
 */
voyc.TimeBar.prototype.show = function(id, latlng) {
	if (this.div) {
		this.div.style.display = 'block';
	}
}

/**
 * Hide this bar.
 */
voyc.TimeBar.prototype.hide = function(id) {
	if (this.div) {
		this.div.style.display = 'none';
	}
}

/**
 * Set the horizontal position and width.
 */
voyc.TimeBar.prototype.setPosition = function() {
	var pbegin = this.timeline.pixelsFromYears(this.record.b,false);
	var pend = this.timeline.pixelsFromYears(this.record.e,false);

	var pwidth = pend - pbegin;
	if (this.timetype == voyc.TimeType.Dot) {
		pwidth = this.timeline.minPixelsPerDotWidth;
	}
	if (this.timetype == voyc.TimeType.Bar) {
		pwidth -= 5;
	}

	// temp: if timebar crosses entire screen, hide it
	if (pbegin < this.timeline.pixels.begin && pend > this.timeline.pixels.end) {
//		pwidth = 0;
	}

if (!this.div) {
	voyc.debug.alert('hi');
}
	this.div.style.left = Math.floor(pbegin) + 'px';
	this.div.style.width = Math.floor(pwidth) + 'px';
},

/**
 * Set the opacity on this bar.
 */
voyc.TimeBar.prototype.setOpacity = function(opac) {
	var opac = opac || 0;
	if (!opac) {
		// if dot is on-screen, show with proper opacity, else hide
		if (this.timetype == voyc.TimeType.Dot) {
			if (this.record.e >= this.timeline.years.begin && this.record.b <= this.timeline.years.end) {
				this.show();
				if (this.img) {
					var diff = Math.abs(this.record.b - this.timeline.when.decidate);
					var maxdistance = this.timeline.years.end - this.timeline.years.begin;
					opac = (maxdistance-diff)/maxdistance;
					if (opac > .9) opac = 1;
					if (opac < .5) opac = .5;
					this.record.opac = opac;  // save for use by map
//					opac = 1;
				}
			}
			else {
				this.hide();
			}
		}
		else {
			opac = 1;
		}
	}
	this.div.style.opacity = opac ;
	this.div.style.MozOpacity = opac ;
	this.div.style.filter = "alpha(opacity="+opac*100+")";
}

voyc.TimeBar.prototype.incIndex = function() {
//	voyc.TimeBar.zIndex++;
//	if (voyc.TimeBar.zIndex >= voyc.TimeBar.maxZIndex) {
//		voyc.TimeBar.zIndex = voyc.TimeBar.minZIndex;
//	}
	return voyc.TimeBar.zIndex;
}

/**
 * Event Handler. Called when a single record has been hovered.
 * @event
 */
voyc.TimeBar.prototype.onHover = function(evt, pub, obj) {
	if (this.state == 'd') {
		return;
	}
	if (obj.state == 'on') {
		this.state = 'h';
		voyc.addClass(this.div, 'hovered');
		var topdiff = Math.floor((voyc.TimeBar[this.layer].heightHovered - this.height) / 2);
		this.div.style.top = (this.top - topdiff) + 'px';
		this.div.style.height = voyc.TimeBar[this.layer].heightHovered + 'px';
		this.div.style.fontSize = voyc.TimeBar[this.layer].fontsizeHovered;
		this.div.style.zIndex = voyc.TimeBar[this.layer].zIndexHovered;
	}
	else if (obj.state == 'off') {
		this.state = 'n';
		voyc.removeClass(this.div, 'hovered');
		this.div.style.top = this.top + 'px';
		this.div.style.height = this.height + 'px';
		this.div.style.fontSize = this.fontSize;
		this.div.style.zIndex = this.zIndex;
	}
	if (this.img) {
		this.img.src = this.chooseIcon();
		this.setOpacity();
	}
}

voyc.TimeBar.prototype.onSelect = function(evt,pub,obj) {
	// unselect the previous selection
	if (this.timeline.selected) {
		var prev = this.timeline.selected;
		prev.state = 'n';
		if (prev.img) {
			prev.img.src = voyc.Timeline.imgBase + this.color + '-dot-sm-n.png';
		}
		voyc.removeClass(prev.div, 'hovered');
	}

	// select this one
	this.timeline.selected = this;
	this.state = 'd';
	if (this.img) {
		this.img.src = this.chooseIcon();
	}
}

voyc.TimeBar.prototype.chooseIcon = function() {
	var shape = 'dot';
	var size = 'sm';
	var ext = (this.state == 'd') ? 'gif' : 'png';
	return voyc.Timeline.imgBase + this.color + '-' + shape + '-' + size + '-' + this.state + '.' + ext;
}

voyc.TimeType = {
	None:0,
	Dot:2,
	Bar:3
}
