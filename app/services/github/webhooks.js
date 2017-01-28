var githubApi = require('./github-api'),
	github = githubApi.service,
	auth = require('./auth'),
	debug = require('debug')('reviewbot:bot'),
	config = require('../../../config');

	var _knownHooks = [];
	function _getHooks ( err, res, repo, callback) {
			if(err){
				console.log(err);
				return false;
			}
			_knownHooks = _knownHooks.concat(res);
			if(github.hasNextPage(res)) {
				github.getNextPage(res, function(err,res) { _getHooks(err,res,repo, callback) });
			} else {
				if(callback) {
					callback(repo, _knownHooks);
				}
			}
	}

function getAll(repo, callback) {
	auth.authenticate();
	_knownHooks = [];
	github.repos.getHooks({
		owner: config.github.organization,
		repo: repo.name,
		per_page: 100
	}, function(err,res) {
		_getHooks(err, res, repo, callback);
	})
}

function createWebHook (repo, url, events, callback) {
	auth.authenticate();
	github.repos.createHook({
		owner: config.github.organization,
		repo: repo,
		name: "web",
		config: {
			content_type: "json",
			url: url,
			secret: config.github.webhookSecret
		},
		events: events
	}, function (err, result) {
	  if(callback) {
			callback(err,result);
		}
	});
}

function deleteWebHook ( repo, id, callback ) {
	auth.authenticate();
	github.repos.deleteHook({
		owner: config.github.organization,
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
		owner: config.github.organization,
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
		owner: config.github.organization,
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

var statusStates = {
	pending: 0,
	success: 1,
	failure: -1
};

module.exports = {
	getAll: getAll,
	createWebHook: createWebHook,
	deleteWebHook: deleteWebHook,
	getWebHookId: getWebHookId,
	createStatus: createStatus,
	statusStates: statusStates
};
