var githubApi = require('./github'),
	github = githubApi.service,
	debug = require('debug')('reviewbot:bot'),

	config = require('../config');



function enforce(repo, reviewsNeeded, callback) {
	var resultReviewsNeeded = reviewsNeeded;
	if(!resultReviewsNeeded || isNaN(resultReviewsNeeded) || resultReviewsNeeded < 1) {
		resultReviewsNeeded = config.reviewsNeeded;
	}
	var cbUrl = config.botUrlRoot + "/pullrequest/" + resultReviewsNeeded.toString()
	githubApi.webhooks.createWebHook(repo, cbUrl, callback);
}

function unenforce(repo, callback) {
	githubApi.webhooks.getWebHookId(repo, '/pullrequest', function(err, id) {
		if(!id || err) {
			// no hook found, we can just return
			callback(null, { result: 'ok'});
			return;
		}
		githubApi.webhooks.deleteWebHook(repo, id, function(err, reply) {
			callback(err,reply);
		});
	});
}

function _setStatus ( repo, pr, approved, remaining, callback ) {
	var status = approved ? "success" : "pending";
	var desc = approved ? "The number of reviews needed was successfull." : "Waiting for " + remaining + " code reviews...";
	console.log("setting status as : " + status);
	console.log(desc);
	githubApi.webhooks.createStatus(repo, status, pr.head.sha, desc, function(err, reply) {
		if(callback) {
			callback(err,reply);
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

	githubApi.auth.authenticate();

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
	githubApi.auth.authenticate();
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


/**
 * Check if a PR already has the instructions comment
 * @param {int} prNumber - Number of PR to check
 * @callback {checkForInstructionsCommentCb} callback
 */
function checkForInstructionsComment(prNumber, repo, callback) {
	githubApi.auth.authenticate();
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
	githubApi.auth.authenticate();
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
				if(who.trim() === config.username.trim()) {
					var isShameComment = (rbody.slice(0, 30).trim() === "@" + createdBy + " " + config.shameComment.slice(0, 30 - (createdBy.length + 2)).trim());
					if (isShameComment) {
						// remember if we have shamed.
						shamed = true;
					}
					continue;
				}

				if (lgtm.test(rbody)) {
					console.log("looks good match");
					if(who === createdBy) {
						console.log("shame exit")
						// you can't vote on your own PR
						needsShame = true;
						continue;
					}

					if(voteUsers.indexOf(who) >= 0 ) {
						// user already voted.
						console.log("User: " + who + " already voted. Skipping");
						continue;
					}
					// remember this person already voted.
					voteUsers[voteUsers.length] = who;
					console.log("voters");
					console.log(voteUsers);

					var whoIndex = whoWantMore.indexOf(who);
					if (whoIndex >= 0 ) {
						// this user did vote no, now they say yes.
						// so we can now remove them from the whoWantMore
						whoWantMore.splice(whoIndex,1);
					}
				} else if (ngtm.test(rbody)) {
					console.log("needs work match");
					if(who === createdBy) {
						console.log("shame exit");
						// you can't vote on your own PR
						needsShame = true;
						continue;
					}
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
		approvedCount = voteUsers.length;
		console.log("people that want improvements: " + whoWantMore.length);
		console.log("number of reviews needed for approval: " + config.reviewsNeeded);
		console.log("number of people that say it's good: " + approvedCount);

		approved = (approvedCount >= config.reviewsNeeded) && whoWantMore.length == 0;
		_setStatus(repo, pr, approved, config.reviewsNeeded - approvedCount, function(err,result) { });

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
		githubApi.auth.authenticate();
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
	githubApi.auth.authenticate();
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
