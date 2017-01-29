'use strict';
const githubApi = require('./github-api');
const github = githubApi.service;
const auth = require('./auth');
const debug = require('debug')('reviewbot:bot');
const config = require('../../../config');
const Promise = require('promise');

var _knownUsers = [];
let _getAllUsers = (res) => {
	return new Promise((resolve, reject) => {
		_knownUsers = _knownUsers.concat(res);
		if (github.hasNextPage(res)) {
			github.getNextPage(res, (err, res) => {
				return _getAllUsers(res).then((result) => {
					return resolve(result);
				}, (err) => {
					console.error(err);
					return reject(err);
				});
			});
		} else {
			return resolve(_knownUsers);
		}
	});
};

let getAll = (filter) => {
	return new Promise(function(resolve, reject) {
		auth.authenticate();
		_knownUsers = [];
		github.orgs.getMembers({
			org: config.organization,
			filter: filter ? filter : 'all',
			per_page: 100
		}, function(err, res) {
			if (err) {
				return reject(err);
			}
			return _getAllUsers(res).then((results) => {
				return resolve(results);
			}, (err) => {
				return reject(err);
			});
		});
	});
};

module.exports = {
	getAll: getAll
};
