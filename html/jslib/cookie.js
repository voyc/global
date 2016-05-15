// (c) Copyright 2005,2014 Voyc.com
/**
 * The constructor is not used.
 * @class Static class used to set, get, and delete cookies.
 * Usage:
 *    var acookie = voyc.Cookie.get("a");
 */
voyc.Cookie = function() {
}

/**
 * A string prefixed to all cookie names.
 * @static
 */
voyc.Cookie.prefix = "";

/**
 * Set a cookie.
 * @param {String} name The name of the cookie.
 * @param {String} value The value to be assigned to this cookie.
 * @param {String} expires (optional) The date the cookie is to expire.
 *     If omitted, the cookie expires when the session is ended.
 * @param {String} path (optional) The path scope of the cookie.  
 *     If specified, only pages downloaded from this path can read the cookie.
 * @param {String} domain (optional) The domain scope of this cookie.  
 *     If specified, only pages downloaded from this domain can read the cookie.
 * @param {boolean} secure (optional) If true, this is a secure cookie. 
 *     It is encrypted and cannot be read from browser tools.
 */
voyc.Cookie.set = function(name, value, expires, path, domain, secure) {
	var sname = voyc.Cookie.prefix + '_' + name;
	// default to six months
	if (!expires) {
		var now = new Date();
		now.setTime(now.getTime() + 180 * 24 * 60 * 60 * 1000);
		expires = now;
	}
	
	document.cookie= sname + "=" + escape(value) +
		((expires) ? "; expires=" + expires.toGMTString() : "") +
		((path) ? "; path=" + path : "") +
		((domain) ? "; domain=" + domain : "") +
		((secure) ? "; secure" : "");
}

/**
 * Get the value of a cookie.
 * @param {String} name The name of the cookie
 */
voyc.Cookie.get = function(name) {
	var sname = voyc.Cookie.prefix + '_' + name;
	var dc = document.cookie;
	var prefix = sname + "=";
	var begin = dc.indexOf("; " + prefix);
	if (begin == -1) {
		begin = dc.indexOf(prefix);
		if (begin != 0) return null;
	}
	else {
		begin += 2;
	}
	var end = document.cookie.indexOf(";", begin);
	if (end == -1) {
		end = dc.length;
	}
	var value = unescape(dc.substring(begin + prefix.length, end));
	if (value == 'deletedcookie') {
		value = null;
	}
	return value;
}

/**
 * Delete a cookie.
 * @param {String} name The name of the cookie
 */
voyc.Cookie.del = function(name, path, domain) {
	if (voyc.Cookie.get(name)) {
		var sname = voyc.Cookie.prefix + '_' + name;
		document.cookie = sname + "=" + 'deletedcookie' +
			((path) ? "; path=" + path : "") +
			((domain) ? "; domain=" + domain : "") +
			"; expires=Thu, 01-Jan-70 00:00:01 GMT";
	}
}
