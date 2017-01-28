var githubApi = require('./github-api'),
	github = githubApi.service,
	auth = require('./auth'),
	debug = require('debug')('reviewbot:bot'),
	config = require('../../../config');


/**
 * Post a comment to an issue
 * @param {int} number - Number of the PR/issue to post to
 * @param {string} comment - Comment to post
 * @callback {postCommentCb} callback
 */
function postComment(number, repo, comment, callback) {
	/**
	 * @callback postCommentCb
	 * @param {Object} result - Result returned from GitHub
	 */
	auth.authenticate();
	github.issues.createComment({
		owner: config.github.organization,
		repo: repo,
		number: number,
		body: comment
	}, function(error, result) {
		if (error) {
			console.log('postComment: Error while trying to post instructions:');
			console.log(error);
			return debug('postComment: Error while trying to post instructions:', error);
		}
		if (callback) {
			callback(result);
		}
	});
}

module.exports = {
	postComment: postComment
}
