/**
 * Make a copy of an array.
 */
voyc.cloneArray = function(a) {
	var n = [];
	for(var i in a) {
		n[i]=a[i];
	}
	return n;
}

/**
 * Combine two objects into one.
 */
voyc.mergeOptions = function(obj1, obj2) {
	var o = {};
	if (obj1) {
		for (var i in obj1) {
			o[i] = obj1[i];
		}
	}
	if (obj2) {
		for (var i in obj2) {
			o[i] = obj2[i];
		}
	}
	return o;
}

/**
 * Pad a string. Left-fill with zeros.
 */
voyc.pad = function(s,n,bthousands) {
	s = String(s);
	n = parseInt(n) || 2;
	var t=s;
	while (t.length < n) {
		t = '0'+t;
	}
	if (bthousands && t.length > 3) {
		var i = t.length;
		t = t.substr(0,i-3) + ',' + t.substr(i-3);
	}
	return t;
}

/**
 * Find the absolute x,y position of an element within the browser window.
 */
voyc.getAbsolutePosition = function(e) {
	var x = 0;
	var y = 0;
	if (e.offsetParent)
	{
		while (e.offsetParent) {
			y += e.offsetTop
			x += e.offsetLeft
			e = e.offsetParent;
		}
	}
	else if (e.x) {
		x += e.x;
		y += e.y;
	}
	return {x:x,y:y};
}

/**
 * Get filename and line number of current location in callstack.
 */
voyc.getFileLine = function(numCallersBack) {
	var numBack = numCallersBack || 2;
	var s = '';
	var err = new Error();
	if (err.stack) {
	    var stackFrameStrings = err.stack.split('\n');
		var stackLine = stackFrameStrings[numBack];
		var parts = stackLine.trim().split(/[ :]/);
		var path = parts[4];
		var linenumber = parts[5];
		if (path && linenumber) {
			var a = path.split('/');
			var filename = a[a.length-1];
			s = filename + '(' + linenumber + ')';
		}
	}
	return s;
}

/**
 * dollar shortcut
 */
voyc.$ = function(s) {
	return document.getElementById(s);
}
 
/**
 * Load a javascript file dynamically
 */
voyc.appendScript = function(url,id) {
	var script = document.createElement('script');
	script.type = 'text/javascript';
	script.src = url;
	if (id) {
		script.id = id;
	}
	document.getElementsByTagName('head')[0].appendChild(script);
}
    
/**
	Make a class a subclass of another by coping all members of one to the other.
*/
voyc.subClass = function(sub, base) {
	for(var prop in base['prototype'])
		if (!sub['prototype'][prop])
			sub['prototype'][prop] = base['prototype'][prop];
}

/**
	Make a class a subclass of another by coping all members of one to the other.
*/
voyc.addEvent = function(element,eventname,handler) {
	if (element.addEventListener) {
		element.addEventListener( eventname, handler, false);
	}
	else if (element.attachEvent) {
		element.attachEvent( 'on'+eventname, handler);
	}
}

voyc.hasClass = function(ele,cls) {
	if (!ele || !ele.className) {
		return false;
	}
	return ele.className.match(new RegExp("(\\s|^)"+cls+"(\\s|$)"));
}

voyc.addClass = function(ele,cls) {
	if (!ele) {
		return false;
	}
	if (!voyc.hasClass(ele,cls)) {
		ele.className+=" "+cls;
	}
}

voyc.removeClass = function(ele,cls) {
	if (voyc.hasClass(ele,cls)) {
		var reg=new RegExp("(\\s|^)"+cls+"(\\s|$)");
		ele.className=ele.className.replace(reg," ")
	}
}
