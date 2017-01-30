'use strict';
const githubApi = require('./github-api');
const github = githubApi.service;
const auth = require('./auth');
const debug = require('debug')('reviewbot:bot');
const config = require('../../../config');
const Promise = require('promise');

let getForPullRequest = (repo, prNumber) => {
	return new Promise((resolve, reject) => {

		if (!config.enableReactions) {
			return resolve([]);
		}
		github.reactions.getForIssue({
			owner: config.organization,
			repo: repo,
			number: prNumber
		}, (err, res) => {
			if (err) {
				console.error(err);
				return reject(err);
			}
			return resolve(res);
		});
	});
}

module.exports = {
	getForPullRequest: getForPullRequest
};
