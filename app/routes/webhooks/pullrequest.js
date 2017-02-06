'use strict';
const express = require('express');
const enforcer = require('../../enforcer');
const githubApi = require('../../github');
const config = require('../../../config');
const debug = require('debug')('reviewbot:pullrequest');
const router = express.Router();
const Promise = require('promise');
const merge = require('merge');

let _respond = (response, message) => {
	try {
		if (response && message) {
			if (message.isArray) {
				return response.json({
					messages: JSON.stringify(message)
				});
			} else {
				return response.json({
					message: message
				});
			}
		} else {
			throw new Error("No Message or Response Object");
		}
	} catch (e) {
		throw e;
	}
};

let _validateEventBeforeProcess = (request, response) => {
	return new Promise((resolve, reject) => {
		githubApi.auth.isXHubValid(request).then((valid) => {
			if (!valid) {
				return reject('XHub signature did not match expected.');
			}
			let eventName = request.get('X-GitHub-Event');
			let payload = request.body.payload ? JSON.parse(request.body.payload) : request.body;
			let cfg = config['webhooks/pullrequest'];

			// ensure we only handle events we know how to handle
			if (!cfg.events[eventName]) {
				return reject(`POST event received, but the event '${eventName}' is not an event I process.`);
			}

			// make sure we have a body to parse
			if (!payload) {
				return reject(`POST event received, but it does not contain a body.`);
			}

			if (!payload.action || cfg.events[eventName].indexOf(payload.action) < 0) {
				return reject(`POST event received, but '${payload.action}' is not an action I process for the '${eventName}' event.`);
			}

			// ignore change made by the bot
			if (payload.sender.login === config.username) {
				return reject(`POST event '${eventName}' received, but the action was made by '${config.username}' and I do not process 'self' events.`);
			}

			// check that we have the repository obejct
			if (!payload.repository) {
				return reject(`POST event '${eventName}' received, but no repository found within the body.`);
			}
			// this is a 'simple' PR action
			if (payload.pull_request && payload.pull_request.state && payload.pull_request.number) {
				// the state of this PR is a state that I do not care about
				if (cfg.states.indexOf(payload.pull_request.state) < 0) {
					return reject(`POST event '${eventName}' received, but I do not process PR's is in the '${payload.pull_request.state}' state.`);
				}

				githubApi.issues.get(payload.repository.name, payload.pull_request.number).then((issue) => {
					return resolve({
						name: eventName,
						payload: merge(payload, {
							issue: issue
						})
					});
				}, (err) => {
					console.log(`Error: While trying to get the associated issue: ${err.toString()}`);
					debug("Error: While trying to get the associated issue:", err);
					// we will just return without the associated issue.
					return resolve({
						name: eventName,
						payload: payload
					});
				});
			} else if (payload.issue && payload.issue.pull_request && payload.issue.state) {

				if (cfg.states.indexOf(payload.issue.state) < 0) {
					return reject(`POST event '${eventName}' received, but I do not process PR's is in the '${payload.issue.state}' state.`);
				}

				// get the pullrequest to process
				githubApi.pullrequests.get(payload.issue.number, payload.repository.name).then((pullrequests) => {
					if (pullrequests.length === 0) {
						return reject(`Error: Unable to find PR #${payload.issue.number} in repository '${payload.repository.name}'`);
					}

					return resolve({
						name: eventName,
						// add the pull_request object to the payload for consistency.
						payload: merge(payload, {
							pull_request: pullrequests[0]
						})
					});
				}, (err) => {
					return reject(`Error: Tried to process single pull request, but failed: ${err.toString()}`);
				});
			}


			// // the same spam happens if the PR is labeled before it is hooked
			// if (req.body.action && req.body.action === 'labeled' && req.body.pull_request && req.body.pull_request.user.login === req.body.sender.login) {
			// 	// make sure the label change is not one of the bot labels.
			// 	if (req.body.label && (req.body.label.name !== config.labelNeedsReview && req.body.label.name !== config.labelPeerReviewed)) {
			// 		console.log('POST Request received, but "' + req.body.action + '" is not an action I am looking for.');
			// 		debug('POST Request received, but "' + req.body.action + '" is not an action I am looking for.');
			// 		return reject('POST Request received, but "' + req.body.action + '" is not an action I am looking for.');
			// 	}
			// }

		}, (err) => {
			console.error(err);
			debug(err.message, err);
			return reject(err);
		});
	});
};

let _handleRequest = (req, res, next) => {
	_validateEventBeforeProcess(req, res).then((o) => {
		let payload = o.payload;
		let eventName = o.name;
		// see if the reviewsNeeded was passed as param to the callback
		if (req.params.reviewsNeeded && !isNaN(parseInt(req.params.reviewsNeeded, 0)) && parseInt(req.params.reviewsNeeded, 0) > 0) {
			config.reviewsNeeded = parseInt(req.params.reviewsNeeded, 0);
		}

		let cfg = config['webhooks/pullrequest'];
		var repo = payload.repository.name;
		enforcer.onEvent(eventName, payload).then((result) => {
			//return _respond(res, result);
			return _respond(res, `Successfully processed event '${eventName}' for action '${payload.action}' on repository '${repo}'`);
		}, (err) => {
			console.error(err);
			debug(err.message, err);
			return _respond(res, err.toString());
		});
	}, (err) => {
		console.error(err);
		debug(err.message, err);
		return _respond(res, err.toString());
	});
};



router.post('/:reviewsNeeded', _handleRequest);
router.post('/', _handleRequest);

module.exports = router;
