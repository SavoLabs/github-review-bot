/**
 * This will set create labels, and set defaults on the repo when created.
*/
var githubApi = require('../github'),
	github = githubApi.service,
	debug = require('debug')('review:bot'),

	config = require('../../config')

config.repo_defaults = {
	has_issues: false,
	has_wiki: true,
	has_downloads: true,
	// this cant be used on an empty repo :(
	//default_branch: 'develop',

	labels: [
		{name: 'needs-peer-review', color: 'd93f0b'},
		{name: 'needs-work', color: 'ee0701'},
		{name: 'peer-reviewed', color: '0e8a16'}
	]
};

function onRepositoryCreate(repo) {
	githubApi.repos.edit(repo.name || repo, config.repo_defaults );
	githubApi.issues.createLabels(repo.name || repo, config.repo_defaults.labels);
}

module.exports = {
	name: "repo-defaults",
	enabled: true,
	onRepositoryCreate: onRepositoryCreate
};
