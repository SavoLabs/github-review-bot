var githubApi = require('./github-api'),
	github = githubApi.service,
	auth = require('./auth'),
	debug = require('debug')('reviewbot:bot'),
	config = require('../../../config');

function get(filter) {
	auth.authenticate();

	github.orgs.getMembers({
		org: config.organization,
		filter
	})
}

module.exports = {

};
