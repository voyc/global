<!-- (c) Copyright 2014 Voyc.com  -->
/**
 * Create a Tester object.
 * @constructor.
 *
 * @class
 * A Tester object is used to run a suite of unit tests.
 */
voyc.Tester = function() {
	this.numTests = 0;
	this.numSuccess = 0;
	this.numFail = 0;
	this.failures = [];
}

voyc.Tester.prototype = {
	/**
	 * Run one test.
	 * @param {boolean} test An expression that evalutates to TRUE if the test passes.
	 */
	assert : function(test,name) {
		var n = name || '';
		var b = (test);
		this.numTests++;
		if (test) {
			this.numSuccess++;
		}
		else {
			this.numFail++;
			this.failures.push(n + ' ' + voyc.getFileLine(3));  // 3 is not right. we need the chain of sub functions
		}
		this.log(test);
		return b;
	},

	log: function(s) {
		var log = document.getElementById("log");
		if (log) {
			log.innerHTML += s + "<br/>";
		}
	},

	/**
	 * Compose a string representing the test results.
	 * @return {String}
	 */
	displayResults : function() {
		var s = "";
		s += "Tests: " + this.numTests + "<br/>";
		s += "Success: " + this.numSuccess + "<br/>";
		s += "Fail: " + this.numFail + "<br/>";
		s += "<br/>";
		
		if (!this.isSuccess()) {
			s += "Failed: <br/>";
			for(i in this.failures) {
				s += this.failures[i] + "<br/>";
			}
		}
		return s;
	},

	/**
	 * Return true if all tests were successful.  Otherwise return false.
	 * @return {boolean}
	 */
	isSuccess: function() {
		return (this.numTests == this.numSuccess);
	}
}
