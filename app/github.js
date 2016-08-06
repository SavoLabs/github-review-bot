var githubApi = require('./services/github/github-api'),
	webhooks = require('./services/github/webhooks'),
	repos = require('./services/github/repository'),
	auth = require('./services/github/auth'),
	pullrequests = require('./services/github/pullrequests'),
	comments = require('./services/github/comments'),
	users = require('./services/github/users'),
	reactions = require('./services/github/reactions'),
	debug = require('debug')('reviewbot:bot'),
	config = require('../config');


module.exports = {
	service: githubApi.service,
	webhooks: webhooks,
	repos: repos,
	pullrequests: pullrequests,
	auth: auth,
	comments: comments,
	reactions: reactions,
	users: users
};
