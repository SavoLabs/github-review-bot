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

let createWebHook = (repo, url, events) => {
	return new Promise((resolve, reject) => {
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
			if (err) {
				return reject(err);
			}
			resolve(result);
		});
	});
};

let deleteWebHook = (repo, id) => {
	return new Promise((resolve, reject) => {
		auth.authenticate();
		github.repos.deleteHook({
			owner: config.organization,
			repo: repo,
			id: id
		}, (err, reply) => {
			if(err) {
				return reject(err);
			}
			resolve(reply);
		});
	});
};

let getWebHookId = (repo, action) => {
	return new Promise((resolve, reject) => {
		auth.authenticate();
		let result = null;
		github.repos.getHooks({
			owner: config.organization,
			repo: repo
		}, (err, hooks) => {
			if(err) {
				// we just return nothing
				return resolve(null);
			}
			async.each(hooks, (item, next) => {
				if (hook.name === 'web' && hook.config.url.match(config.botUrlRoot + action)) {
					result = hook.id;
				}
				next();
			}, (err) => { // done
				if(err) {
					return resolve(null);
				}
				resolve(result);
			});
		});
	});
};

let createStatus = (repo, status, sha, description, callback) => {
	return new Promise((resolve, reject) => {
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
		}, (err, reply) => {
			if(err) {
				reject(err);
			} else {
				resolve(reply);
			}
		});
	});

};

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
