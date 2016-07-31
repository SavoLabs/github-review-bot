var githubApi = require('./github-api'),
	github = githubApi.service,
	auth = require('./auth'),
	debug = require('debug')('reviewbot:bot'),
	config = require('../../../config');


/**
 * Fetch a single pull requests in the currently configured repo
 * @callback {getPullRequestsCb} callback
 */
function get(prNumber, repo, callback) {
	auth.authenticate();
	/**
	 * @callback getPullRequestsCb
	 * @param {Object[]} result - Returned pull request objects
	 */
	debug('GitHub: Attempting to get PR #' + prNumber);

	github.pullRequests.get({
		user: config.organization,
		repo: repo,
		number: prNumber
	}, function(error, result) {
		if (error) {
			return debug('getPullRequests: Error while fetching PRs: ' + error);
		}
		debug('GitHub: PR successfully recieved. Changed files: ' + result.changed_files);
		if (callback) {
			callback([result]);
		}
	});
}


/**
 * Fetch all pull requests in the currently configured repo
 * @callback {getPullRequestsCb} callback
 */
function getAll(repo, callback) {
	auth.authenticate();

	/**
	* @callback getPullRequestsCb
	* @param {Object[]} result - Returned pull request objects
	*/
	github.pullRequests.getAll({
		user: config.organization,
		repo: repo,
		state: config.pullRequestStatus
	}, function(error, result) {
		if (error) {
			return debug('getPullRequests: Error while fetching PRs: ', error);
		}

		if (!result || !result.length || result.length < 1) {
			return debug('getPullRequests: No open PRs found');
		}

		if (callback) {
			callback(result);
		}
	});
}

module.exports = {
	get: get,
	getAll: getAll
};
