// (c) Copyright 2005,2014 Voyc.com
/**
 * Creates an Event object.
 * @class Implements a Subscribe and Publish pattern.
 *
 * Event is a singleton.  Create it one time on the voyc namespace.
 *
 * @constructor
 */
voyc.Event = function() {
	if ( arguments.callee._singletonInstance )
		return arguments.callee._singletonInstance;
	arguments.callee._singletonInstance = this;

	this.events = {};  // name/value pairs: evt/callback array
	this.suspended = false;
}

/**
 * Subscribe to an event.
 * @param {String} evt The name of the event.
 * @param {String} subscriber The name of the subscriber.
 * @param {Function} callBack The function to call when this event is published.
 */
voyc.Event.prototype.subscribe = function (evt, subscriber, callBack, alert) {
	// if no one has subscribed to this evt, create it now
	if (!this.events[evt]) {
		this.events[evt] = [];
	}

	//voyc.debug.alert( ['Event.subscribe', evt, subscriber],4);

	// add this callback to the callback array for this evt
	var balert = (typeof alert == 'undefined') ? true : alert;
	this.events[evt].push( {'subscriber':subscriber, 'cb':callBack, 'alert':balert});
}

/**
 * Publish an event.
 * @param {String} evt The name of the event.
 * @param {String} publisher The name of the publishing object.
 * @param {Object} params A key-value object of parameters.
 */
voyc.Event.prototype.publish = function (evt, publisher, obj) {
	// if no one has subscribed to this evt, exit now
	if (!this.events[evt]) {
	   	//voyc.debug.alert(['Event.publish', evt, publisher, 'not subscribed'],4);
		return;
	}
	
	// if suspended, exit now
	if (this.suspended) {
		//voyc.debug.alert(['Event.publish', evt, publisher, 'suspended'],4);
		return;
	}
	
	// pass these parameters to each subscriber
	obj = obj || {};
	var params = [];
	params.push(evt);
	params.push(publisher);
	params.push(obj);
	
	// call each callback in the callback array
	var event = this.events[evt];
	for (var i in event) {
		if (event[i].subscriber == publisher) {
			if (event[i].alert) {
				if (voyc.options.bEventLogging) {
				   	voyc.debug.alert(['Event.publish', evt, publisher, 'ignored by publisher'],4);
				}
			}
		}
		else {
			if (event[i].alert) {
				if (voyc.options.bEventLogging) {
					voyc.debug.alert(['Event.publish', evt, publisher, event[i].subscriber],4);
				}
			}
			event[i].cb.apply(this,params);
		}
	}
}

/**
Suspend publishing.
*/
voyc.Event.prototype.suspend = function(bool) {
	this.suspended = bool;
}
