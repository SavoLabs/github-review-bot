var express = require('express'),
		bot = require('../bot'),
		github = require('../github'),
		debug = require('debug')('reviewbot:comment'),
    router = express.Router(),
		loginRoute = '/login';

var requireLoggedIn = function () {
	return require('connect-ensure-login').ensureLoggedIn(loginRoute);
};

/* GET home page. */
router.get('/', requireLoggedIn(), function (req, res) {
	github.repos.getAll
});


module.exports = router;
