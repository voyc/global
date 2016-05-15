// (c) Copyright 2008, 2014 Voyc.com
/**
 * Creates a Detail object.
 * @constructor
 * @param {HTMLElement} e The container element for the Detail UI.
 *
 * @class
 * Represents the Detail UI Object.
 */
voyc.Detail = function(e) {
	this.e = e;
	this.id = 0;
	this.version = 0;
	this.score = 0;
	this.marker = null;
	this.editing = false;
	this.patternStatus = /\<status\>(.*?)\<\/status\>/;
	this.patternMessage = /\<message\>(.*?)\<\/message\>/;
	this.patternId = /\<id\>(.*?)\<\/id\>/;
}

voyc.Detail.prototype = {
	create: function() {
		var self = this;
		var div = document.createElement('div');
		div.id = 'content';
		div.className = 'detailComponent';
		div.innerHTML = voyc.Detail.html;
		this.e.appendChild(div);
		
		voyc.event.subscribe("detail_ready", "Detail", function(evt,pub,obj) {self.onDetailReady(evt,pub,obj);});
	},

	layout: function() {
		this.displayScore();
		var self = this;
		$('voteup').onclick=function() {self.voteup(this)};
		$('voteup').onmouseover=function() {self.voteover(this)};
		$('voteup').onmouseout=function() {self.voteout(this)};

		$('votedown').onclick=function() {self.votedown(this)};l
		$('votedown').onmouseover=function() {self.voteover(this)};
		$('votedown').onmouseout=function() {self.voteout(this)};
	},
	voteup: function(el) {
		if (!g.user.requireLogin()) return;
		this.score++;
		this.voted();
		g.user.vote(this.id, 1);
	},			
	votedown: function(el) {
		if (!g.user.requireLogin()) return;
		this.score--;
		this.voted();
		g.user.vote(this.id, -1);
	},			
	voteover: function(el) {
		el.className = "over";
	},			
	voteout: function(el) {
		el.className = "out";
	},			
	voted: function() {
		this.displayScore();
		voyc.$('voteup').style.width = "0px";
		voyc.$('votedown').style.width = "0px";
	},
	displayScore: function() {
		voyc.$('votescore').innerHTML = this.score;
	},

	/**
	 * Voyc Event Handler
	 */
	onDetailReady: function(evt,pub,obj) {
		voyc.debug.alert('Detail.onDetailReady');
		var record = obj.record;

		voyc.voyc.layout.switchPanel('content');

		this.version = record.v;
		
		if (record.iu) {
			voyc.$('photo').src = record.iu;
		}
		else {
			voyc.$('photo').src = "images/no-photo.png";
		}

		voyc.$('headline').innerHTML = record.h;
		voyc.$('abstract').innerHTML = record.s;
		voyc.$('source').innerHTML = record.src;
		voyc.$('placename').innerHTML = record.plc;
		voyc.$('author').innerHTML = record.aut;
		voyc.$('recordid').innerHTML = record.id;
		voyc.$('colon').style.display = (record.aut) ? 'inline' : 'none';

		this.score = record.mag;
		this.displayScore();
		if (record.vote) {
			voyc.$('voteup').style.width = "0px";
			voyc.$('votedown').style.width = "0px";
		}
		else {
			voyc.$('voteup').style.width = "15px";
			voyc.$('votedown').style.width = "15px";
		}

		voyc.$('fullstory').href = record.su;
		voyc.$('author').href = "search?q=author:" + record.aut;
		voyc.$('source').href = "search?q=source:" + record.src;

		voyc.$('time').innerHTML = record.wb.format('lcd-minute');

		//if (record.tt == 1) {
		//	s += ' - '+record.we.format("detail");
		//}

		var a = record.t.split(',');
		var s = "";
		for (i in a) {
			if (s) {
				s += ', ';
			}
			s += '<a href="javascript:g.coordinates.doSearch(\'detail\',\''+a[i]+'\')">' + a[i] + '</a>';
		}
		voyc.$('tags').innerHTML = "tags: " + s;
	},
	switchPanel: function(s) {
		voyc.$('welcome').style.display = "none";
		voyc.$(s).style.display = "block";
	},
}

voyc.Detail.html = ''+
	'<img id="photo" class="photo" src="images/no-photo.png"/>'+
	'<div id="vote">'+
		'<div id="voteup" class="out"></div>'+
		'<div id="votescore">1000</div>'+
		'<div id="votedown" class="out"></div>'+
	'</div>'+
	'<div id="tweet">'+
		'<a id="author" href="future"></a><span id="colon">:</span>'+
		'<span id="headline" class="headline"></span> '+
		'<span id="abstract"></span>'+
		'(<a id="fullstory" class="fine" target="new" href="future">full story</a>'+
		'<span class="fine" > source: </span>'+
		'<a id="source" class="fine" href="future"></a>)'+
	'</div>'+
	'<div id="tags">tags: </div>'+
	'<div id="dateline">'+
		'<div id="editlink">'+
			'<span id="recordid"></span> '+
			'<a href="javascript:g.detail.edit()">edit</a>'+
		'</div>'+
		'<span id="placename"></span>  - '+
		'<span id="time"></span>'+
	'</div>'+
	'<div id="comments"></div>';
