'use strict';
var express = require('express'),
    bot = require('../bot'),
    githubApi = require('../github'),
    config = require('../../config'),
    debug = require('debug')('reviewbot:deployment'),
    router = express.Router(),
		loginRoute = '/login';

var requireLoggedIn = function () {
	return require('connect-ensure-login').ensureLoggedIn(loginRoute);
};

router.post('/:ref', requireLoggedIn(), _handleDeploymentEvent);

function _handleDeploymentEvent (req, res) {
	var ref = req.params.ref;
	var deployment = req.body.deployment;


}

module.exports = router;
