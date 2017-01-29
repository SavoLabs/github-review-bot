'use strict';
const githubApi = require('./github-api');
const github = githubApi.service;
const auth = require('./auth');
const debug = require('debug')('reviewbot:bot');
const config = require('../../../config');
const Promise = require('promise');

let _knownComments = [];
let _getComments = (res) => {
	return new Promise((resolve, reject) => {
		_knownComments = _knownComments.concat(res);
		if (github.hasNextPage(res)) {
			github.getNextPage(res, (err, res) => {
				if (err) {
					return reject(err);
				}
				_getComments(res).then((results) => {
					return resolve(results);
				}, (err) => {
					return reject(err);
				});
			});
		} else {
			return resolve(_knownComments);
		}
	});
};

let getComments = (repo, number) => {
	return new Promise((resolve, reject) => {
		_knownComments = [];
		auth.authenticate();

		github.issues.getComments({
			repo: repo,
			owner: config.organization,
			number: number,
			per_page: 100
		}, (err, res) => {
			if (err) {
				return reject(err);
			}
			_getComments(res).then((results) => {
				return resolve(results);
			}, (err) => {
				return reject(err);
			});
		});
	});
};

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
