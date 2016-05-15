function decDateTest(tester) {
	tester.assert( "php decDate 1 Sep 1952 4:00 GMT", get("1 Sep 1952 4:00 GMT") == 1952.6671220401);
	tester.assert( "php decDate 6 Jun 1903 1:15 GMT", get("6 Jun 1903 1:15 GMT") == 1903.4275399543);
	tester.assert( "php decDate dec 31 2006 23:59:59 UTC", get("dec 31 2006 23:59:59 UTC") == 2006.9999999683);
	tester.assert( "php decDate 1 jan 2007 00:00:00 UTC", get("1 jan 2007 00:00:00 UTC") == 2007);
	tester.assert( "php decDate dec 31 2006 23:59:59 PST", get("dec 31 2006 23:59:59 PST") == 2007.0009132103);
	tester.assert( "php decDate 1 jan 2007 00:00:00 PST", get("1 jan 2007 00:00:00 PST") == 2007.000913242);
	tester.assert( "php decDate dec 31 2006 23:59:59 PDT", get("dec 31 2006 23:59:59 PDT") == 2007.000799055);
	tester.assert( "php decDate 1 jan 2007 00:00:00 PDT", get("1 jan 2007 00:00:00 PDT") == 2007.0007990868);
	tester.assert( "php decDate 25 Oct 2007 23:00 PST", get("25 Oct 2007 23:00 PST") == 2007.8172374429);

	// todo
	tester.assert( "php decDate 4 jul 1776 8:23:06 AM", get("4 jul 1776 8:23:06 AM") == 0);
	tester.assert( "php decDate 30 jan 201", get("30 jan 201") == 0);
	tester.assert( "php decDate 1568", get("1568") == 0);
	tester.assert( "php decDate 1556 01 23", get("1556 01 23") == 0);
	tester.assert( "php decDate 1290 09 27", get("1290 09 27") == 0);
	tester.assert( "php decDate 1268", get("1268") == 0);
	tester.assert( "php decDate 1138 08 09", get("1138 08 09") == 0);
	tester.assert( "php decDate 0893 03 23", get("0893 03 23") == 0);
	tester.assert( "php decDate 0856 12 22", get("0856 12 22") == 0);
	tester.assert( "php decDate 1 sep 1901", get("1 sep 1901") == 0);
	tester.assert( "php decDate 4 jul 1776", get("4 jul 1776") == 0);
	tester.assert( "php decDate 30 jan 201", get("30 jan 201") == 0);
	tester.assert( "php decDate 3000 BC", get("3000 BC") == 0);
	tester.assert( "php decDate 3000000 BC", get("3000000 BC") == 0);
	tester.assert( "php decDate 3,000,000 BC", get("3,000,000 BC") == 0);
	tester.assert( "php decDate 30 BC", get("30 BC") == 0);
	tester.assert( "php decDate 30 AD", get("30 AD") == 0);
	tester.assert( "php decDate 500 AD", get("500 AD") == 0);
	tester.assert( "php decDate 31 dec 25025", get("31 dec 25025") == 0);

	tester.assert( "php decDate Thu Aug 13 2009 20:14:45", get("Thu Aug 13 2009 20:14:45") == 2009.6160097983);
	tester.assert( "php decDate Thu Aug 13 2009 20:14:45 GMT-0700 (Pacific Daylight Time)", get("Thu Aug 13 2009 20:14:45 GMT-0700 (Pacific Daylight Time)") == 2009.6168088851);
	tester.assert( "php decDate Thu Aug 13 2009 20:14:45 -0700 (Pacific Daylight Time)", get("Thu Aug 13 2009 20:14:45 -0700 (Pacific Daylight Time)") == 2009.6168088851);

	function get(s) {
		var xhr = new JXmlHttp.create();
		s = s.replace(/ /g, "+");
		xhr.open( "GET", "http://www.dev.mapteam.com/~jhagstrand/voyc/svc/decDateTest.php?d="+s, false);
		xhr.send(null);
		var s = xhr.responseText;
		var a = s.split(" ");
		var f = parseFloat(a[0]);
		return f;
	}
}
