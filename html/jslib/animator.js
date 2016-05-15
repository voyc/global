// (c) Copyright 2005,2014 Voyc.com
/**
 * Creates a new Animator object.
 * @class Fires a callback every n milleseconds.
 */
voyc.Animator = function() {
	this.fps = 64;          // frames per second
	this.callback;
	this.mpf = 0;           // microseconds per frame
	this.playing = false;   // in flight
}

voyc.Animator.prototype = {
	/**
	 * Start the animation.
	 */
	start : function() {
		if (this.playing) return;
		this.playing = true;
		this.setFps();
		this.loop();
	},

	/**
	 * Stop the animation.
	 */
	stop : function() {
		if (!this.playing) return;
		this.playing = false;
	},

	/**
	 * Set the frames per second.  Default is 64.
	 * @param {Number} n Frames per second.
	 */
	setFps : function(n) {
		if (n) {
			this.fps = n;
		}
		this.mpf = parseInt(1000/this.fps);
	},

	/**
	 * Called repeatedly by setTimeout to effect the animation.
	 * @private
	 */
	loop : function() {
		if (this.playing) {
			this.callback();
			var self = this;
			setTimeout(function() {self.loop();}, this.mpf);
		}
		else {
			this.playing = false;
		}
	}
}
