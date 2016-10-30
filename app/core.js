var githubApi = require('./github'),
	github = githubApi.service,
	debug = require('debug')('reviewbot:bot'),
	rules = require('./rules'),
	config = require('../config');

function processEvent (prNumber, repo, pr, action, callback) {
	for(var x = 0; x < rules.length; ++x) {
		var rule = rules[x];
		if(rule.beginProcessing && ( rule.enabled || rule.enabled === undefined ) ) {
			console.log("running: " + rule.name);
			rule.beginProcessing(prNumber, repo, pr, action, rule.processEvent);
		}
	}
}

function onRepositoryCreate(repo, callback) {
	var hUrl = config.botUrlRoot + '/pullrequest/';
	githubApi.webhooks.createWebHook(repo.name, hUrl, config.webHookEvents, function(err, result) {
		if(!err) {
			var processCount = 0;
			// get the rules
			for(var x = 0; x < rules.length; ++x) {
				var rule = rules[x];
				console.log("running rule: " + rule.name);
				// if the rule processes on create
				if(rule.onRepositoryCreate && ( rule.enabled || rule.enabled === undefined ) ) {
					console.log("rule '" + rule.name + ":onRepositoryCreate'")
					rule.onRepositoryCreate(repo);
				}
				processCount++;
				if(processCount >= rules.length) {
					if(callback) {
						callback(err,result);
					}
				}
			}
		} else {
			if(callback) {
				callback(err,result);
			}
		}
	});
}

module.exports = {
	processEvent: processEvent,
	onRepositoryCreate: onRepositoryCreate
};
