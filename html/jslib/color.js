// (c) Copyright 2005,2014 Voyc.com
/**
 * Create a new Color object.
 * @class A singleton that manages a global color stack.
 * @constructor
 */
voyc.Color = function() {
	if ( arguments.callee._singletonInstance )
		return arguments.callee._singletonInstance;
	arguments.callee._singletonInstance = this;

	this.color = [
		'#000000',  // 0 black
		'#ff0000',  // 1 red
		'#00ff00',  // 2 green
		'#0000ff',  // 3 blue
		'#ffff00',  // 4 yellow
		'#00ffff',  // 5 cyan
		'#ff00ff',  // 6 magenta
		'#ffffff'   // 7 white
	];
	this.pastel = [
		'#000000',  // 0 black
		'#ffcccc',  // 1 red
		'#ccffcc',  // 2 green
		'#ccccff',  // 3 blue
		'#ffffcc',  // 4 yellow
		'#ccffff',  // 5 cyan
		'#ffccff',  // 6 magenta
		'#ffffff'   // 7 white
	];
	this.black = 0;
	this.white = 7;
	this.min = 1;
	this.max = 6;
	this.n = this.min;

	this.colornames = {
		0:'black',
		1:'red',
		2:'green',
		3:'blue',
		4:'yellow',
		5:'cyan',
		6:'magenta',
		7:'white'
	};
}

/**
 * Get the color for a specified index.
 * @param {integer} id The color index.
 * @return {color} The color value.
 */
voyc.Color.prototype.get = function(n) {
	range = function(n,min,max) {
		var r = Math.min(n,max);
		r = Math.max(n,min);
		return r;
	}
	var i = range(n,this.min,this.max);
	return this.color[i];
}

/**
 * Get next color index.
 * @return {integer} id Next color index.
 */
voyc.Color.prototype.next = function() {
	this.n++;
	if (this.n > this.max) {
		this.n = this.min;
	}
	return this.n;
}

/**
 */
voyc.Color.prototype.getPastel = function(n) {
	range = function(n,min,max) {
		var r = Math.min(n,max);
		r = Math.max(n,min);
		return r;
	}
	var i = range(n,this.min,this.max);
	return this.pastel[i];
}
