// (c) Copyright 2009 MapTeam, Inc.

/**
 * Creates an Updater object.
 * @constructor
 * @param {String} program The name of the program to call.
 * @param {String} u The username.
 * @param {String} p The password.
 *
 * @class
 * Implements client-side functions to call a REST server.
 */
function Updater(program,u,p) {
	this.program = program || "update";
	this.u = u || "";
	this.p = p || "";
	this.callback = null;
}

Updater.prototype = {
	/**
	 * Pass a GET request to a service.
	 */
	get : function(id,callback) {
		this.callback = callback;
		this.call("get",id,null);
	},

	/**
	 * Pass a POST request to a service.
	 */
	post : function(xml,callback) {
		this.callback = callback;
		this.call("update",null,xml);
	},

	/**
	 * Pass a PUT request to a service.
	 */
	put : function(xml,callback) {
		this.callback = callback;
		this.call("insert",null,xml);
	},

	/**
	 * Call the service.
	 * @private
	 */
	call : function(action,id,xml) {
		var xhr = new Xhr();
		var self = this;
		/** @ignore */
		xhr.callback = function(response,req) {self.onCallReturn(response,req);};
		xhr.params.u = this.u;
		xhr.params.p = this.p;
		xhr.params.id = id || null;  // required on get
		xhr.data = xml || null;  // required on put or post
		xhr.method = (action=="get") ? "GET" : "POST";
		xhr.program = this.program;
		xhr.action = action;
		xhr.callServer();
	},

	/**
	 * Event Handler.  Called on return from the server.
	 * @private
	 */
	onCallReturn : function(response,req) {
		if (this.callback) {
			this.callback(response,req);
		}
	}
}
// (c) Copyright 2009 MapTeam, Inc.
