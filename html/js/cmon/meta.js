// (c) Copyright 2014 voyc.com
/**
 * Create a new Meta object.
 * @class Represents a Meta object.  This handles everything ancillary to the voyc mission.
 */
voyc.Meta = function(e) {
}

voyc.Meta.prototype = {
	create = function() {
		voyc.debug.alert('Meta.create');
	},


	/***************************************************/

	/**
	 * Open or close a popup window.
	 * @param show {boolean} True to show the window; false to hide the window.
	 */
	popup: function(bShow,filename,url) {
		if (bShow) {
			awin = g.win.createWindow( {"id":filename, "top":100,  "left":100,  "width":600, "height":700, "margin":10, "border":4, "titlebar":"standard", "layouttop":"fixed", "mode":"dialog" });
			document.body.appendChild( awin);
			var iframe = document.createElement("iframe");
			var f = "pages/" + filename + ".html";
			if (url) {
				f = url;
			}
			iframe.src = f;
			iframe.setAttribute("width", "100%");
			iframe.setAttribute("height", "100%");
			var div = g.win.getContentDiv(awin);
			div.style.overflow = "hidden";
			div.appendChild(iframe);
		}
	},
	/**
	 * For testing, create a list of currently visible records.
	 * @param show {boolean} True to show the window; false to hide the window.
	 */
	popupEditList: function(bShow) {
		if (bShow) {
			// create the Win window
			var awin = g.win.createWindow( {"id":"popupEditList", "top":100,  "left":100,  "width":400, "height":700, "margin":10, "border":4, "titlebar":"standard", "layouttop":"fixed", "mode":"dialog" });
			document.body.appendChild( awin);

			// add two checkboxes
			var cb = document.createElement( "input" );
			cb.type = "checkbox";
			cb.id = "currentCheckbox";
			cb.value = "current";
			cb.checked = false;
			var text = document.createTextNode( "current only " );
			g.win.getContentDiv(awin).appendChild( cb );
			g.win.getContentDiv(awin).appendChild( text );
			var self = this;
			cb.onclick = function() {self.populateEditList()};
			
			// add two checkboxes
			var cb = document.createElement( "input" );
			cb.type = "checkbox";
			cb.id = "edited";
			cb.value = "edited";
			cb.checked = false;
			var text = document.createTextNode( "edited only" );
			g.win.getContentDiv(awin).appendChild( cb );
			g.win.getContentDiv(awin).appendChild( text );

			// add the main list box
			var dv = document.createElement("div");
			dv.id = "editList";
			g.win.getContentDiv(awin).appendChild(dv);
			
			this.populateEditList();
		}
	},
	/**
	 * populate the list
	 */
	populateEditList: function() {
		var isChecked = document.getElementById( "currentCheckbox").checked;
		var x;
		var s = '';
		for (var i in g.data.data) {
			x = g.data.data[i];
			if (isChecked && !x.on) {
				continue;
			}
			s += '<a href="javascript:void(0)" onclick="g.editor.open('+i+')">'+i+' '+x.h+'</a><br/>';
		}
		document.getElementById("editList").innerHTML = s;
	},

	startUpload: function() {
		document.getElementById('uploadtoken').value = g.user.token;
		document.getElementById('result').innerHTML = 'Uploading...';
		return true;
	},
	
	stopUpload: function(success, n) {
		var result = '';
		if (success == 1){
			document.getElementById('result').innerHTML = 'Upload complete.  ' + n + ' records inserted.';
			document.getElementById('uploadfile').value = '';
			document.getElementById('uploadsource').value = '';
		}
		else {
			document.getElementById('result').innerHTML = 'There was an error during file upload.';
		}
		return true;
	},
	
	/**
	 * Display a message informing the user there is no data here.
	 */
	showNoData: function(msg) {
		var msg = msg || 'No data found at this time/space location.'
		alert(msg);
	}
}

