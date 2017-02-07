'use strict';
const githubApi = require('./github');
const github = githubApi.service;
const debug = require('debug')('reviewbot:bot');
const config = require('./config');
const rules = require('./rules');
const Promise = require('promise');
const async = require('async');
const enforcerService = require('./services/enforcer');
/**
 * Only fires when a new repository is created
 * @param {String} name : The name of the event triggered
 * @param {Object} payload : The payload sent from the even
 */
let onRepositoryCreate = (name, payload) => {
	return new Promise((resolve, reject) => {
		try {
			if (name !== 'repository' && payload.action !== 'created') {
				return reject(`Not responding to the event: ${name}:${payload.action}`);
			}

			// this will resolve even if it fails
			enforcerService.enforce(payload.repository.name).then((result) => {
				return _processRules(name, payload).then(() => {
					return resolve();
				}, (err) => {
					return resolve();
				});
			}, (err) => {
				console.log("enforcer.enforce:error");
				console.error(err);
				// process the rules, even if enforce fails
				return _processRules(name, payload).then(() => {
					return resolve();
				}, (err) => {
					return resolve();
				});
			})
		} catch (e) {
			console.error(e);
			return reject(e);
		}
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
			return reject(`Not responding to the event: ${name}:${payload.action}. Already processed.`);
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


module.exports = {
	onRepositoryCreate: onRepositoryCreate,
	onEvent: onEvent
}
