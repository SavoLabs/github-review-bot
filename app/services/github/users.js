'use strict';
const githubApi = require('./github-api');
const github = githubApi.service;
const auth = require('./auth');
const debug = require('debug')('reviewbot:bot');
const config = require('../../../config');
const Promise = require('promise');
const async = require('async');

let getAll = (filter) => {
	return new Promise((resolve, reject) => {
		auth.authenticate();
		let allUsers = [];
		github.orgs.getMembers({
			org: config.organization,
			filter: filter? filter : 'all',
			per_page: 100
		}, (err, results) => {
			if(err) {
				return reject(err);
			}
			let currentResults = results;
			allUsers = allUsers.concat(results);
			async.whilst(() => {
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
					allUsers = allUsers.concat(allUsers);
					next(null, results);
				});
			}, (err, results) => {
				if (err) {
					reject(err);
				} else {
					resolve(allUsers);
				}
			});
		});
	});
}

module.exports = {
	getAll: getAll
};
