'use strict';
const githubApi = require('./github-api');
const github = githubApi.service;
const auth = require('./auth');
const debug = require('debug')('reviewbot:bot');
const config = require('../../../config');
const Promise = require('promise');
const async = require('async');

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

let getAll = () => {
	return new Promise((resolve, reject) => {
		auth.authenticate();
		let allRepos = [];
		github.repos.getForOrg({
			org: config.organization,
			per_page: 100,
			visibility: 'all'
		}, (err, results) => {
			if(err) {
				return reject(err);
			}
			let currentResults = results;
			allRepos = allRepos.concat(results);
			async.whilst(()=> {
				// if there are more pages
				return github.hasNextPage(currentResults);
			}, (next) => {
				// each iteration
				github.getNextPage(currentResults, (err, results) => {
					if(err) {
						console.error(err);
						return next(err);
					}
					currentResults = results;
					allRepos = allRepos.concat(results);
					next(null, results);
				});
			}, (err, results) => {
				// done
				if(err) {
					reject(err);
				} else {
					resolve(allRepos);
				}
			});
		});
	});
}


module.exports = {
	getAll: getAll,
	get: get
};
