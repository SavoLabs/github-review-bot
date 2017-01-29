'use strict';

const githubApi = require('./github-api');
const github = githubApi.service;
const auth = require('./auth');
const debug = require('debug')('reviewbot:bot');
const config = require('../../../config');
const Promise = require('promise');

const reviewStates = {
	approved: "APPROVED",
	pending: "PENDING",
	rejected: "????"
};

/**
 * Fetch a single pull requests in the currently configured repo
 * @callback {results[]}
 */
let get = (prNumber, repo) => {
	return new Promise(function(resolve, reject) {
		auth.authenticate();
		/**
		 * @callback getPullRequestsCb
		 * @param {Object[]} result - Returned pull request objects
		 */
		debug('GitHub: Attempting to get PR #' + prNumber);

		github.pullRequests.get({
			owner: config.organization,
			repo: repo,
			number: prNumber
		}, function(err, result) {
			if (err) {
				debug('getPullRequests: Error while fetching PRs: ' + err);
				return reject(err);
			}
			debug('GitHub: PR successfully recieved. Changed files: ' + result.changed_files);
			resolve([result]);
		});
	});
}


/**
 * Fetch all pull requests in the currently configured repo
 * @callback {results[]}
 */
let getAll = (repo, callback) => {
	return new Promise(function(resolve, reject) {
		auth.authenticate();
		github.pullRequests.getAll({
			owner: config.organization,
			repo: repo,
			state: config.pullRequestStatus
		}, (err, result) => {
			if (err) {
				debug('getPullRequests: Error while fetching PRs: ', err);
				return reject(err);
			}

			if (!result || !result.length || result.length < 1) {
				reject('getPullRequests: No open PRs found');
				debug('getPullRequests: No open PRs found');
			}
			return resolve(result);
		});
	});
}

let _knownCommits = [];

let _getCommits = (res) => {
	return new Promise((resolve, reject) => {
		_knownCommits = _knownCommits.concat(res);
		if (github.hasNextPage(res)) {
			github.getNextPage(res, (err, res) => {
				if (err) {
					return reject(err);
				}
				_getCommits(res).then((results) => {
					return resolve(results);
				}, (err) => {
					return reject(err);
				})
			});
		} else {
			return resolve(_knownCommits);
		}
	});
}

let getCommits = (repo, prNumber) => {
	return new Promise((resolve, reject) => {
		auth.authenticate();
		github.pullRequests.getCommits({
			owner: config.organization,
			repo: repo,
			number: prNumber,
			per_page: 100
		}, (err, result) => {
			if (err) {
				return reject(err);
			}
			_getCommits(err, result).then((results) => {
				return resolve(results);
			}, (err) => {
				return reject(err);
			});
		});
	});
};

let getMostRecentCommit = (repo, prNumber) => {
	return new Promise((resolve, reject) => {
		getCommits(repo, prNumber).then((result) => {
			var recentDate = new Date(1970, 0, 1, 0, 0, 0);
			var recent = null;
			for (var i = 0; i < result.length; ++i) {
				var c = result[i];
				if (c.commit && c.commit.author && c.commit.author.date) {
					var tdate = Date.parse(c.commit.author.date);
					if (tdate > recentDate) {
						recent = c;
						recentDate = tdate;
					}
				}
			}
			return resolve(recent);
		}, (err) => {
			return reject(err);
		});
	});
}

let getFiles = (repo, number) => {
	return new Promise((resolve, reject) => {
		auth.authenticate();
		github.pullRequests.getFiles({
			owner: config.organization,
			repo: repo,
			number: number
		}, function(err, result) {
			if(err) {
				return reject(err);
			}
			return resolve(result);
		});
	});
}


let _knownReviews = [];
let _getReviews = (res) => {
	return new Promise((resolve, reject) => {
		_knownReviews = _knownReviews.concat(res);
		if (github.hasNextPage(res)) {
			github.getNextPage(res, (err, res) => {
				if(err) {
					return reject(err);
				}
				return _getReviews(res).then((results) => {
					return resolve(results);
				}, (err) => {
					return reject(err);
				});
			});
		} else {
			return resolve(_knownReviews);
		}
	});
};

let getAllReviews = (repo, number) => {
	return new Promise(function(resolve, reject) {
		_knownReviews = [];
		auth.authenticate();
		github.pullRequests.getReviews({
			owner: config.organization,
			repo: repo,
			number: number,
			per_page: 100
		}, (err, res) => {
			if (err) {
				return reject(err);
			}
			return _getReviews(res).then((result) => {
				return resolve(result);
			}, (err) => {
				console.error(err);
				return reject(err);
			});
		});
	});
};

module.exports = {
	get: get,
	getAll: getAll,
	getMostRecentCommit: getMostRecentCommit,
	getCommits: getCommits,
	getFiles: getFiles,
	getAllReviews: getAllReviews,
	reviewStates: reviewStates
};
