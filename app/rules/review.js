var moduleName = "Review",
	githubApi = require('../github'),
	github = githubApi.service,
	debug = require('debug')('review:bot'),
	config = require('../../config');

function beginProcessing (prNumber, repo, pr, action, callback) {
}

function processEvent(labelResult, pr, action, prNumber, repo, callback) {
}

function updateLabels(prNumber, repo, state, labels, callback) {
}

function onRepositoryCreate(repo, callback) {
}

module.exports = {
	name: moduleName,
	enabled: true,
	onRepositoryCreate: onRepositoryCreate
};
