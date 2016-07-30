var GitHubApi = require('github'),
	debug = require('debug')('reviewbot:bot'),
	config = require('../config');

var github = new GitHubApi({
  debug: false,
  protocol: "https",
  host: "api.github.com", // should be api.github.com for GitHub
  followRedirects: false, // default: true; there's currently an issue with non-get redirects, so allow ability to disable follow-redirects
  timeout: 5000,
	version: '3.0.0'
});

/**
 * Private: Authenticate next request
 */
function _authenticate() {
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

function enforce(repo, reviewsNeeded, callback) {
	_authenticate();
	console.log("reviewsNeeded: " + reviewsNeeded);
	var resultReviewsNeeded = reviewsNeeded;
	if(!resultReviewsNeeded || isNaN(resultReviewsNeeded) || resultReviewsNeeded < 1) {
		resultReviewsNeeded = config.reviewsNeeded;
	}
	github.repos.createHook({
		user: config.organization,
		repo: repo,
		name: "web",
		config: {
			content_type: "application/json",
			url: config.botUrlRoot + "/pullrequest/" + resultReviewsNeeded.toString(),
			secret: config.webhookSecret
		},
		events: config.pullRequestEvents
	}, function (err, result) {
	  if(callback) {
			callback(err,result);
		}
	});
}

function unenforce(repo, callback) {

	_getHook(repo, '/pullrequest', function(err, id) {
		if(!id) {
			// no hook found, we can just return
			callback(null, { result: 'ok'});
			return;
		}
		_authenticate();
		github.repos.deleteHook({
			user: config.organization,
			repo: repo,
			id: id
		}, function(err, reply) {
			if(callback) {
				callback(err, reply);
			}
		});
	});
}

function _getHook(repo, action, callback) {
	_authenticate();
	var result;
	github.repos.getHooks({
		user: config.organization,
		repo: repo
	}, function(err,hooks) {
		if(hooks && hooks.length) {
			hooks.forEach(function(hook) {
				if(hook.name === 'web' && hook.config.url.match(config.botUrlRoot + action)) {
					result = hook.id;
				}
			});
		}
		callback(null,result);
	});
}

function _setStatus ( repo, pr, approved, remaining ) {
	_authenticate();
	var status = approved ? "success" : "pending";
	var desc = approved ? "The number of reviews needed was successfull." : "Waiting for " + remaining + " code reviews...";
	console.log("setting status as : " + status);
	github.repos.createStatus({
		user: config.organization,
		repo: repo,
		state: status,
		sha: pr.head.sha,
		context: "Peer Review Bot",
		description: desc/*,
		target_url: config.botUrlRoot + "/pr-status/" + repo + "/" + pr.id*/
	}, function(err, reply) {
		if(err) {
			console.log(err);
			console.log(reply);
		}
	});
}


/**
 * Fetch all pull requests in the currently configured repo
 * @callback {getPullRequestsCb} callback
 */
function getPullRequests(repo, callback) {
	_authenticate();

	/**
	* @callback getPullRequestsCb
	* @param {Object[]} result - Returned pull request objects
	*/
	github.pullRequests.getAll({
		user: config.organization,
		repo: repo,
		state: config.pullRequestStatus
	}, function(error, result) {
		if (error) {
			return debug('getPullRequests: Error while fetching PRs: ', error);
		}

		if (!result || !result.length || result.length < 1) {
			return debug('getPullRequests: No open PRs found');
		}

		if (callback) {
			callback(result);
		}
	});
}


/**
 * Fetch a single pull requests in the currently configured repo
 * @callback {getPullRequestsCb} callback
 */
function getPullRequest(prNumber, repo, callback) {
	_authenticate();
	/**
	 * @callback getPullRequestsCb
	 * @param {Object[]} result - Returned pull request objects
	 */
	debug('GitHub: Attempting to get PR #' + prNumber);

	github.pullRequests.get({
		user: config.organization,
		repo: repo,
		number: prNumber
	}, function(error, result) {
		if (error) {
			return debug('getPullRequests: Error while fetching PRs: ' + error);
		}

		debug('GitHub: PR successfully recieved. Changed files: ' + result.changed_files);

		if (callback) {
			callback([result]);
		}
	});
}

/**
 * Checks if the files changed in a PR are the ones we're scanning for
 * @param {int} prNumber - Number of PR
 * @callback {checkForFilesCb} callback
 */
function checkForFiles(prNumber, repo, callback) {
	/**
	 * @callback checkForFilesCb
	 * @param {boolean} matched - Does this pr contain files that match the filename filter?
	 */
	var filenameFilter = (config.filenameFilter) ? JSON.parse(config.filenameFilter) : [];

	// Bail out if filter not set, return 'true'
	if (!filenameFilter || filenameFilter.length < 1) {
		return callback(true);
	}

	_authenticate();

	github.pullRequests.getFiles({
		user: config.organization,
		repo: repo,
		number: prNumber
	}, function(error, result) {
		var match = false,
			i, ii;

		if (error) {
			return debug('commentInstructions: error while trying fetch comments: ', error);
		}

		for (i = 0; i < result.length; i = i + 1) {
			for (var ii = 0; ii < filenameFilter.length; ii = ii + 1) {
				match = (result[i].filename.indexOf(filenameFilter[ii]) > -1) ? true : match;
				if (match) {
					return callback(true);
				}
			}
		}

		return callback(match);
	});
}

function checkForLabel (prNumber, repo, pr, callback) {
	_authenticate();
	/**
	 * @callback checkForLabelCb
	 * @param {Object} result - Object describing how the issue is labeled
	 */
	if (!prNumber) {
		console.log('checkForLabel: insufficient parameters');
		return debug('checkForLabel: insufficient parameters');
	}
	console.log("repo: " + repo)
	github.issues.getIssueLabels({
		user: config.organization,
		repo: repo,
		number: prNumber
	}, function(error, result) {
		var excludeLabels = config.excludeLabels.split(' '),
			labeledNeedsReview = false,
			labeledReviewed = false,
			labeledExclude = false,
			labels = [];

		if (error) {
			console.log('checkForLabel: Error while fetching labels for single PR: ');
			console.log(error);
			return debug('checkForLabel: Error while fetching labels for single PR: ', error);
		}

		// Check if already labeled
		for (var i = 0; i < result.length; i++) {
			labeledNeedsReview = (result[i].name === config.labelNeedsReview) ? true : labeledNeedsReview;
			labeledReviewed = (result[i].name === config.labelPeerReviewed) ? true : labeledReviewed;

			if (excludeLabels && excludeLabels.length && excludeLabels.length > 0) {
				labeledExclude = (excludeLabels.indexOf(result[i].name) > -1) ? true : labeledExclude;
			}

			labels.push(result[i]);
			console.log(labels);
		}

		if (callback) {
			callback({
				labeledNeedsReview: labeledNeedsReview,
				labeledReviewed: labeledReviewed,
				labeledExclude: labeledExclude,
				labels: labels
			}, pr);
		}
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

/**
 * Check if a PR already has the instructions comment
 * @param {int} prNumber - Number of PR to check
 * @callback {checkForInstructionsCommentCb} callback
 */
function checkForInstructionsComment(prNumber, repo, callback) {
	_authenticate();
	/**
	 * @callback checkForInstructionsCommentCb
	 * @param {boolean} posted - Comment posted or not?
	 */
	github.issues.getComments({
		user: config.organization,
		repo: repo,
		number: prNumber
	}, function(error, result) {
		var instructed = false;

		if (error) {
			return debug('commentInstructions: error while trying fetch comments: ', error);
		}

		for (var i = 0; i < result.length; i++) {
			instructed = (result[i].body.slice(1, 30).trim() === config.instructionsComment.slice(1, 30).trim());
			if (instructed) {
				break;
			}
		}

		if (callback) {
			callback(instructed);
		}
	});
}


/**
 * Check a PR for 'LGTM!' comments
 * @param {int} prNumber - Number of PR to check
 * @callback {checkForApprovalComments} callback
 */
function checkForApprovalComments(prNumber, repo, pr, callback) {
	_authenticate();
	/**
	 * @callback checkForApprovalCommentsCb
	 * @param {boolean} approved - Approved or not?
	 */
	if (!prNumber) {
		console.log('checkForApprovalComments: insufficient parameters');
		return debug('checkForApprovalComments: insufficient parameters');
	}

	var createdBy = pr.user.login;
	github.issues.getComments({
		repo: repo,
		user: config.organization,
		number: prNumber,
		perPage: 99
	}, function(error, result) {
		var lgtm = config.lgtmRegex,
			approvedCount = 0,
			isInstruction, approved,
			ngtm = config.needsWorkRegex;
		if (error) {
			console.log('checkForApprovalComments: Error while fetching coments for single PR: ');
			console.log(error);
			return debug('checkForApprovalComments: Error while fetching coments for single PR: ', error);
		}
    var voteUsers = [];
		var whoWantMore = [];
		var shamed = false;
		var needsShame = false;

		for (var i = 0; i < result.length; i++) {
      var who = result[i].user.login;
			if (result[i].body) {
        var rbody = result[i].body;
				isInstruction = (rbody.slice(0, 30).trim() === config.instructionsComment.slice(0, 30).trim());

				// skip all from bot
				console.log(who + "::::" + config.username);
				if(who.trim() === config.username.trim()) {
					var isShameComment = (rbody.slice(0, 30).trim() === "@" + createdBy + " " + config.shameComment.slice(0, 30 - (createdBy.length + 2)).trim());
					if (isShameComment) {
						// remember if we have shamed.
						shamed = true;
					}
					continue;
				}
				console.log(rbody);
				if (lgtm.test(rbody)) {
					console.log(rbody);
					console.log("looks good match");
					if(who === createdBy) {
						// you can't vote on your own PR
						needsShame = true;
						continue;
					}

					if(voteUsers.indexOf(who) >= 0 ) {
						// user already voted.
						console.log("User: " + who + " already voted. Skipping");
						continue;
					}
					// isInstruction should never be true at this point. because we skip bot messages.
					approvedCount = (isInstruction) ? approvedCount : approvedCount++;
					// remember this person already voted.
					voteUsers[voteUsers.length] = who;
					var whoIndex = whoWantMore.indexOf(who);
					if (whoIndex >= 0 ) {
						// this user did vote no, now they say yes.
						// so we can now remove them from the whoWantMore
						whoWantMore.splice(whoIndex,1);
					}
				} else if (ngtm.test(rbody)) {
					console.log("needs work match");
					if(who === createdBy) {
						// you can't vote on your own PR
						needsShame = true;
						continue;
					}
					// isInstruction should never be true at this point. because we skip bot messages.
					approvedCount = (isInstruction) ? approvedCount : approvedCount--;

					var whoIndex = voteUsers.indexOf(who);
					if (whoIndex >= 0 ) {
						// this user did vote yes, now they say no.
						// so we can now remove them from the voteUsers
						voteUsers.splice(whoIndex,1);
					}

					if(whoWantMore.indexOf(who) < 0) {
						whoWantMore[whoWantMore.length] = who;
					}
				}
			}
		}

		if(!shamed && needsShame) {
			postComment(prNumber, repo, "@" + createdBy + " " + config.shameComment);
		}

		approved = (approvedCount >= config.reviewsNeeded) && whoWantMore.length == 0;
		_setStatus(repo, pr, approved, config.reviewsNeeded - approvedCount);

		if (callback) {
			console.log("approved: "+ approved);
			callback(approved);
		}
	});
}

/**
 * Label PR as approved / not approved yet
 * @param {int} prNumber - Number of PR
 * @param {boolean} approved - 'True' for 'peer-reviewed'
 * @param {sring[]} labels - Previously fetched labels
 * @callback {updateLabelsCb} callback
 */
function updateLabels(prNumber, repo, approved, labels, callback) {
	/**
	 * @callback updateLabelsCb
	 * @param {Object} result - Result returned from GitHub
	 */

	var changed = false;

	labels = (!labels || !labels.length) ? [] : labels;

	if ((approved !== true && approved !== false) || !prNumber) {
		console.log('labelPullRequest: insufficient parameters');
		return debug('labelPullRequest: insufficient parameters');
	}

	// Adjust labels for approved / not approved
	if (approved && labels.indexOf(config.labelNeedsReview) > -1) {
		labels.splice(labels.indexOf(config.labelNeedsReview), 1);
		changed = true;
	} else if (approved && labels.indexOf(config.labelPeerReviewed) === -1) {
		labels.push(config.labelPeerReviewed);
		changed = true;
	}

	if (!approved && labels.indexOf(config.labelPeerReviewed) > -1) {
		labels.removeAt(labels.indexOf(config.labelPeerReviewed));
		changed = true;
	} else if (!approved && labels.indexOf(config.labelNeedsReview) === -1) {
		labels.push(config.labelNeedsReview);
		changed = true;
	}

	if (changed) {
		_authenticate();
		github.issues.edit({
			user: config.organization,
			repo: repo,
			number: prNumber,
			labels: JSON.stringify(labels)
		}, function(error, result) {
			if (error) {
				console.log('labelPullRequest: error while trying to label PR:');
				console.log(error);
				return debug('labelPullRequest: error while trying to label PR: ', error);
			}
			if (callback) {
				callback(result);
			}
		});
	}
}

function getRepository( repo, callback ) {
	_authenticate();
	github.repos.get({
		user: config.organization,
		repo: repo
	}, function(err, res) {
		callback(res);
	});
}

function getAllRepositories ( callback ) {
	var page = 0;
	_authenticate();
	var req = github.repos.getAll({per_page: 100, visibility: 'all'}, function(err,res) {
		_getRepos(err,res, callback);
	});
}



/**
 * Post the instructions comment to a PR
 * @param {int} prNumber - Number of the PR to post to
 * @callback {postInstructionsCommentCb} callback
 */
function postInstructionsComment(prNumber, repo, callback) {
	/**
	 * @callback postInstructionsCommentCb
	 * @param {Object} result - Result returned from GitHub
	 */
	 var comment = config.instructionsComment;
	 if (comment.indexOf('{reviewsNeeded}')) {
 	    comment = comment.replace('{reviewsNeeded}', config.reviewsNeeded);
 	}

	postComment(prNumber, repo, comment, callback);
}

/**
 * Post a comment to an issue
 * @param {int} number - Number of the PR/issue to post to
 * @param {string} comment - Comment to post
 * @callback {postCommentCb} callback
 */
function postComment(number, repo, comment, callback) {
	/**
	 * @callback postCommentCb
	 * @param {Object} result - Result returned from GitHub
	 */
	_authenticate();
	github.issues.createComment({
		user: config.organization,
		repo: repo,
		number: number,
		body: comment
	}, function(error, result) {
		if (error) {
			console.log('postComment: Error while trying to post instructions:');
			console.log(error);
			return debug('postComment: Error while trying to post instructions:', error);
		}
		if (callback) {
			callback(result);
		}
	});
}

module.exports = {
	getPullRequest: getPullRequest,
	getPullRequests: getPullRequests,
	getRepository: getRepository,
	getAllRepositories: getAllRepositories,
	checkForLabel: checkForLabel,
	checkForApprovalComments: checkForApprovalComments,
	checkForInstructionsComment: checkForInstructionsComment,
	checkForFiles: checkForFiles,
	updateLabels: updateLabels,
	postInstructionsComment: postInstructionsComment,
	postComment: postComment,
	enforce: enforce,
	unenforce: unenforce
};
