var express = require('express'),
		bot = require('../bot'),
		github = require('../github'),
		debug = require('debug')('reviewbot:nonmanaged'),
    router = express.Router(),
		config = require('../../config'),
		loginRoute = '/login';

var requireLoggedIn = function () {
	return require('connect-ensure-login').ensureLoggedIn(loginRoute);
};

function _renderNonmanaged ( req, res, data ) {
	var dataObject = { repos: data, user: req.user };
	res.render('nonmanaged', dataObject);
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
						var hasWebHook = false;
						var filtered = h.filter(function(t) {
							var hasEvent = false;
							for(var e = 0; e < config.pullRequestEvents.length; ++e ) {
								if(t.events.indexOf(config.pullRequestEvents[e]) >= 0) {
									hasEvent = true;
									break;
								}
							}
							return t.name === "web" &&
								t.config &&
								t.config.url &&
								t.url.indexOf(r.name) > 0 &&
								hasEvent &&
								t.config.url.substring(0,config.botUrlRoot.length) === config.botUrlRoot
						});
						hasWebHook = filtered.length > 0;

						if(!hasWebHook && managedList.filter(function(t) { return t.repo.name === r.name; }).length === 0) {
							managedList[managedList.length] = {
								repo: r
							};
						}

						processedCount++;
						if (processedCount >= repos.length) {
							managedList.sort(function(a,b) {
								if(a.repo.name.toLowerCase() < b.repo.name.toLowerCase()) {
									return -1;
								} else if ( a.repo.name.toLowerCase() > b.repo.name.toLowerCase()) {
									return 1;
								} else {
									return 0;
								}
							});
							_renderNonmanaged(req, res, managedList);
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
