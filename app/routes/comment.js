'use strict';
const express = require('express');
const bot = require('../bot');
const github = require('../github');
const debug = require('debug')('reviewbot:comment');
const router = express.Router();
const Promise = require('promise');
/**
 * Respond using a given Express res object
 * @param {Object} res - Express res object
 * @param {string|string[]} message - Either a message or an array filled with messages
 */
let _respond = (res, message) => {
	if (res && message) {
		if (message.isArray) {
			return res.json({
				messages: JSON.stringify(message)
			});
		} else {
			res.json({
				message: message
			});
		}
	}
}

router.post('/', function(req, res) {
	if (!req.body) {
		debug('POST Request received, but no body posted!');
		return res.status(400).json({
			error: 'POST Request received, but no body posted!'
		});
	}

	if (!req.body.id) {
		debug('POST Request received, but no id given!');
		return res.status(400).json({
			error: 'POST Request received, but no id given!'
		});
	}

	if (!req.body.comment) {
		debug('POST Request received, but no comment given!');
		return res.status(400).json({
			error: 'POST Request received, but no comment given!'
		});
	}

	let id = req.body.id;
	let comment = req.body.comment;

	github.comments.postComment(id, comment).then((result) => {
		return _respond(res, 'Sucessfully posted comment');
	}, (err) => {
		throw err;
	});
});

module.exports = router;
