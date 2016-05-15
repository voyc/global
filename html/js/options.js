// (c) Copyright 2009,2014 voyc.com
/**
 * Create a new Options object.
 * @class Represents the user options, aka preferences.
 */
voyc.Options = function() {
	this.dtstats = {};
	this.dtstats[voyc.datatype.political]  = {show:true, cntTotal:0, cntQualified:0, cntOnscreen:0, name:'Cultural Boundary'};
	this.dtstats[voyc.datatype.national]   = {show:true, cntTotal:0, cntQualified:0, cntOnscreen:0, name:'National Boundary'},
	this.dtstats[voyc.datatype.person]     = {show:true, cntTotal:0, cntQualified:0, cntOnscreen:0, name:'Person'},
	this.dtstats[voyc.datatype.work]       = {show:true, cntTotal:0, cntQualified:0, cntOnscreen:0, name:'Work'},
	this.dtstats[voyc.datatype.headofstate]= {show:true, cntTotal:0, cntQualified:0, cntOnscreen:0, name:'Head of State'},
	this.dtstats[voyc.datatype.bigevent]   = {show:true, cntTotal:0, cntQualified:0, cntOnscreen:0, name:'Big Event'},
	this.dtstats[voyc.datatype.ww]         = {show:true, cntTotal:0, cntQualified:0, cntOnscreen:0, name:'World War'},
	this.dtstats[voyc.datatype.newsevent]  = {show:true, cntTotal:0, cntQualified:0, cntOnscreen:0, name:'News Event'}

	this.bDisqualifyOverlaps = true;
	this.bOpenInternals = false;
	this.bDeveloperDetail = false;
	this.bDispatchMerge = false;
	this.bEventLogging = true;
}
