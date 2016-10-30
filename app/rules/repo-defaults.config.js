var config = require('../../config')

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

module.exports = config;
