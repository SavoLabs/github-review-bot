var normalizedPath = require("path").join(__dirname, "./");
var rules = [];
require("fs").readdirSync(normalizedPath).forEach(function(file) {
	var configMatch = /.*?\.config\.js/i;
	if(file !== 'index.js' && file !== 'config.js' && !configMatch.test(file)) {
		console.log(file);
  	rules[rules.length] = require("./" + file);
	}
});

module.exports = rules;
