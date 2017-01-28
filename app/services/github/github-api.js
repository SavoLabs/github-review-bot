var GitHubApi = require('github'),
	debug = require('debug')('reviewbot:githubapi'),
	config = require('../../../config');

var github = new GitHubApi({
  debug: false,
  protocol: "https",
  host: "api.github.com", // should be api.github.com for GitHub
  followRedirects: false, // default: true; there's currently an issue with non-get redirects, so allow ability to disable follow-redirects
  timeout: 8000,
	version: '3.0.0',
	headers: {
		"Accept": "application/vnd.github.black-cat-preview+json; application/vnd.github.squirrel-girl-preview; */*"
	}
});

module.exports = {
	service: github
};
