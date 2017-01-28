var githubApi = require('./github-api'),
	github = githubApi.service,
	auth = require('./auth'),
	debug = require('debug')('reviewbot:bot'),
	config = require('../../../config');

function getForPullRequest(repo, prNumber, callback) {
	if(!config.enableReactions) {
		callback(null,[]);
		return;
	}
	github.reactions.getForIssue({
		owner: config.organization,
		repo: repo,
		number: prNumber
	}, function(err,res) {
		if(callback) {
			callback(err,res);
		}
	});
}

module.exports = {
	getForPullRequest: getForPullRequest
};
