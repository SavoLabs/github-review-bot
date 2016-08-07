var githubApi = require('./github-api'),
	github = githubApi.service,
	auth = require('./auth'),
	debug = require('debug')('reviewbot:bot'),
	config = require('../../../config');

var _knownComments = [];
function _getComments(err, res, callback) {
		if(err){
			return false;
		}
		_knownComments = _knownComments.concat(res);
		if(github.hasNextPage(res)) {
			github.getNextPage(res, function(err,res) { _getComments(err,res,callback) });
		} else {
			if(callback) {
				callback(err,_knownComments);
			}
		}
}

function getComments(repo, number, callback ) {
	_knownComments = [];
	auth.authenticate();

	github.issues.getComments({
		repo: repo,
		user: config.organization,
		number: number,
		per_page: 100
	}, function(err, comments) {
		_getComments(err, res, callback);
	});
}

function getCommentsSince(repo, number, date, callback) {
	getComments(repo, number, function(err, comments) {
		var filtered = comments.filter(function(c) {
			var cdate = Date.parse(c.updated_at);
			return cdate >= date ;
		});

		callback(err,filtered);
	});
}

module.exports = {
	getComments: getComments,
	getCommentsSince: getCommentsSince
};
