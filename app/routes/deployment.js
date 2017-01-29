'use strict';
const express = require('express');
const bot = require('../bot');
const githubApi = require('../github');
const config = require('../../config');
const debug = require('debug')('reviewbot:deployment');
const router = express.Router();
const loginRoute = '/login';
const Promise = require('promise');

var requireLoggedIn = function () {
	return require('connect-ensure-login').ensureLoggedIn(loginRoute);
};

router.post('/:ref', requireLoggedIn(), _handleDeploymentEvent);

function _handleDeploymentEvent (req, res) {
	var ref = req.params.ref;
	var deployment = req.body.deployment;


}

module.exports = router;
