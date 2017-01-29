'use strict';
const githubApi = require('./github-api');
const github = githubApi.service;
const auth = require('./auth');
const debug = require('debug')('reviewbot:bot');
const config = require('../../../config');
const Promise = require('promise');
const async = require('async');

let getAll = (repo) => {
	return new Promise((resolve, reject) => {
		auth.authenticate();
		let allHooks = [];
		github.repos.getHooks({
			owner: config.organization,
			per_page: 100,
			repo: repo.name
		}, (err, results) => {
			if (err) {
				return reject(err);
			}
			let currentResults = results;
			allHooks = allHooks.concat(results);
			async.whilst(() => {
				// if there are more pages
				return github.hasNextPage(currentResults);
			}, (next) => {
				// each iteration
				github.getNextPage(currentResults, (err, results) => {
					if (err) {
						console.error(err);
						return next(err);
					}
					currentResults = results;
					allHooks = allHooks.concat(results);
					next(null, results);
				})
			}, (err, results) => {
				// done
				if (err) {
					reject(err);
				} else {
					resolve({
						repo: repo,
						hooks: allHooks
					});
				}
			});
		});
	});
}

let filterBotHooks = (repoName, hooks) => {
	return new Promise(function(resolve, reject) {
		async.filter(hooks, (hook, next) => {
			let keep = false;
			if ((!hook.config && !hook.config.url) || hook.name !== "web" ||
				hook.url.indexOf(repoName) < 0 ||
				hook.config.url.substring(0, config.botUrlRoot.length) !== config.botUrlRoot) {
				return next(null, false);
			}
			try {
				// each item check
				let hasEvent = false;
				for (let e = 0; e < config.pullRequestEvents.length; ++e) {
					if (hook.events.indexOf(config.pullRequestEvents[e]) >= 0) {
						hasEvent = true;
						break;
					}
				}
				next(null, hasEvent);
			} catch (e) {
				return next(e);
			}
		}, (err, results) => {
			if (err) {
				console.error(err);
				reject(err);
			} else {
				resolve(results);
			}
		});
	});
};

function createWebHook(repo, url, events, callback) {
	auth.authenticate();
	github.repos.createHook({
		owner: config.organization,
		repo: repo,
		name: "web",
		config: {
			content_type: "json",
			url: url,
			secret: config.webhookSecret
		},
		events: events
	}, function(err, result) {
		if (callback) {
			callback(err, result);
		}
	});
}

function deleteWebHook(repo, id, callback) {
	auth.authenticate();
	github.repos.deleteHook({
		owner: config.organization,
		repo: repo,
		id: id
	}, function(err, reply) {
		if (callback) {
			callback(err, reply);
		}
	});
}

function getWebHookId(repo, action, callback) {
	auth.authenticate();
	var result;
	github.repos.getHooks({
		owner: config.organization,
		repo: repo
	}, function(err, hooks) {
		if (hooks && hooks.length) {
			hooks.forEach(function(hook) {
				if (hook.name === 'web' && hook.config.url.match(config.botUrlRoot + action)) {
					result = hook.id;
				}
			});
		}
		callback(null, result);
	});
}

function createStatus(repo, status, sha, description, callback) {
	auth.authenticate();
	github.repos.createStatus({
		owner: config.organization,
		repo: repo,
		state: status,
		sha: sha,
		context: "Peer Review Bot",
		description: description
		/*,
				target_url: config.botUrlRoot + "/pr-status/" + repo + "/" + pr.id*/
	}, function(err, reply) {
		callback(err, reply);
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
	statusStates: statusStates,
	filterBotHooks: filterBotHooks
};
