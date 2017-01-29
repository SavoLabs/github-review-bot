'use strict';
const githubApi = require('./github-api');
const github = githubApi.service;
const auth = require('./auth');
const debug = require('debug')('reviewbot:bot');
const config = require('../../../config');
const Promise = require('promise');
const async = require('async');

let getComments = (repo, number) => {
	return new Promise((resolve, reject) => {
		auth.authenticate();
		github.issues.getComments({
			owner: config.organization,
			repo: repo,
			number: number,
			per_page: 100
		}, (err, results) => {
			if(err) {
				return reject(err);
			}
			let currentResults = results;
			async.whilst(()=> {
				// if there are more pages
				return github.hasNextPage(currentResults);
			}, (next) => {
				// each iteration
				if(err) {
					console.error(err);
					return next(err);
				}
				currentResults = results;
				next(null, results);
			}, (err, results) => {
				// done
				if(err) {
					reject(err);
				} else {
					resolve(results);
				}
			});
		});
	});
}

let getCommentsSince = (repo, number, date) => {
	return new Promise((resolve, reject) => {
		getComments(repo, number).then((comments) => {
			let filtered = comments.filter((c) => {
				let cdate = Date.parse(c.updated_at);
				return cdate >= date;
			});
			return resolve(filtered);
		}, (err) => {
			return reject(err);
		});
	});
};

let getLabels = (repo, number, callback) => {
	auth.authenticate();
	github.issues.getIssueLabels({
		owner: config.organization,
		repo: repo,
		number: number
	}, function(err, result) {
		if (callback) {
			callback(err, result);
		}
	});
}

let edit = (repo, number, data, callback) => {
	auth.authenticate();
	github.issues.edit({
		owner: config.organization,
		repo: repo,
		number: number,
		labels: data.labels ? data.labels : undefined,
		title: data.title ? data.title : undefined,
		body: data.body ? data.body : undefined,
		assignee: data.assignee ? data.assignee : undefined,
		assignees: data.assignees ? data.assignees : undefined,
	}, function(error, result) {
		if (callback) {
			callback(error, result);
		}
	});
};

module.exports = {
	getComments: getComments,
	getCommentsSince: getCommentsSince,
	getLabels: getLabels,
	edit: edit
};
