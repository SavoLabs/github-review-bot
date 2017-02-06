'use strict';
const githubApi = require('./github');
const github = githubApi.service;
const debug = require('debug')('reviewbot:bot');
const config = require('./config');
const rules = require('./rules');
const Promise = require('promise');
const async = require('async');

/**
 * Only fires when a new repository is created
 * @param {String} name : The name of the event triggered
 * @param {Object} payload : The payload sent from the even
 */
let onRepositoryCreate = (name, payload) => {
	return new Promise((resolve, reject) => {

		if (eventName !== 'repository' && payload.action !== 'created') {
			return reject(`Not responding to the event: ${eventName}:${payload.action}`);
		}
		let route = _getRoute('webhooks/pullrequest');
		var hookUrl = config.botUrlRoot + route;
		// this will resolve even if it fails
		githubApi.webhooks.createWebHook(payload.repository.name, hookUrl, config.webHookEvents).then((result) => {
			return _processRules(eventName, payload).then(() => {
				return resolve();
			}, (err) => {
				return resolve();
			});
		}, (err) => {
			return _processRules(eventName, payload).then(() => {
				return resolve();
			}, (err) => {
				return resolve();
			});
		}, (err) => {
			return reject(er);
		});
	});
};

/**
 * Fires when any webhook event is triggered from Github
 * @param {String} name : The name of the event triggered
 * @param {Object} payload : The payload sent from the even
 */
let onEvent = (name, payload) => {
	return new Promise((resolve, reject) => {

		if (name === 'repository' && payload.action === 'created') {
			return reject(`Not responding to the event: ${eventName}:${payload.action}. Already processed.`);
		}

		async.each(rules, (item, next) => {
			if (item.beginProcessing && (item.enabled || item.enabled === undefined)) {
				console.log("running: " + item.name);
				item.beginProcessingEvent(name, payload || {}).then(() => {
					if (item.processEvent) {
						item.onEvent(name, payload || {}).then(() => {
							console.log(`finished ${item.name}`);
							next();
						}, (err) => {
							next(err);
						});
					} else {
						next();
					}
				}, (err) => {
					next(err);
				});
			} else {
				next();
			}

		}, (err) => { // done
			if (err) {
				console.error(err);
				return reject(err);
			}
			console.log("done with all");
			return resolve(payload);
		});
	});
};

let _processRules = (name, payload) => {
	return new Promise(function(resolve, reject) {
		async.each(rules, (item, next) => {
			if (item.onRepositoryCreate && (item.enabled || item.enabled === undefined)) {
				console.log("rule '" + item.name + ":onRepositoryCreate'");
				item.onRepositoryCreate(name, payload).then(() => {
					console.log(`${item.name} complete`);
					next();
				}, (err) => {
					next();
				});
			} else {
				next();
			}
		}, (err) => { // done
			return resolve();
		});
	});
};

let _getRoute = (section) => {
	if (!config[section]) {
		try {
			let prHookConfig = require(`./routes/${section}.config`);
			route = typeof prHookConfig[section].route === typeof [] ? prHookConfig[section].route[0] : prHookConfig[section].route;
		} catch (e) {
			return "";
		}
	} else {
		route = typeof config[section].route === typeof [] ? config[section].route[0] : config[section].route;
	}
};

module.exports = {
	enforce: enforce,
	unenforce: unenforce,
	onRepositoryCreate: onRepositoryCreate,
	onEvent: onEvent
}
