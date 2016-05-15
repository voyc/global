// (c) Copyright 2005, 2014 Voyc.com
/**
 * Clone of Google GXmlHttp object
 * @function
 */
voyc.JXmlHttp = function() {
}

voyc.JXmlHttp.create=function(){
	if(typeof ActiveXObject!="undefined"){
		try{
			return new ActiveXObject("Microsoft.XMLHTTP")
		}
		catch(a){}
	}
	if(typeof XMLHttpRequest!="undefined"){
		return new XMLHttpRequest()
	}
	return null
}

/**
 * Create an Xhr object.
 * @constructor
 *
 * @class
 * Server communications.
 * Wraps Microsoft.XMLHTTP OR XMLHttpRequest()
 */
voyc.Xhr = function() {
	this.req = null
	if(typeof ActiveXObject!="undefined"){
		try{
			this.req = new ActiveXObject("Microsoft.XMLHTTP")
		}
		catch(a){}
	}
	if(typeof XMLHttpRequest!="undefined"){
		this.req = new XMLHttpRequest()
	}
	this.retries = 0;
	this.maxretries = 0;
	this.params = {};
	this.data = "";
	this.method = "POST";   // GET, PUT, POST, DELETE
	this.program = "";
	this.callback = null;
}

/**
 * URL to access server services.
 * @type String
 * @static
 */
voyc.Xhr.base = "http://www.voyc.com/svc/";

voyc.Xhr.prototype = {
	/**
	 * Send a request to a server.
	 */
	callServer :function() {
		var params = this.composeParameters(this.params);
		var url = voyc.Xhr.base + this.program + params;
		var self = this;
		/** @ignore */
		this.req.onreadystatechange = function() { self._callback() };

		this.req.open(this.method, url, true);

		this.req.onabort = function() {
			voyc.debug.alert('xhr in onabort'); 
		};

		this.req.onerror = function() {
			voyc.debug.alert('xhr in onerror'); 
		};

		// note: Chrome has its own timeout processing.
		// When Chrome times out, xhr returns status 0 and this callback is not called.
		this.req.ontimeout = function() {
			voyc.debug.alert('xhr in ontimeout'); 
		};
		//this.req.timeout = 5000;

		this.req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
		this.req.send("data="+escape(this.data));
		voyc.debug.alert('xhr request sent: ' + escape(this.data));
	},
	/**
	 * Called on return from the server.
	 * @private
	 */
	_callback : function() {
		if (this.req.readyState != 4) {
			return;
		}
		var rc = true;
		try {
			if (this.req.status != 200 && this.req.status != 0) {
				voyc.debug.alert("xhr callback status="+this.req.status)
				rc = false;
			}
			else if (!this.req.responseText) {
				voyc.debug.alert("xhr callback responseText is empty")
				rc = false;
			}
		}
		catch(error) {
			voyc.debug.alert("xhr caught callback error="+error)
			rc = false;
		}
	
		if (!rc) {
			if (this.retries < this.maxretries) {
				voyc.debug.alert("xhr retrying");
				this.retries++;
				this.callServer();
			}
			else {
				if (this.callback) {
					this.callback("server error " + this.req.status);
				}
			}
		}
		else {
			if (this.callback) {
				voyc.debug.alert('xhr response received');
				this.callback(this.req.responseText, this.req);
			}
		}
	},
	/**
	 * Compose a query string to call a service.
	 * @private
	 * @params {Object} params Key-value pairs of parameters to pass to a service.
	 */
	composeParameters : function(params) {
		var s = '';
		var a = "?";
		for (i in params) {
			s += a + i + "=" + params[i];
			a = "&";
		}
		return s;
	}
}
