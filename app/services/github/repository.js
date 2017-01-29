'use strict';
const githubApi = require('./github-api');
const github = githubApi.service;
const auth = require('./auth');
const debug = require('debug')('reviewbot:bot');
const config = require('../../../config');
const Promise = require('promise');

let get = (repo) => {
	return new Promise((resolve, reject) => {
		auth.authenticate();
		github.repos.get({
			owner: config.organization,
			repo: repo
		}, (err, res) => {
			if (err) {
				console.error(err);
				return reject(err);
			}
			return resolve(res);
		});
	});
};


let _knownRepos = [];

let _getRepos = (res) => {
	return new Promise((resolve, reject) => {
		_knownRepos = _knownRepos.concat(res);
		if (github.hasNextPage(res)) {
			github.getNextPage(res, (err, res) => {
				if (err) {
					console.error(err);
					return reject(err);
				}
				return _getRepos(res).then((result) => {
					return resolve(result);
				}, (err) => {
					return reject(err);
				});
			});
		} else {
			return resolve(_knownRepos);
		}
	});
};

function getAll() {
	return new Promise(function(resolve, reject) {
		_knownRepos = [];
		auth.authenticate();
		var req = github.repos.getForOrg({
			org: config.organization,
			per_page: 100,
			visibility: 'all'
		}, function(err, res) {
			if (err) {
				console.error(err);
				return reject(err);
			}
			return _getRepos(res).then((result) => {
				return resolve(result);
			}, (err) => {
				return reject(err);
			});
		});
	});
}


module.exports = {
	getAll: getAll,
	get: get
};
