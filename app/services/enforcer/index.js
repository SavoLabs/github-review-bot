'use strict';
const githubApi = require('../../github');
const config = require('../../config');
const github = githubApi.service;
const debug = require('debug')('reviewbot:bot');
const Promise = require('promise');
const async = require('async');

let enforce = (repo, reviewsNeeded) => {
	return new Promise((resolve, reject) => {
		var resultReviewsNeeded = reviewsNeeded;
		if (!resultReviewsNeeded || isNaN(resultReviewsNeeded) || resultReviewsNeeded < 1) {
			resultReviewsNeeded = config.reviewsNeeded;
		}
		let route = _getRoute('webhooks/pullrequest');
		var cbUrl = `${config.botUrlRoot}${route}/${resultReviewsNeeded.toString()}`;
		githubApi.webhooks.createWebHook(repo, cbUrl, '*').then((result) => {
			resolve(result);
		}, (err) => {
			reject(err);
		});
	});
};

let unenforce = (repo) => {
	return new Promise((resolve, reject) => {
		let route = _getRoute('webhooks/pullrequest');
		githubApi.webhooks.getWebHookId(repo, route).then((id) => {
			if (!id) {
				// no hook found, we can just return
				return resolve({
					result: 'ok'
				});
			}
			githubApi.webhooks.deleteWebHook(repo, id).then((reply) => {
				// return the response
				resolve(reply);
			}, (err) => {
				reject(err);
			});
		}, (err) => {
			// getWebHookId should never err.
			reject(err);
		});
	});
};
