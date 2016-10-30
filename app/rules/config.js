var normalizedPath = require("path").join(__dirname, "./");
var config = {};
var merge = require('merge');

require("fs").readdirSync(normalizedPath).forEach(function(file) {
	var configMatch = /.*?\.config\.js/i;
	if(configMatch.test(file)) {
  	config = merge(config,require("./" + file));
	}
});

module.exports = config;
