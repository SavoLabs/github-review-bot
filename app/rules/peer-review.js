'use strict';
const githubApi = require('../github');
const github = githubApi.service;
const debug = require('debug')('reviewbot:rules/peer-review');
const config = require('../../config');
const Promise = require('promise');
const async = require('async');

const ModuleName = 'peer-review';

let beginProcessingEvent = (name, payload) => {
	return new Promise((resolve, reject) => {
		console.log(`${ModuleName}:beginProcessingEvent`);
		return resolve();
	});
};

let onEvent = (name, payload) => {
	return new Promise((resolve, reject) => {
		console.log(`${ModuleName}:onEvent`);
		return resolve();
	});
};

let onRepositoryCreate = (name, payload) => {
	return new Promise((resolve, reject) => {
		// this doesn't do anything when the repo is created
		return resolve();
	});
};

module.exports = {
	name: ModuleName,
	enabled: true,
	onRepositoryCreate: onRepositoryCreate,
	onEvent: onEvent,
	beginProcessingEvent: beginProcessingEvent
}
