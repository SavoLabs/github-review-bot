var express = require('express'),
		bot = require('../bot'),
		github = require('../github'),
		debug = require('debug')('reviewbot:audit'),
    router = express.Router(),
		config = require('../../config'),
		loginRoute = '/login';

var requireLoggedIn = function () {
	return require('connect-ensure-login').ensureLoggedIn(loginRoute);
};

/* GET home page. */
router.get('/', requireLoggedIn(), function (req, res) {
	github.auth.isUserInOrganization(req.user, function(allowed) {
		if(allowed) {
			github.users.getAll("2fa_disabled", function(err,result) {
				res.render("audit", {users: result});
			});
		} else {
			console.log("not Authorized");
			var err = new Error('Not Authorized.');
			err.status = 403;
			return err;
		}
	});
});

module.exports = router;
