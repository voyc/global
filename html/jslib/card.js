// (c) Copyright 2005,2014 Voyc.com
/**
 * Creates a Card Factory object.
 *
 * @class
 * Represents a Factory that creates popup divs.
 * Card is a singleton.  Create one instance on the voyc namespace.
 *
 * @constructor
 */
voyc.Card = function() {
	this.zIndex = 1;
	this.cards = {};
	this.className = 'voyc-card';
	this.defaultOptions = {
		top:'100px',
		left:'100px',
		className:null,
		draggable:true,
		content:'Lipsum dorum hokum.',
		id:'mypopup',
		title:'Title',
		parentNode:document.body,
		closeOnBlur:false,
		hasHandle:true,
		hasCloseButton:true
	}
}

/**
 * Create a card, a popup window-like div.
 * @return e Returns an HTML div element.
 * <pre>
 * Usage:
 *     var divElement = voyc.card.create({
 *         left:'100px',
 *         top:'100px',
 *         content:'This is the starting content.',
 *         title:'My Title'
 *     });
 * </pre>
 */
voyc.Card.prototype.create = function(options) {
	var opt = voyc.mergeOptions(this.defaultOptions, options);
	if (!opt.parentNode) {
		opt.parentNode = document.body;
	} 

	var e = document.createElement('div');
	e.id = opt.id;
	e.className = this.className;
	if (opt.className) {
		voyc.addClass(e, opt.className);
	}
	e.style.top = opt.top;
	e.style.left = opt.left;
	e.style.zIndex = this.zIndex++;
	opt.parentNode.appendChild(e);

	if (opt.hasHandle) {
		var h = document.createElement('div');
		h.id = opt.id + '-handle';
		h.className = this.className + '-handle';
		if (opt.className) {
			voyc.addClass(h, opt.className + '-handle');
		}
		h.innerHTML = opt.title;
		e.appendChild(h);
	}

	if (opt.hasCloseButton) {
		var b = document.createElement('button');
		b.id = opt.id + '-closebtn';
		b.className = this.className + '-closebtn';
		if (opt.className) {
			voyc.addClass(b, opt.className + '-closebtn');
		}
		b.innerHTML = 'X';
		voyc.addEvent(b,'click',function() {e.style.display = 'none';});
		e.appendChild(b);
	}

	var c = document.createElement('div');
	c.id = opt.id + '-content';
	c.className = this.className + '-content';
	if (opt.className) {
		voyc.addClass(c, opt.className + '-content');
	}
	c.innerHTML = opt.content;
	e.appendChild(c);

	if (opt.draggable && voyc.dragger) {
		voyc.dragger.enableDrag(e,h);
		var self = this;
		voyc.dragger.addListener(e,'grab',function(x,y,elem) {
			elem.style.zIndex = self.zIndex++;
		});
	}

	if (opt.closeOnBlur) {
		voyc.addEvent(document.body,'keydown',function() {e.style.display = 'none';});
		voyc.addEvent(document.body,'mousedown',function() {e.style.display = 'none';});
	}

	this.cards[opt.id] = e;
	return e;
}

voyc.Card.prototype.destroy = function(id) {
	var e = this.cards[id];
	e.parentNode.removeChild(e);
}

voyc.Card.prototype.show = function(id) {
	var e = this.cards[id];
	e.style.display = 'block';
}
voyc.Card.prototype.hide = function(id) {
	var e = this.cards[id];
	e.style.display = 'none';
}

voyc.Card.prototype.hideAll = function() {
	for (id in this.cards) {
		this.hide(id);
	}
}

voyc.Card.prototype.destroyAll = function() {
	for (id in this.cards) {
		this.destroy(id);
	}
}
