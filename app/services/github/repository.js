var githubApi = require('./github-api'),
	github = githubApi.service,
	auth = require('./auth'),
	debug = require('debug')('reviewbot:bot'),
	config = require('../../../config');

function get( repo, callback ) {
	auth.authenticate();
	github.repos.get({
		owner: config.github.organization,
		repo: repo
	}, function(err, res) {
		callback(res);
	});
}


var _knownRepos = [];
function _getRepos ( err, res, callback) {
		if(err){
			return false;
		}
		_knownRepos = _knownRepos.concat(res);
		if(github.hasNextPage(res)) {
			github.getNextPage(res, function(err,res) { _getRepos(err,res,callback) });
		} else {
			if(callback) {
				callback(_knownRepos);
			}
		}
}

function getAll ( callback ) {
	_knownRepos = [];
	auth.authenticate();

	var req = github.repos.getForOrg({
		org: config.github.organization,
		per_page: 100,
		visibility: 'all'
	}, function(err,res) {
		_getRepos(err,res, callback);
	});
}


module.exports = {
	getAll: getAll,
	get: get
};