function stopUpload(rc, n) {
	g.voyc.stopUpload(rc,n);
}



		voyc.event.subscribe("OnLogout", "Detail", function(evt,pub,id) {self.onLogout(evt,pub);});

	onLogout: function(evt,pub) {
		this.switchPanel('logoutWelcome');
	},
	showMenuPanel: function() {
		voyc.$('menuLogin').style.display     = (g.user.level < 1) ? 'block' : 'none';
		voyc.$('menuRegister').style.display  = (g.user.level < 1) ? 'block' : 'none';
		voyc.$('menuLogout').style.display    = (g.user.level >= 1) ? 'block' : 'none';
		voyc.$('menuMyAccount').style.display = (g.user.level >= 1) ? 'block' : 'none';
		this.switchPanel('menu');
	},


	clearForm: function() {
		voyc.$('inheadline').value = '';
		voyc.$('instory').value = '';
		voyc.$('intags').value = '';
		voyc.$('inlat').value = '';
		voyc.$('inlon').value = '';
		voyc.$('inplace').value = '';
		voyc.$('intime').value = '';
		voyc.$('instoryurl').value = '';
		voyc.$('inphotourl').value = '';
		voyc.$('inthumburl').value = '';
		voyc.$('outmsg').innerHTML = '';
	},
	insert: function() {
		// initialize an empty record
		this.id = 0;
		g.data.data[0] = {h:'',s:'',t:'',plc:'',su:'',iu:'',tu:''};
		g.data.data[0].latlng = new GLatLng(g.map.getCenter().lat(), g.map.getCenter().lng());  // center of current map
		g.data.data[0].wb = new When( new Date(), When.SECOND);  // current time

		voyc.$('insertBtns').style.display = "block";
		voyc.$('updateBtns').style.display = "none";

		this.populateEditPanel();
	},
	edit: function() {
		voyc.$('insertBtns').style.display = "none";
		voyc.$('updateBtns').style.display = "block";
		this.populateEditPanel();
	},
	populateEditPanel: function() {
		this.clearForm();
		this.switchPanel('edit');
		this.editing;
		var x = g.data.data[this.id];

		voyc.$('inheadline').value = x.h;
		voyc.$('instory').value = x.s;
		voyc.$('intags').value = x.t;

		voyc.$('inlat').value = x.latlng.lat();
		voyc.$('inlon').value = x.latlng.lng();
		voyc.$('inplace').value = x.plc;
		voyc.$('intime').value = x.wb.format("detail");

		voyc.$('instoryurl').value = x.su;
		voyc.$('inphotourl').value = x.iu;
		if (x.tu != x.iu) {
			voyc.$('inthumburl').value = x.tu;
		}

		// create the draggable marker
		if (!this.marker) {
			this.marker = new GMarker(x.latlng, {draggable:true});
			g.map.addOverlay(this.marker);
			this.marker.enableDragging(); 
		}
		this.marker.setLatLng(x.latlng);
		this.marker.show();
		
		// hide the dot
		GEvent.addListener(this.marker, "dragstart", function() {
			g.map.dots.hideDot(g.detail.id);
		});

		GEvent.addListener(this.marker, "drag", function() {
			voyc.$('inlat').value = g.detail.marker.getLatLng().lat();
			voyc.$('inlon').value = g.detail.marker.getLatLng().lng();
		});
		
		GEvent.addListener(this.marker, "dragend", function() {
			g.map.dots.showDot(g.detail.id, g.detail.marker.getLatLng());
		});
		
		
		//destroy the marker in save and cancel
		
		
	},
	lookupPlace: function() {
		var url = VData.base + 'lookupPlaceSvc?place=' + $('inplace').value;
		var self = this;
		g.data.readUrl(url, function(result) {
			if (result.rc) {
				$('inlat').value = result.lat;
				$('inlon').value = result.lng;
				var ll = new GLatLng(result.lat, result.lng);
				self.marker.setLatLng(ll);
				var gb = g.map.getBounds();
				if (!gb.containsLatLng(ll)) {
					g.map.setCenter(ll);
				}
			}
		});
	},
	editSave: function() {
		var tweet = document.getElementById("inheadline").value;
		var story = document.getElementById("instory").value;
		var tags = document.getElementById("intags").value;
		var storyurl = document.getElementById("instoryurl").value;
		var photourl = document.getElementById("inphotourl").value;
		var thumburl = document.getElementById("inthumburl").value;
		var placename = document.getElementById("inplace").value;
		var geometry = document.getElementById("inlat").value + ', ' + document.getElementById("inlon").value;
		//var bibid = document.getElementById("inbibid").value;
		var time = document.getElementById("intime").value;

		var action = (this.id) ? 'update' : 'insert';
	
		var xml = "";
		xml += "<request>";
		xml += "<action>"+action+"</action>";
		xml += "<id>"+this.id+"</id>";
		xml += "<version>"+this.version+"</version>";
		xml += "<token>"+g.user.token+"</token>";
		xml += "<headline><![CDATA["+tweet+"]]></headline>";
		xml += "<abstract><![CDATA["+story+"]]></abstract>";
		xml += "<tags><![CDATA["+tags+"]]></tags>";
		xml += "<storyurl><![CDATA["+storyurl+"]]></storyurl>";
		xml += "<imageurl><![CDATA["+photourl+"]]></imageurl>";
		xml += "<thumburl><![CDATA["+photourl+"]]></thumburl>";
		xml += "<placename><![CDATA["+placename+"]]></placename>";
		xml += "<geometry>"+geometry+"</geometry>";

		if (action == 'insert') {
			//xml += "<bibid><![CDATA["+""+"]]></bibid>";      // todo, use something that indicates a manual web insert
			xml += "<author><![CDATA["+g.user.username+"]]></author>";    // todo, user userid on service side, via token
		}

		xml += "<when>"+time+"</when>";
		xml += "<datatype>11</datatype>";
		xml += "</request>";

		g.debug.alert(xml.replace(/\>/g, '&gt;').replace(/\</g, '&lt;'));
		
		var xhr = new Xhr();
		xhr.program = "update";
		xhr.data = xml;
		var self = this;
		xhr.callback = function(response) {
			var match = self.patternStatus.exec(response);
			if (match[1] == 'success') {
				// get the new id and read the new record
				var match = self.patternId.exec(response);
				this.id = match[1];
				g.data.readDetailById(this.id);

/*
				// refresh the data in memory
				var x = g.data.data[self.id];
				//x.v++;
				x.h = tweet;
				x.s = story;
				x.t = tags;
				x.su = storyurl;
				x.iu = photourl;
				x.tu = thumburl;
				x.plc = placename;
				x.latlng = new GLatLng( document.getElementById("inlat").value, document.getElementById("inlon").value);
				x.wb = x.we = new When(time, -8000);
				x.b = x.e = x.wb.decidate;
	
				self.loadDetailPanel();
				self.switchPanel('content');
				self.editing = false;
				// TODO - refresh the timeline display
*/
			}
			else {
				match = self.patternMessage.exec(response);
				document.getElementById("outmsg").innerHTML = 'Save failed. ' + match[1];
			}
			return;
		};
		xhr.callServer();
	},

	editCancel: function() {
		this.switchPanel('content')
		g.map.dots.showDot(this.id, g.data.data[this.id].latlng);
		this.editing = false;
	},
	editStop: function() {
		if (this.marker) {
			this.marker.hide();
		}
		if (this.editing) {
			this.editCancel();
		}
	}


	switchPanel: function(s) {
		voyc.$('startup').style.display = "none";
		voyc.$('content').style.display = "none";
		voyc.$('welcome').style.display = "none";
		voyc.$('publish').style.display = "none";
		voyc.$('publishFeed').style.display = "none";
		voyc.$('uploadFile').style.display = "none";
		voyc.$('register').style.display = "none";
		voyc.$('registerWelcome').style.display = "none";
		voyc.$('loginWelcome').style.display = "none";
		voyc.$('logoutWelcome').style.display = "none";
		voyc.$('login').style.display = "none";
		voyc.$('myaccount').style.display = "none";
		voyc.$('menu').style.display = "none";
		voyc.$('settings').style.display = "none";
		voyc.$('feedback').style.display = "none";
		voyc.$('search').style.display = "none";
		voyc.$('edit').style.display = "none";
		this.editStop();
		voyc.$(s).style.display = "block";
	},
