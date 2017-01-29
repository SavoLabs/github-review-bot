'use strict';
const express = require('express');
const bot = require('../bot');
const github = require('../github');
const debug = require('debug')('reviewbot:audit');
const router = express.Router();
const config = require('../../config');
const loginRoute = '/login';
const Promise = require('promise');

let requireLoggedIn = () => {
	return require('connect-ensure-login').ensureLoggedIn(loginRoute);
};

/* GET home page. */
router.get('/', requireLoggedIn(), function (req, res, next) {
	github.auth.isUserInOrganization(req.user).then((allowed) => {
		if(allowed) {
			github.users.getAll("2fa_disabled", (err,result) => {
				res.render("audit", {users: result});
			});
		} else {
			console.log("not Authorized");
			var err = new Error('Not Authorized.');
			err.status = 403;
			throw err;
		}
	}, (err) => { throw err; });
});

module.exports = router;
