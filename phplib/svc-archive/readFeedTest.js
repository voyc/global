function readFeedTest(tester) {

	tester.assert( "php readFeed wildfires setup", get("wildfireSetup") >= 0);
	tester.assert( "php readFeed wildfires load", loadFeed("wildfires.kml", "wildfiresTest", "rss") == 20);
	tester.assert( "php readFeed wildfires record count", get("wildfireRecordCount") == 20);
	tester.assert( "php readFeed wildfires geom valid", get("wildfireGeomValid") == 20);
	tester.assert( "php readFeed wildfires cleanup", get("wildfireCleanup") == 20);

	tester.assert( "php readFeed globalvoices setup", get("globalvoicesSetup") >= 0);
	tester.assert( "php readFeed globalvoices load", loadFeed("globalvoices.xml", "globalvoicesTest", "rss") == 13);
	tester.assert( "php readFeed globalvoices record count", get("globalvoicesRecordCount") == 13);
	tester.assert( "php readFeed globalvoices geom valid", get("globalvoicesGeomValid") == 13);
	tester.assert( "php readFeed globalvoices2 load", loadFeed("globalvoices2.xml", "globalvoicesTest", "rss") == 14);
	tester.assert( "php readFeed globalvoices2 record count", get("globalvoices2RecordCount") == 27);
	tester.assert( "php readFeed globalvoices2 geom valid", get("globalvoices2GeomValid") == 27);
	tester.assert( "php readFeed globalvoices cleanup", get("globalvoicesCleanup") == 27);

	tester.assert( "php readFeed reuters setup", get("reutersSetup") >= 0);
	tester.assert( "php readFeed reuters load", loadFeed("reuters.xml", "reutersTest", "rss") == 9);
	tester.assert( "php readFeed reuters setup", get("reutersSetup") >= 0);

	tester.assert( "php readFeed moblog setup", get("moblogSetup") >= 0);
	tester.assert( "php readFeed moblog load", loadFeed("moblog.xml", "moblogTest", "moblog") == 9);
	tester.assert( "php readFeed moblog setup", get("moblogSetup") >= 0);

	function get(s) {
		var xhr = new JXmlHttp.create();
		xhr.open( "GET", "http://www.dev.mapteam.com/~jhagstrand/voyc/svc/readFeedTest.php?c="+s, false);
		xhr.send(null);
		
		var n = 0 - xhr.status;
		if (xhr.status == 200) {
			var v = xhr.responseXML.getElementsByTagName('message')[0].childNodes.item(0).data;
			n = parseInt(v);
		}
		return n;
	}

	function loadFeed(filename, feedname, service) {
		var xhr = new JXmlHttp.create();
		var url = "http://www.dev.mapteam.com/~jhagstrand/voyc/datasets/" + filename;
		xhr.open( "GET", "http://www.dev.mapteam.com/~jhagstrand/voyc/svc/readFeedSvc.php?url="+url+"&name="+feedname+"&service="+service, false);
		xhr.send(null);

		var n = 0 - xhr.status;
		if (xhr.status == 200) {
			var v = xhr.responseXML.getElementsByTagName('message')[0].childNodes.item(0).data;
			n = parseInt(v);
		}
		return n;
	}
}
