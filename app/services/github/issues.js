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
		let allComments = [];
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
			allComments = allComments.concat(results);
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
				allComments = allComments.concat(results);
				next(null, results);
			}, (err, results) => {
				// done
				if(err) {
					reject(err);
				} else {
					resolve(allComments);
				}
			});
		});
	});
}

let getCommentsSince = (repo, number, date) => {
	return new Promise((resolve, reject) => {
		try {
			getComments(repo, number).then((comments) => {
				let filtered = comments.filter((c) => {
					let cdate = Date.parse(c.updated_at);
					return cdate >= date;
				});
				return resolve(filtered);
			}, (err) => {
				return reject(err);
			});
		} catch (e) {
			return reject(e);
		}
	});
};

let getLabels = (repo, number) => {
	return new Promise(function(resolve, reject) {
		auth.authenticate();
		github.issues.getIssueLabels({
			owner: config.organization,
			repo: repo,
			number: number
		}, function(err, result) {
			if(err) {
				reject(err);
			} else {
				resolve(result);
			}
		});
	});
}

let edit = (repo, number, data) => {
	return new Promise((resolve, reject) => {
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
		}, function(err, result) {
			if(err) {
				reject(err)
			} else {
				resolve(result);
			}
		});
	});
};

module.exports = {
	getComments: getComments,
	getCommentsSince: getCommentsSince,
	getLabels: getLabels,
	edit: edit
};
