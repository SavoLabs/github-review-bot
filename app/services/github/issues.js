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
		owner: config.github.organization,
		number: number,
		per_page: 100
	}, function(err, res) {
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

function getLabels(repo, number, callback) {
	auth.authenticate();
	github.issues.getIssueLabels({
		owner: config.github.organization,
		repo: repo,
		number: number
	}, function(err,result) {
		if(callback){
			callback(err,result);
		}
	});
}

function edit(repo, number, data, callback) {
	auth.authenticate();
	github.issues.edit({
		owner: config.github.organization,
		repo: repo,
		number: number,
		labels: data.labels ? data.labels : undefined,
		title: data.title ? data.title : undefined,
		body: data.body ? data.body : undefined,
		assignee: data.assignee ? data.assignee : undefined,
		assignees: data.assignees ? data.assignees : undefined,
	}, function(error, result) {
		if (callback) {
			callback(error, result);
		}
	});
}

module.exports = {
	getComments: getComments,
	getCommentsSince: getCommentsSince,
	getLabels: getLabels,
	edit: edit
};
