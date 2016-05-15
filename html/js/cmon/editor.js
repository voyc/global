// (c) Copyright 2005, 2006, 2008, 20009 MapTeam, Inc.

/**
 * Creates a new Editor object.
 * @constructor
 * @param {Map} map The {@link Map} object.
 * @param {Updater} updater The Updater object.
 * @param {Win} win The {Win} object.
 *
 * @class
 * Manages a UI that allows the user to edit database records including the geometry.
 * Supports polygons, points, lines.
 * Uses the Win factory object to create its window.
 * Allows the user to edit the shape on the Map object.
 */
function Editor(map, updater, win) {
	this.map = map;
	this.updater = updater;  //new Updater("update");
	this.win = win;  // new Win();
	this.id = null;
	this.window = null;
	this.shape = null;
	this.coordinates = null;
	this.xml = null;   // input xml
	this.tree = null;
	this.treeData = null;
	this.dirty = false;
	this.deletePointAllowed = true;
}

Editor.fields = ["id","headline","begin","end","abstract","author","storyurl","imageurl","tags","datatype","maptype", "maplvllo", "maplvlhi", "timelvllo", "timelvlhi", "timetype"];

Editor.sEditform = ''+
	'<div id="tabs">'+
		'<a href="javascript:void(0)" id="btnTree" tab="tabTree">Tree</a>&nbsp;&nbsp;'+
		'<a href="javascript:void(0)" id="btnAttributes" tab="tabAttributes">Attributes</a>&nbsp;&nbsp;'+
		'<a href="javascript:void(0)" id="btnCoordinates" tab="tabCoordinates">Coordinates</a>&nbsp;&nbsp;'+
		'<a href="javascript:void(0)" id="btnXml" tab="tabXml"">XML</a>&nbsp;&nbsp;'+
		'<input id="btnSave" type="button" value="Save" />'+
		'<input id="btnCancel" type="button" value="Cancel" />'+
		'<div id="advanced_buttons" style="display:inline">'+
			'<a href="javascript:void(0)" id="btnShowAdvanced">advanced</a>'+
			'<input id="btnUpdate" type="button" value="Update" />'+
			'<input id="btnInsert" type="button" value="Insert" />'+
			'<input type="text" id="id"/>'+
			'<input id="btnGet" type="button" value="Get"/> 14993'+
		'</div>'+
	'</div>'+
	'<div id="tabTree" style="display:none;overflow:auto;">'+
		'<br/>'+
		'<input type="button" value="Clone" onclick="g.editor.tree.cloneNodex()">'+
		'<input type="button" value="Delete" onclick="g.editor.tree.deleteNode()">'+
		'<input type="button" value="Clear Tree" onclick="g.editor.tree.clearTree()">'+
		'<ul class="simpleTree">'+
			'<li class="root" id="0"><span>Tree</span>'+
				'<ul>'+
					'<li/>'+
					'</li>'+
				'</ul>'+
			'</li>'+
		'</ul>'+
	'</div>'+
	'<div id="tabAttributes" style="display:block;">'+
		'<table>'+
			'<tr>'+
				'<td>id</id>'+
				'<td colspan="5"><input id="frmid"></td>'+
			'</tr>'+
			'<tr>'+
				'<td>begin</td>'+
				'<td><input id="frmbegin"></td>'+
				'<td>end</td>'+
				'<td colspan="3"><input id="frmend"></td>'+
			'</tr>'+
			'<tr>'+
				'<td>headline</td>'+
				'<td colspan="5"><input id="frmheadline" size="50"></td>'+
			'</tr>'+
			'<tr>'+
				'<td>abstract</td>'+
				'<td colspan="5"><textarea id="frmabstract" rows="4" cols="50"></textarea></td>'+
			'</tr>'+
			'<tr>'+
				'<td>author</td>'+
				'<td colspan="5"><input id="frmauthor"></td>'+
			'</tr>'+
			'<tr>'+
				'<td>storyurl</td>'+
				'<td colspan="5"><input id="frmstoryurl" size="70"></td>'+
			'</tr>'+
			'<tr>'+
				'<td>imageurl</td>'+
				'<td colspan="5"><input id="frmimageurl" size="70"></td>'+
			'</tr>'+
			'<tr>'+
				'<td>tags</td>'+
				'<td colspan="5"><input id="frmtags" size="70"></td>'+
			'</tr>'+
			'<tr>'+
				'<td>datatype</td>'+
				'<td><select id="frmdatatype"><option value="0">0-none</option><option value="2">2-political/cultural boundary</option><option value="5">5-city</option><option value="6">6-person</option><option value="7">7-work</option><option value="8">8-treasure</option><option value="10">10-war</option><option value="11">11-event</option></select></td>'+
			'</tr>'+
			'<tr>'+
				'<td>maptype</td>'+
				'<td><select id="frmmaptype"><option value="0">0-none</option><option value="2">2-polygon</option><option value="3">3-polypolygon</option><option value="4">4-line</option><option value="5">5-point</option><option value="6">6-bounding rectangle</option></select></td>'+
				'<td>maplvllo</td>'+
				'<td><input id="frmmaplvllo" size="7"></td>'+
				'<td>maplvlhi</td>'+
				'<td><input id="frmmaplvlhi" size="7"></td>'+
			'</tr>'+
			'<tr>'+
				'<td>timetype</td>'+
				'<td><select id="frmtimetype"><option value="0">0-none</option><option value="1">1-bar</option><option value="2">2-point</option><option value="3">3-boundingrange</option></select></td>'+
				'<td>timelvllo</td>'+
				'<td><input id="frmtimelvllo" size="7"></td>'+
				'<td>timelvlhi</td>'+
				'<td><input id="frmtimelvlhi" size="7"></td>'+
			'</tr>'+
		'</table>'+
	'</div>'+
	'<div id="tabCoordinates" style="display:none;">'+
		'<textarea id="coordinatebox" style="width:100%;height:100%"></textarea><br/>'+
	'</div>'+
	'<div id="tabXml" style="display:none;">'+
		'<textarea id="xmlbox" style="width:100%;height:100%"></textarea><br/>'+
	'</div>';

