var githubApi = require('./services/github/github-api'),
	webhooks = require('./services/github/webhooks'),
	repos = require('./services/github/repository'),
	auth = require('./services/github/auth'),
	pullrequests = require('./services/github/pullrequests'),
	debug = require('debug')('reviewbot:bot'),
	config = require('../config');


module.exports = {
	service: githubApi.service,
	webhooks: webhooks,
	repos: repos,
	pullrequests: pullrequests,
	auth: auth
};
