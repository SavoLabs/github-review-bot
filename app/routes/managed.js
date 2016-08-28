var express = require('express'),
		bot = require('../bot'),
		github = require('../github'),
		debug = require('debug')('reviewbot:managed'),
    router = express.Router(),
		config = require('../../config'),
		loginRoute = '/login';

var requireLoggedIn = function () {
	return require('connect-ensure-login').ensureLoggedIn(loginRoute);
};

function _renderManaged ( req, res, data ) {
	var dataObject = { repos: data, user: req.user };
	res.render('managed', dataObject);
}

/* GET home page. */
router.get('/', requireLoggedIn(), function (req, res) {
	github.auth.isUserInOrganization(req.user, function(allowed) {
		if(allowed) {
			var processedCount = 0;
			github.repos.getAll(function(repos) {
				var managedList = [];
				for(var x = 0; x < repos.length; ++x) {
					var repo = repos[x];
					github.webhooks.getAll(repo, function(r, h) {
						var filtered = h.filter(function(x) {
							var hasEvent = false;
							for(var e = 0; e < config.pullRequestEvents.length; ++e ) {
								if(x.events.indexOf(config.pullRequestEvents[e]) >= 0) {
									hasEvent = true;
									break;
								}
							}
							return x.name === "web" &&
								x.config &&
								x.config.url &&
								x.url.indexOf(r.name) > 0 &&
								hasEvent &&
								x.config.url.substring(0,config.botUrlRoot.length) === config.botUrlRoot
						});
						for(var y = 0; y < filtered.length; ++y) {
							var hook = filtered[y];
							if(managedList.filter(function(t) { return t.repo.name === r.name; }).length === 0) {
								managedList[managedList.length] = {
									hook: hook,
									repo: r
								};
							}
						}
						processedCount++;
						if (processedCount >= repos.length) {
							// sort the items
							managedList.sort(function(a,b) {
								if(a.repo.name.toLowerCase() < b.repo.name.toLowerCase()) {
									return -1;
								} else if ( a.repo.name.toLowerCase() > b.repo.name.toLowerCase()) {
									return 1;
								} else {
									return 0;
								}
							});
							_renderManaged(req, res, managedList);
						}
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
