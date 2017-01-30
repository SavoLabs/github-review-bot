'use strict';
const githubApi = require('./github-api');
const github = githubApi.service;
const auth = require('./auth');
const debug = require('debug')('reviewbot:bot');
const config = require('../../../config');
const Promise = require('promise');

/**
 * Post a comment to an issue
 * @param {int} number - Number of the PR/issue to post to
 * @param {string} comment - Comment to post
 * @callback {postCommentCb} callback
 */
let postComment = (number, repo, comment) => {
	return new Promise(function(resolve, reject) {
		/**
		 * @callback postCommentCb
		 * @param {Object} result - Result returned from GitHub
		 */
		auth.authenticate();
		github.issues.createComment({
			owner: config.organization,
			repo: repo,
			number: number,
			body: comment
		}, (err, result) => {
			if (err) {
				console.log('postComment: Error while trying to post instructions:');
				console.log(err);
				debug('postComment: Error while trying to post instructions:', err);
				reject(error);
			}
			resolve(result);
		});
	});
}

module.exports = {
	postComment: postComment
}
