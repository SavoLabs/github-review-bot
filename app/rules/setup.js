'use strict';
const githubApi = require('../github');
const github = githubApi.service;
const debug = require('debug')('reviewbot:rules/setup');
const config = require('../../config');
const Promise = require('promise');
const async = require('async');

const ModuleName = 'setup';

let beginProcessingEvent = (name, payload) => {
	return new Promise((resolve, reject) => {
		return resolve();
	});
};

let onEvent = (name, payload) => {
	return new Promise((resolve, reject) => {
		return resolve();
	});
};

let onRepositoryCreate = (name, payload) => {
	return new Promise((resolve, reject) => {
		console.log(`${ModuleName}:onRepositoryCreate:${payload.repository.name}`);
		githubApi.issues.createLabels(payload.repository.name, config[ModuleName].labels).then( () => {
			console.log(`${ModuleName}:onRepositoryCreate:issues.createLabels:${payload.repository.name}: complete`);
			return resolve();
		}, (err) => {
			return resolve();
		});
	});
};

module.exports = {
	name: ModuleName,
	enabled: true,
	onRepositoryCreate: onRepositoryCreate,
	onEvent: onEvent,
	beginProcessingEvent: beginProcessingEvent
}
