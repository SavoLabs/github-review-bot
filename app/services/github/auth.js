'use strict';
const githubApi = require('./github-api');
const github = githubApi.service;
const debug = require('debug')('reviewbot:bot');
const config = require('../../../config');
const Promise = require('promise');

	/**
	 * Private: Authenticate next request
	 */
	function authenticate() {
		if (!config.accessToken) {
			throw Error('Fatal: No access token configured!');
		}

		github.authenticate({
			type: "basic",
	    username: config.username,
	    password: config.accessToken
			// type: 'oauth',
			// token: config.oauth2token
		});
	}

	let isUserInOrganization = (user) => {
		return new Promise(function(resolve, reject) {
			authenticate();
			github.orgs.getOrgMembership({
				org: config.organization,
				username: user.username
			}, function(err, result) {
				if(err){
					resolve(false);
				} else {
					resolve(true);
				}
			});
		});
	}

	let isXHubValid = (req) => {
		return new Promise(function(resolve, reject) {
			if(!req.isXHub || config.webhookSecret == '' || config.webhookSecret == null) {
				resolve(true);
			}
			console.log("xhub validated: " + req.isXHubValid());
			resolve(req.isXHubValid());
		});
	}

	module.exports = {
		authenticate: authenticate,
		isUserInOrganization: isUserInOrganization,
		isXHubValid: isXHubValid
	};
