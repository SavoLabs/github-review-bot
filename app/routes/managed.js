var express = require('express'),
		bot = require('../bot'),
		github = require('../github'),
		debug = require('debug')('reviewbot:comment'),
    router = express.Router(),
		config = require('../../config');
		loginRoute = '/login';

var requireLoggedIn = function () {
	return require('connect-ensure-login').ensureLoggedIn(loginRoute);
};

/* GET home page. */
router.get('/', requireLoggedIn(), function (req, res) {
	github.auth.isUserInOrganization(req.user, function(allowed) {
		if(allowed) {
			github.repos.getAll(function(repos) {
				var managedList = [];
				for(var x = 0; x < repos.length; ++x) {
					var repo = repos[x];
					github.webhooks.getAll(repo, function(r, hooks) {
						for(var y = 0; y < hooks.length; ++y) {
							var hook = hooks[y];
							if(hook.name !== "web" || !hook.config || !hook.config.url) {
								// skip
								continue;
							}
							if(hook.config.url.slice(0,config.botUrlRoot.length) === config.botUrlRoot) {
								managedList[managedList.length] = {
									hook: hook,
									repo: r
								};
								break;
							}
						}

						var dataObject = { data: managedList, user: req.user };
						res.render('managed', dataObject);
					});
				}
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
