var githubApi = require('./services/github/github-api'),
	webhooks = require('./services/github/webhooks'),
	repos = require('./services/github/repository'),
	auth = require('./services/github/auth'),
	debug = require('debug')('reviewbot:bot'),
	config = require('../config');


module.exports = {
	service: githubApi.service,
	webhooks: webhooks,
	repos: repos,
	auth: auth
};
