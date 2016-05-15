// (c) Copyright 2005,2014 Voyc.com
/**
 * Creates a Dragger object.
 * 
 * @class Supports dragging of any HTML element.
 * A singleton object. 
 * Three public methods: enableDrag(), addListener(), showInternals() 
 * @constructor
 */
voyc.Dragger = function() {
	if ( arguments.callee._singletonInstance )
		return arguments.callee._singletonInstance;
	arguments.callee._singletonInstance = this;

	this.internaldiv = null;
	this.mousex = 0;
	this.mousey = 0;
	this.grabx = 0;
	this.graby = 0;
	this.orix = 0;
	this.oriy = 0;
	this.oriw = 0;
	this.orih = 0;
	this.elex = 0;
	this.eley = 0;
	this.algor = 0;
	this.dragee = null;
	this.dragobj = null;
	this.savemousemove = null;
	this.savemouseup = null;
	this.savemousedown = null;
}

voyc.Dragger.prototype = {
	/**
	 * Make a specified element draggable.
	 * @public
	 */
	enableDrag: function(e,handle) {
		var self = this;
		var dragged = e;
		if (handle) {
			dragged = handle;
			dragged.setAttribute('voycdragee',e.id);  // sorry. e must have an id.
		}
		dragged.onmousedown = function(event) {
			self.grab(event, dragged);
		};
	},

	/**
	 * Specify callback function for 'grab', 'drag' or 'drop' event.
	 * @public
	 */
	addListener: function(e, eventName, callback) {
		var self = this;
		var dragged = e;
		if (eventName == 'grab') {
			dragged.ongrab = callback;
		}
		if (eventName == 'drag') {
			dragged.ondrag = callback;
		}
		if (eventName == 'drop') {
			dragged.ondrop = callback;
		}
	},

	/**
	 * Copies the x,y coordinates of the mouse from the event into this object.
	 * @param {HTMLEvent} e Optional. The current event object.
	 */
	getMouseXY : function(e) { 
		// move(event) implied on NS, move(null) implied on IE
	  	if (!e) e = window.event; // works on IE, but not NS (we rely on NS passing us the event)
		
		if (e) { 
			// this doesn't work on IE6!! (works on FF,Moz,Opera7)
			if (e.pageX || e.pageY) {
				this.mousex = e.pageX;
				this.mousey = e.pageY;
				this.algor = '[e.pageX]';
				if (e.clientX || e.clientY) this.algor += ' [e.clientX] '
			}
			// works on IE6,FF,Moz,Opera7
			else if (e.clientX || e.clientY) {
				this.mousex = e.clientX + document.body.scrollLeft;
				this.mousey = e.clientY + document.body.scrollTop;
				this.algor = '[e.clientX]';
				if (e.pageX || e.pageY) this.algor += ' [e.pageX] '
			}
		}
	},
	
	/**
	 * Event Handler.  Called when the mouse is moved.
	 * @event
	 */
	move : function(e) {
		// e is event object
		this.getMouseXY(e);
		this.refreshInternals(e);
	},
	
	/**
	 * Event Handler.  Called when the mouse button goes down on an element.
	 * @event
	 */
	grab : function(event, element) {
		this.getMouseXY(event);
		this.savemousedown = document.onmousedown;
		/**@ignore*/
		document.onmousedown = function() { return false; } // in NS this prevents cascading of events, thus disabling text selection
		this.dragobj = element;
		var s = this.dragobj.getAttribute('voycdragee');
		this.dragee = (s) ? document.getElementById(s) : this.dragobj;
		this.savemousemove = document.onmousemove;
		
		var self = this;
		/**@ignore*/
		document.onmousemove = function(e) { self.drag(e); };
		
		this.savemouseup = document.onmouseup;
		var self = this;
		/**@ignore*/
		document.onmouseup = function() { self.drop(); };
		this.grabx = this.mousex;
		this.graby = this.mousey;
		this.elex = this.orix = this.dragee.offsetLeft;
		this.eley = this.oriy = this.dragee.offsetTop;
		this.oriw = this.dragee.offsetWidth;
		this.orih = this.dragee.offsetHeight;

		if (this.dragee.ongrab) {
			ok = this.dragee.ongrab(this.elex, this.eley, this.dragee);
		}

		this.refreshInternals();
	},
	
	/**
	 * Event Handler.  Called when the mouse is moved while holding the mouse button down.
	 * @event
	 */
	drag : function(e) {
		// e is the event object
		this.getMouseXY(e);
		if (this.dragobj) {
			this.elex = this.orix + (this.mousex-this.grabx);
			this.eley = this.oriy + (this.mousey-this.graby);
			
			var ok = {"x":this.elex, "y":this.eley};
			if (this.dragobj.ondrag) {
				ok = this.dragobj.ondrag(this.elex, this.eley);
			}

			if (ok) {	
				this.dragee.style.left = ok.x + 'px';
				this.dragee.style.top  = ok.y + 'px';
			}
		}
		this.refreshInternals(e);  // when debugging, IE does not scroll smoothly
		//e.cancelBubble = true;  // prevent event bubbling in IE6
		return false; // in IE this prevents cascading of events, thus text selection is disabled // oh yeah?  
	},
	
	/**
	 * Event Handler.  Called when the mouse button goes up after dragging an element.
	 * @event
	 */
	drop : function() {
		if (this.dragobj) {
	
			if (this.dragee.ondrop) {
				this.dragee.ondrop( this.elex, this.eley, this.dragee);
			}
	
			this.dragobj = null;
	
		}
		this.refreshInternals();
		document.onmousemove = this.savemousemove;
		document.onmouseup = this.savemouseup;
		document.onmousedown = this.savemousedown;
	},
	
	/**
	 * Set the div id in which to display internals.
	 * @public
	 */
	setInternals : function(e) {	
		this.internaldiv = e;
		var s = "<table>"+
			"<tr><td>parameter</td><td> value </td></tr>"+
			"<tr><td>navi.appName</td><td><span id='dragint_browser'>&nbsp;</span></td></tr>"+
			"<tr><td>window.event</td><td><span id='dragint_winevent'>&nbsp;</span></td></tr>"+
			"<tr><td>auto event</td><td><span id='dragint_autevent'>&nbsp;</span></td></tr>"+
			"<tr><td>algorithm</td><td><span id='dragint_algor'>&nbsp;</span></td></tr>"+
			"<tr><td>mousex,y</td><td><span id='dragint_mousex'>&nbsp;</span>, <span id='dragint_mousey'>&nbsp;</span></td></tr>"+
			"<tr><td>dragobj</td><td><span id='dragint_dragobj'>&nbsp;</span></td></tr>"+
			"<tr><td>grabx,y</td><td><span id='dragint_grabx'>&nbsp;</span>, <span id='dragint_graby'>&nbsp;</span></td></tr>"+
			"<tr><td>orix,y</td><td><span id='dragint_orix'>&nbsp;</span>, <span id='dragint_oriy'>&nbsp;</span></td></tr>"+
			"<tr><td>elex,y</td><td><span id='dragint_elex'>&nbsp;</span>, <span id='dragint_eley'>&nbsp;</span></td></tr>"+
			"</table>";
		if (this.internaldiv) {
			this.internaldiv.innerHTML = s;
		}
	},
	
	/**
	 * Refresh the internals window.
	 * @private
	 */
	refreshInternals : function(e) {
		if (!this.internaldiv) return;
		document.getElementById('dragint_winevent').innerHTML = window.event ? window.event.type : '(na)';
		document.getElementById('dragint_autevent').innerHTML = e ? e.type : '(na)';
		document.getElementById('dragint_mousex').innerHTML = this.mousex;
		document.getElementById('dragint_mousey').innerHTML = this.mousey;
		document.getElementById('dragint_grabx').innerHTML = this.grabx;
		document.getElementById('dragint_graby').innerHTML = this.graby;
		document.getElementById('dragint_orix').innerHTML = this.orix;
		document.getElementById('dragint_oriy').innerHTML = this.oriy;
		document.getElementById('dragint_elex').innerHTML = this.elex;
		document.getElementById('dragint_eley').innerHTML = this.eley;
		document.getElementById('dragint_algor').innerHTML = this.algor;
		document.getElementById('dragint_dragobj').innerHTML = this.dragobj ? (this.dragobj.id ? this.dragobj.id : 'unnamed object') : '(null)';
	}
}
