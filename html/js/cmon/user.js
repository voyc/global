// (c) Copyright 2009 MapTeam, Inc.

/**
 * Creates a User object.
 * @constructor
 *
 * @class
 * Represents the VDetail UI Object.
 */
function User() {
	this.username = '';
	this.token = '';
	this.level = 0;

	this.patternStatus = /\<status\>(.*?)\<\/status\>/;
	this.patternMessage = /\<message\>(.*?)\<\/message\>/;
	this.patternToken = /\<token\>(.*?)\<\/token\>/;
	this.patternLevel = /\<level\>(.*?)\<\/level\>/;
	this.patternUsername = /\<username\>(.*?)\<\/username\>/;
}

User.prototype = {
	requireLogin: function() {
		if (this.level > 0) {
			return true;
		}
		else {
			g.detail.switchPanel('login');
			return false;
		}
	},
	myAccount: function() {
		g.detail.switchPanel('myaccount');
		$('inmyaccountusername').value = this.username;
		$('inemail').value = email;
	},
	saveMyAccount: function() {
		$('outmyaccountmsg').innerHTML = '';
		this.username = $('inusername').value;
		var password = $('inpassword').value;
		var confirmpassword = $('inconfirmpassword').value;
		var email = $('inemail').value;

		if (password != confirmpassword) {
			$('outmsg').innerHTML = "Enter your password twice.";
			return;
		}

		// compose XML				
		var xml = "";
		xml += "<request>";
		xml += "<username>"+this.username+"</username>";
		xml += "<password>"+password+"</password>";
		xml += "<email>"+email+"</email>";
		xml += "</request>";

		g.debug.alert(xml.replace(/\>/g, '&gt;').replace(/\</g, '&lt;'));
		
		var xhr = new Xhr();
		xhr.program = "myaccount";
		xhr.data = xml;
		var self = this;
		xhr.callback = function(response) {
			var match = self.patternStatus.exec(response);
			if (match[1] == 'success') {
				match = self.patternToken.exec(response);
				self.token = match[1];
				match = self.patternLevel.exec(response);
				self.level = parseInt(match[1]);

				g.detail.switchPanel('myaccountWelcome');
				$('loggedout').style.display = 'none';
				$('loggedin').style.display = 'block';
				$('loggedinuser').innerHTML = self.username;
			}
			else {
				match = self.patternMessage.exec(response);
				document.getElementById("outmyaccountmsg").innerHTML = 'Save failed. ' + match[1];
			}
			return;
		};
		xhr.callServer();
	},
	register: function() {
		$('outregistermsg').innerHTML = '';
		this.username = $('inusername').value;
		var password = $('inpassword').value;
		var confirmpassword = $('inconfirmpassword').value;
		var email = $('inemail').value;

		if (password != confirmpassword) {
			$('outmsg').innerHTML = "Enter your password twice.";
			return;
		}

		// compose XML				
		var xml = "";
		xml += "<request>";
		xml += "<username>"+this.username+"</username>";
		xml += "<password>"+password+"</password>";
		xml += "<email>"+email+"</email>";
		xml += "</request>";

		g.debug.alert(xml.replace(/\>/g, '&gt;').replace(/\</g, '&lt;'));
		
		var xhr = new Xhr();
		xhr.program = "register";
		xhr.data = xml;
		var self = this;
		xhr.callback = function(response) {
			var match = self.patternStatus.exec(response);
			if (match[1] == 'success') {
				match = self.patternToken.exec(response);
				self.token = match[1];
				match = self.patternLevel.exec(response);
				self.level = parseInt(match[1]);

				g.detail.switchPanel('registerWelcome');
				$('loggedout').style.display = 'none';
				$('loggedin').style.display = 'block';
				$('loggedinuser').innerHTML = self.username;
			}
			else {
				match = self.patternMessage.exec(response);
				document.getElementById("outregistermsg").innerHTML = 'Register failed. ' + match[1];
			}
			return;
		};
		xhr.callServer();
	},
	login: function() {
		$('outloginmsg').innerHTML = '';
		this.username = $('inloginusername').value;
		var password = $('inloginpassword').value;

		// compose XML				
		var xml = "";
		xml += "<request>";
		xml += "<username>"+this.username+"</username>";
		xml += "<password>"+password+"</password>";
		xml += "</request>";

		g.debug.alert(xml.replace(/\>/g, '&gt;').replace(/\</g, '&lt;'));
		
		var xhr = new Xhr();
		xhr.program = "login";
		xhr.data = xml;
		var self = this;
		xhr.callback = function(response) {
			var match = self.patternStatus.exec(response);
			if (match[1] == 'success') {
				match = self.patternToken.exec(response);
				self.token = match[1];
				match = self.patternLevel.exec(response);
				self.level = parseInt(match[1]);
				
				// save token in cookie
				g.observer.publish('OnLogin', 'user', [self.token]);            

				// display - move to an event handler
				g.detail.switchPanel('loginWelcome');
				$('loggedout').style.display = 'none';
				$('loggedin').style.display = 'block';
				$('loggedinuser').innerHTML = self.username;
			}
			else {
				match = self.patternMessage.exec(response);
				document.getElementById("outloginmsg").innerHTML = 'Login failed. ' + match[1];
			}
			return;
		};
		xhr.callServer();
	},
	authorize: function(token) {
		// compose XML				
		var xml = "";
		xml += "<request>";
		xml += "<token>"+token+"</token>";
		xml += "</request>";

		g.debug.alert(xml.replace(/\>/g, '&gt;').replace(/\</g, '&lt;'));
		
		var xhr = new Xhr();
		xhr.program = "auth";
		xhr.data = xml;
		var self = this;
		xhr.callback = function(response) {
			var match = self.patternStatus.exec(response);
			if (match[1] == 'success') {
				match = self.patternUsername.exec(response);
				self.username = match[1];
				match = self.patternToken.exec(response);
				self.token = match[1];
				match = self.patternLevel.exec(response);
				self.level = parseInt(match[1]);
				
				// save token in cookie
				//g.observer.publish('OnLogin', 'user', [self.token]);            

				// display - move to an event handler
				//g.detail.switchPanel('loginWelcome');
				$('loggedout').style.display = 'none';
				$('loggedin').style.display = 'block';
				$('loggedinuser').innerHTML = self.username;
			}
			else {
				match = self.patternMessage.exec(response);
				document.getElementById("outloginmsg").innerHTML = 'Login failed. ' + match[1];
			}
			return;
		};
		xhr.callServer();
	},
	logout: function() {
		this.username = '';
		this.token = '';
		this.level = 0;
		g.observer.publish('OnLogout', 'user');

		// move to an event handler
		$('loggedout').style.display = 'block';
		$('loggedin').style.display = 'none';
		$('loggedinuser').innerHTML = '';
	},
	vote: function(id,vote) {
		// compose XML				
		var xml = "";
		xml += "<request>";
		xml += "<token>"+this.token+"</token>";
		xml += "<vote>"+vote+"</vote>";
		xml += "<storyid>"+id+"</storyid>";
		xml += "</request>";

		g.debug.alert(xml.replace(/\>/g, '&gt;').replace(/\</g, '&lt;'));
		
		var xhr = new Xhr();
		xhr.program = "vote";
		xhr.data = xml;
		var self = this;
		xhr.callServer();
	}
}

// (c) Copyright 2009 MapTeam, Inc.