Editor.prototype = {
	/**
	 * Open the editor window.
	 * Reads the database record.
	 * Opens an editor window on screen.
	 * Creates an editable GPolygon object on the map.
	 * @param {Number} id The unique key of the database record
	 */
	open : function(id) {
		this.read(id);

		// open the edit window
		if (!this.isOpen()) {
			var self = this;
			this.window = this.win.createWindow( {"id":"nomargin", "top":40,  "left":10,  "width":600, "height":500, "margin":10, "border":4, "titlebar":"standard", "layouttop":"fixed", "onresize":function(){self.onresize()}});
			document.body.appendChild(this.window);
			this.win.getContentDiv(this.window).innerHTML = Editor.sEditform;
			this.win.layout(this.window);
			this.bindUi();
		}
	},

	/**
	 * Close the editor window.
	 */
	close : function() {
		this.win.close(this.window);
		this.window = null;
		this.stopEditingShape();
	},

	/**
	 * Return true if the editor window is open.
	 * @return {boolean}
	 */
	isOpen : function() {
		return (this.window) ? true : false;
	},

	/**
	 * Set the dirty flag.
	 * @param {boolean} dirty True or false value to set the dirty flag.
	 */
	setDirty : function(dirty) {
		this.dirty = dirty;
	},

	/**
	 * Return true if the editor is dirty.
	 * @return {boolean}
	 */
	isDirty : function() {
		return this.dirty;
	},

	/**
	 * If the editor is dirty, open a dialog to let the user confirm that he really wants to leave the editor.
	 * @return {boolean}
	 */
	confirm: function() {
		var confirmed = true;
		if (this.isDirty()) {
			confirmed = confirm( "You have not saved.  Continue and lose your edits?");
		}
		return confirmed;
	},

	/**
	 * Reopen the editor with a different record.
	 * @param {Number} id The unique key of the database record
	 */
	reopen : function(id) {
		if (!this.confirm()) return;
		this.stopEditingShape();
		this.read(id);
	},

	/**
	 * Read a record from the server.
	 * @param {Number} id The unique key of the database record
	 */
	read : function(id) {
		// read the record
		this.id = id;
		var self = this;
		this.updater.get(this.id, function(response,req) {self.onRead(response,req)});
	},

	/**
	 * Event Handler.  Called when the record has arrived from the server.
	 * @param {Response} response
	 * @param {Request} request
	 */
	onRead : function(response,req) {
		this.xml = req.responseXML;
		
		// populate the xml tab
		document.getElementById("xmlbox").value = response;

		if (this.xml.getElementsByTagName('status')[0].childNodes[0].nodeValue != "success") {
			return;
		}

		// populate the attributes tab
		for (var i=0; i<Editor.fields.length; i++) {
			var e = this.xml.getElementsByTagName(Editor.fields[i])[0].childNodes;
			if (e.length > 0) {
				var v = this.xml.getElementsByTagName(Editor.fields[i])[0].childNodes[0].nodeValue;
				document.getElementById("frm"+Editor.fields[i]).value = v;
			}
			else {
				document.getElementById("frm"+Editor.fields[i]).value = "";
			}
		}

		// populate the coordinates tab
		// long strings get split up into multiple nodes
		//var v = this.xml.getElementsByTagName("geometry")[0].childNodes[0].nodeValue;
		this.coordinates = [];
		var maptype = this.xml.getElementsByTagName("maptype")[0].childNodes[0].nodeValue;
	 	maptype = parseInt(maptype);
		switch (maptype) {
			case 2: // polygon
			case 6: // bounding rect - polygon with 4 points, or 5 points
				var geomNode = this.xml.getElementsByTagName("geometry")[0];
				var v = "";
				for (var i=0; i<geomNode.childNodes.length; i++) {
					v += geomNode.childNodes[i].nodeValue;
				}
		
				var pattern = /MULTIPOLYGON\(*([^\)]*)\)*/;
				var match = pattern.exec(v);

				// if no match on MULTIPOLYGON, try POLYGON
				if (!match) {
					var pattern = /POLYGON\(*([^\)]*)\)*/;
					match = pattern.exec(v);
				}				

				if (match) {
					v = match[1];
					var commas = /,/gi;
					v = v.replace(commas, "\n");
					document.getElementById("coordinatebox").value = v;
			
					// parse xml to array of coordinates
					var a = v.split("\n");
					var b = null;
					for (var i=0; i<a.length; i++) {
						b = a[i].split(" ");
						this.coordinates[i] = {x:b[0], y:b[1]};
					}
				}
				break;
		}
		
		// populate tree tab
		this.tree.clearTree();
		this.treeData = [];
		var a = this.xml.getElementsByTagName("branch");
		for (var i=0; i<a.length; i++) {
			var x = {};
			x.id = a[i].getAttribute("id");
			x.begin = a[i].getAttribute("begin");
			x.end = a[i].getAttribute("end");
			x.headline = a[i].getAttribute("headline");
			x.forebear = a[i].getAttribute("forebear");
			x.parent = a[i].getAttribute("parent");
			this.treeData.push(x);
		}
		this.tree.buildTree(this.treeData);
		this.setDirty(false);  // buildTree erroneously sets the dirty flag
		
		// create the editable polygon on the map
		if (this.coordinates.length > 0) {
			var latlngs = [];
			for (i in this.coordinates) {
				latlngs.push(new GLatLng(this.coordinates[i].y, this.coordinates[i].x));
			}
			g.debug.alert(["create polygon", latlngs.length]);
			// GPolygon( latlngs, strokeColor, strokeWeight, strokeOpacity, fillColor, fillOpacity, opts)
			this.shape = new GPolygon(latlngs, 0x0ff0000, 1, 1, 0x0ff0000, 0.5);
			this.map.addOverlay(this.shape);
			this.shape.enableEditing();
	//		this.shape.enableDrawing();
			var self = this;
			GEvent.addListener(this.map,"singlerightclick",function(point,src,overlay){ self.onRightClickOnShape(point,src,overlay);}); 
			GEvent.addListener(this.shape,"lineupdated",function(){ self.onLineUpdated();}); 
		}
	},

	/**
	 * Event Handler.  Called when the user right-clicks on the shape being edited.
	 * @param {GPoint} point The GPoint of the mouse click.
	 * @param {src} src ?
	 * @param {google.maps.OverlayView} overlay The google.maps.OverlayView object clicked on.
	 */
	onRightClickOnShape: function(point,src,overlay) {
		if(typeof(overlay.index) !== "undefined" && this.deletePointAllowed){ 
			this.deletePointAllowed = false;
			var self = this;
			setTimeout( function() {self.deletePointAllowed = true;}, 2000);
			g.debug.alert(["deleteVertex", overlay.index]);
			this.shape.deleteVertex(overlay.index); 
			//this.shape.enableDrawing({}); //calling deleteVertex disables drawing, so re-enable it 
			this.setDirty(true);
		} 
	}, 

	/**
	 * Event Handler.  Called when the user moves a point of the shape being edited.
	 */
	onLineUpdated: function() {
		this.setDirty(true);
	},

	/**
	 * Compose the XML to update the record based on the user's changes.
	 */
	composeXml : function() {
		// create empty output dom
		var dom = this.xml.cloneNode(false);  // document
		var xml = dom.createElement("request");  // document element
		dom.appendChild(xml);
		
		// pass back the version number that we read
		var v, e, t;
		v = this.xml.getElementsByTagName("version")[0].childNodes[0].nodeValue;
		e = dom.createElement("version");
		xml.appendChild(e);
		t = dom.createTextNode(v);
		e.appendChild(t);

		// add attribute fields to the xml
		for (i in Editor.fields) {
			v = document.getElementById("frm"+Editor.fields[i]).value;
			//var e = this.xml.getElementsByTagName(Editor.fields[i])[0].childNodes;
			e = dom.createElement(Editor.fields[i]);
			xml.appendChild(e);
			t = dom.createTextNode(v);
			e.appendChild(t);
		}

		// get coordinates from GPolygon		
		var cnt = this.shape.getVertexCount();
		var latlngs = [];
		for (var i=0; i<cnt; i++) {
			latlngs.push( this.shape.getVertex(i));
		}
		var i;
		var v = "";
		for (i in latlngs) {
			if (v) {
				v += ",";
			}
			v += latlngs[i].x + " " + latlngs[i].y;
		}
		v = "MULTIPOLYGON(((" + v + ")))";
		e = dom.createElement("geometry");
		xml.appendChild(e);
		t = dom.createTextNode(v);
		e.appendChild(t);

		// get hierarchy from tree
		this.tree.updateTreeData();
		e = dom.createElement("hierarchy");
		xml.appendChild(e);
		var branch;
		for (var i=0; i<this.treeData.length; i++) {
			if (this.treeData[i].newparent != this.treeData[i].parent || this.treeData[i].newforebear != this.treeData[i].forebear) {
				branch = document.createElement("branch");
				branch.setAttribute( "id", this.treeData[i].id);
				branch.setAttribute( "headline", this.treeData[i].headline);
				branch.setAttribute( "begin", this.treeData[i].begin);
				branch.setAttribute( "end", this.treeData[i].end);
				branch.setAttribute( "forebear", this.treeData[i].forebear);
				branch.setAttribute( "parent", this.treeData[i].parent);
				branch.setAttribute( "newforebear", this.treeData[i].newforebear);
				branch.setAttribute( "newparent", this.treeData[i].newparent);
				e.appendChild(branch);
			}
		}
		return dom;
	},

	/**
	 * Set the mouse events on the DOM.
	 */
	bindUi : function() {
		var self = this;
		/**#nocode+*/
		document.getElementById("btnTree").onclick = function() {self.onTab(this.getAttribute("tab"));};
		document.getElementById("btnAttributes").onclick = function() {self.onTab(this.getAttribute("tab"));};
		document.getElementById("btnCoordinates").onclick = function() {self.onTab(this.getAttribute("tab"));};
		document.getElementById("btnXml").onclick = function() {self.onTab(this.getAttribute("tab"));};

		document.getElementById("btnSave").onclick = function() {self.onSave();};
		document.getElementById("btnCancel").onclick = function() {self.onCancel();};
		document.getElementById("btnGet").onclick = function() {self.onGet();};
		document.getElementById("btnInsert").onclick = function() {self.onPut();};
		document.getElementById("btnUpdate").onclick = function() {self.onPost();};
		/**#nocode-*/

		for (var i=0; i<Editor.fields.length; i++) {
			document.getElementById("frm"+Editor.fields[i]).onchange = function() {self.setDirty(true);};
		}

		this.tree = new Tree();
		this.tree.create();
	},
	
	/**
	 * Event Handler.  Called when the user clicks a tab button.
	 * @event
	 * @param {String} tab Id of the tab element selected.
	 */
	onTab : function(tab) {
		document.getElementById("tabTree").style.display = "none";
		document.getElementById("tabAttributes").style.display = "none";
		document.getElementById("tabCoordinates").style.display = "none";
		document.getElementById("tabXml").style.display = "none";
		document.getElementById(tab).style.display = "block";
	},

	/**
	 * Event Handler.  Called when the user clicks the save button.
	 * Call composeXml to gather data entered on all the tabs, including hierarchy.
	 * @event
	 */
	onSave : function() {
		g.debug.alert('Editor::onSave');
		var dom = this.composeXml();
		var self = this;
		var s = this.serialize(dom);
		document.getElementById('xmlbox').value = s;
		this.updater.post(s, function( response, req) {self.onReturn(response, req);});
	},
	
	/**
	 * Event Handler.  Called when the user clicks the Cancel button.
	 * Also called directly from the map when a user clicks on a polygon to open a new infowindow.
	 * @event
	 */
	onCancel : function() {
		if (!this.confirm()) return false;
		this.close();
		this.setDirty(false);
		return true;
	},
	
	/**
	 * Event Handler.  Called when the user clicks the Get button.
	 * @event
	 * @deprecated
	 */
	onGet : function() {
		var id = document.getElementById('id').value;
		var self = this;
		g.updater.get(id, function( response, req) {self.onRead(response, req);})
	},

	/**
	 * Event Handler.  Called when the user clicks the Insert button.
	 * @event
	 * @deprecated
	 */
	onPut : function() {
		var xml = document.getElementById('xmlbox').value;
		var self = this;
		g.updater.put(xml, function( response, req) {self.onReturn(response, req);})
	},

	/**
	 * Event Handler.  Called when the user clicks the Update button.
	 * @event
	 * @deprecated
	 */
	onPost : function() {
		var xml = document.getElementById('xmlbox').value;
		var self = this;
		g.updater.post(xml, function( response, req) {self.onReturn(response, req);})
	},
	
	/**
	 * Event Handler.  Called when the Server returns.
	 * @event
	 */
	onReturn : function(response, req) {
		document.getElementById("xmlbox").value = response;
		this.setDirty(false);
	},

    /**
     * Serialize a DOM
     * @param {Object} dom
     * @return {String}
     */
    serialize    : function (dom) {
        var xmlString    = '';
        if (window.ActiveXObject) {
            xmlString    = dom.xml;
        } else {
            try {
                var s        = new XMLSerializer();
                xmlString    = s.serializeToString(dom);
            } catch (e) {
                xmlString = dom.toString();
            }
        }
        return xmlString;
    },

	/**
	 * Reset the map when editing a shape is complete.
	 */
	stopEditingShape : function() {
		if (!this.shape) {
			return;
		}
		this.shape.disableEditing();
		this.map.removeOverlay(this.shape);
		delete this.shape;
		this.shape = null;
	},

	/**
	 * Event Handler.  Called when the map window has changed size.
	 * @event
	 */
	onresize : function() {
		var t = document.getElementById("tabs");
		if (t) {
			var w = this.win.getContentDiv(this.window);
			var sa = document.getElementById("tabAttributes").style;
			sa.width = w.offsetWidth + "px";
			sa.height = w.offsetHeight - t.offsetHeight + "px";

			sa = document.getElementById("tabXml").style;
			sa.width = w.offsetWidth + "px";
			sa.height = w.offsetHeight - t.offsetHeight - 1 + "px";

			sa = document.getElementById("tabCoordinates").style;
			sa.width = w.offsetWidth + "px";
			sa.height = w.offsetHeight - t.offsetHeight -1  + "px";
		}
	}
}
// (c) Copyright 2005, 2006, 2008, 20009 MapTeam, Inc.
