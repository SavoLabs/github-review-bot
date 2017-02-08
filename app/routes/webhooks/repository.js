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
			let cfg = config['webhooks/repository'];
			if (!cfg.events[eventName]) {
				return reject(`POST event received, but the event '${eventName}' is not an event I process.`);
			}

			// make sure we have a body to parse
			if (!payload) {
				return reject(`POST event received, but it does not contain a body.`);
			}

			if (!cfg.enabled) {
				return reject('POST event received but Repository hook not enabled: stopping.');
			}

			if (!payload.repository) {
				return reject('POST event received, but repository was not included in the body.');
			}

			return resolve({
				name: eventName,
				payload: payload
			});
		}, (err) => {
			return reject(err);
		});
	});
};

let _processRepositoryEvent = (request, response, next) => {
	_validateEventBeforeProcess(request, response).then((result) => {
		try {
			let payload = result.payload;
			enforcer.onRepositoryCreate(result.name, payload).then(() => {
				try {
					console.log("after:enforcer.onRepositoryCreate");
					return _respond(response, `Successfully executed: bot.onRepositoryCreate: ${payload.repository.name}.`);
				} catch (x) {
					return _respond(response, x.toString());
				}
			}, (err) => {
				console.log(`Error executing enforcer.onRepositoryCreate:${payload.repository.name}.\n Error: ${err.toString()}`);
				debug(`Error executing enforcer.onRepositoryCreate:${payload.repository.name}.`, err);
				return _respond(response, `Error executing enforcer.onRepositoryCreate:${payload.repository.name}.\n Error: ${err.toString()}`);
			});
		} catch(e) {
			console.error(e);
			return _respond(response, e.toString());
		}
	}, (err) => {
		console.error(err);
		debug(err.message, err);
		return _respond(response, err.toString());
	});
};

router.post('/', _processRepositoryEvent);

module.exports = router;
