var githubApi = require('./github-api'),
	github = githubApi.service,
	auth = require('./auth'),
	debug = require('debug')('reviewbot:bot'),
	config = require('../../../config');


function createWebHook (repo, url, callback) {
	auth.authenticate();
	github.repos.createHook({
		user: config.organization,
		repo: repo,
		name: "web",
		config: {
			content_type: "application/json",
			url: url,
			secret: config.webhookSecret
		},
		events: config.pullRequestEvents
	}, function (err, result) {
	  if(callback) {
			callback(err,result);
		}
	});
}

function deleteWebHook ( repo, id, callback ) {
	auth.authenticate();
	github.repos.deleteHook({
		user: config.organization,
		repo: repo,
		id: id
	}, function(err, reply) {
		if(callback) {
			callback(err, reply);
		}
	});
}

function getWebHookId(repo, action, callback) {
	auth.authenticate();
	var result;
	github.repos.getHooks({
		user: config.organization,
		repo: repo
	}, function(err,hooks) {
		if(hooks && hooks.length) {
			hooks.forEach(function(hook) {
				if(hook.name === 'web' && hook.config.url.match(config.botUrlRoot + action)) {
					result = hook.id;
				}
			});
		}
		callback(null,result);
	});
}

function createStatus (repo, status, sha, description, callback) {
	auth.authenticate();
	github.repos.createStatus({
		user: config.organization,
		repo: repo,
		state: status,
		sha: sha,
		context: "Peer Review Bot",
		description: description/*,
		target_url: config.botUrlRoot + "/pr-status/" + repo + "/" + pr.id*/
	}, function(err, reply) {
		callback(err,reply);
	});
}

module.exports = {
	createWebHook: createWebHook,
	deleteWebHook: deleteWebHook,
	getWebHookId: getWebHookId,
	createStatus: createStatus
};
