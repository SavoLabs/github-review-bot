var githubApi = require('./github-api'),
	github = githubApi.service,
	auth = require('./auth'),
	debug = require('debug')('reviewbot:bot'),
	config = require('../../../config');

var _knownUsers = [];
function _getAllUsers ( err, res, callback ) {
	if(err){
		return false;
	}
	_knownUsers = _knownUsers.concat(res);
	if(github.hasNextPage(res)) {
		github.getNextPage(res, function(err,res) { _getAllUsers(err,res,callback) });
	} else {
		if(callback) {
			callback(err,_knownUsers);
		}
	}
}

function getAll(filter, callback) {
	auth.authenticate();
	_knownUsers = [];

	github.orgs.getMembers({
		org: config.github.organization,
		filter: filter ? filter : 'all',
		per_page: 100
	}, function(err,res) {
		_getAllUsers(err,res, callback);
	});
}

module.exports = {
	getAll: getAll
};
