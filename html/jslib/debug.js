// (c) Copyright 2005,2014 Voyc.com
/**
 * Creates a Debug object.
 * @class Writes alerts to the console or to popup div.
 *
 * Debug is a singleton.  Create it one time on the voyc namespace.
 * Public methods
 *    voyc.debug = new voyc.Debug(options);
 *    voyc.alert(msg);     // where msg is a string
 *    voyc.dumpElement(e); // where e is a DOM element
 *    voyc.dumpObject(o);  // where o is a javascript object
 *
 * @constructor
 * @param {boolean} debug True if debug is to be turned on.
 */
voyc.Debug = function(options) {
	if ( arguments.callee._singletonInstance )
		return arguments.callee._singletonInstance;
	arguments.callee._singletonInstance = this;
	this.defaultOptions = {
		logSize:400,
		useConsole:true,
		div:null
	}
	this.options = voyc.mergeOptions(this.defaultOptions, options);
	this.log = [];
	this.indent = 0;
	this.prevtime = new Date();
	this.starttime = new Date();
}

voyc.Debug.prototype = {
	/**
	 * Change the options.
	 */
	setOptions: function(opt) {
		this.options = voyc.mergeOptions(this.options, opt);
	},
	/**
	 * Post a message to the log.
	 */
	post: function(r) {
		this.log.push(r);
		if (this.log.length > this.options.logSize) {
			this.log.shift();
		}
	},
	
	/**
	 * Compose and post a messsage to the log.   Optionally, refresh the debug div.
	 * @param {String} msg The message to post.
	 */
	alert: function(msg,stackdepth) {
		// compose message with timings, filename, linenumber
		var now = new Date();
		var elapsed = now - this.prevtime;
		this.prevtime = now;
		var cum = now - this.starttime;
		stime = voyc.pad(String(elapsed),5);
		xtime = voyc.pad(String(cum),5);
		var r = xtime + ' ' + stime + ' ' + msg + '  ::' + voyc.getFileLine(stackdepth || 3);

		// post to log
		this.post(r);

		// optionally, write to user-supplied div
		if (this.options.div) {
			var s = '';
			for(m in this.log) {
				s += this.log[m] + '<br/>';
			}
			this.options.div.innerHTML = s;
		}

		// optionally, write to Chrome console
		if (this.options.useConsole && typeof window.console != 'undefined' && console.log) {
			console.log(r);
		}
	},
	
	/**
	 * Write messages to the debug window to show the value of each member of an HTML element.
	 * @param {HTMLElement} e The HTML element you want to dump to the debug window.
	 */
	dumpElement : function(e) {
		if (typeof(e) == 'undefined') {
			this.alert('DumpElement: undefined');
			return;
		}

		this.alert('DumpElement id='+e.id);

		if (e.hasAttributes) {
			this.alert('attributes:');
			var a = e.attributes;
			var num = a.length;
			var s = '';
			for (var i=0; i<num; i++) {
				s = i+') '+a[i].name+' = '+a[i].value;
				this.alert(s);
			}
		}
		else {
			this.alert('attributes: none');
		}

		if (e.hasChildNodes()) {
			this.alert('children:');
			var a = e.childNodes;
			var num = e.childNodes.length;
			var s = '';
			for (var i=0; i<num; i++) {
				//s = i+') id='+a[i].getAttribute('id')+' visibility='+a[i].style.visibility+' z='+a[i].style.zIndex;
				s = i+') '+a[i].nodeName+' id='+a[i].id;
				this.alert(s);
			}
		}
		else {
			this.alert( 'children: none');
		}
	},
	
	/**
	 * Write messages to the debug window to show the value of each member of a Javascript Object.
	 * @param {Object} obj The Javascript Object you want to dump to the debug window.
	 * @param {Number} depth The recursive depth of member objects to dump to the debug window.
	 */
	dumpObject : function(obj,depth) {
		this.maxdepth = depth ? depth : 10;
		this.dumpObjectR(obj);
	},
	
	/**
	 * Write messages to the debug window to show the value of each member of a Javascript Object.
	 * Called repeatedly by dumpObject to recurse through Objects.
	 * @private
	 * @param {HTMLElement} e The HTML element to be dumped to the debug window.
	 */
	dumpObjectR : function(obj) {
		var s = '';
		for (var i=0; i<this.indent; i++) {
			s += '&nbsp;&nbsp;&nbsp;'
		}
		this.alert( s+'dumpObject: ');
		for (x in obj) {
			this.alert( s+x+'='+obj[x]+' : '+typeof(obj[x]));
			if (typeof(obj[x]) == 'object' && this.indent < this.maxdepth-1) {
				this.indent++;
				this.dumpObjectR(obj[x]);
				this.indent--;
			}
		}
	}
}
