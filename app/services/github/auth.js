var githubApi = require('./github-api'),
	github = githubApi.service,
	debug = require('debug')('reviewbot:bot'),
	config = require('../../../config');

	/**
	 * Private: Authenticate next request
	 */
	function authenticate() {
		if (!config.accessToken) {
			throw Error('Fatal: No access token configured!');
		}

		github.authenticate({
			type: "basic",
	    username: config.username,
	    password: config.accessToken
			// type: 'oauth',
			// token: config.oauth2token
		});
	}

	function isUserInOrganization(user, callback) {
		authenticate();
		console.log("membership for " + user.username + " in " + config.organization);
		github.orgs.getOrganizationMembership({
			org: config.organization,
			username: user.username
		}, function(err, result) {
			if(err){
				callback(false);
			} else {
				callback(true);
			}
		});
	}

	function isXHubValid(req, callback) {
		if(!req.isXHub || config.webhookSecret == '' || config.webhookSecret == null) {
			callback(true);
			return;
		}
		console.log("xhub validated: " + req.isXHubValid());
		callback(req.isXHubValid());
	}

	module.exports = {
		authenticate: authenticate,
		isUserInOrganization: isUserInOrganization,
		isXHubValid: isXHubValid
	};
