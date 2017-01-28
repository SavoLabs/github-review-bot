var githubApi = require('./github'),
	github = githubApi.service,
	debug = require('debug')('reviewbot:bot'),

	config = require('../config');



function enforce(repo, reviewsNeeded, callback) {
	var resultReviewsNeeded = reviewsNeeded;
	if (!resultReviewsNeeded || isNaN(resultReviewsNeeded) || resultReviewsNeeded < 1) {
		resultReviewsNeeded = config.reviewsNeeded;
	}
	var cbUrl = config.botUrlRoot + "/pullrequest/" + resultReviewsNeeded.toString()
	githubApi.webhooks.createWebHook(repo, cbUrl, config.pullRequestEvents, callback);
}

function unenforce(repo, callback) {
	githubApi.webhooks.getWebHookId(repo, '/pullrequest', function(err, id) {
		if (!id || err) {
			// no hook found, we can just return
			callback(null, {
				result: 'ok'
			});
			return;
		}
		githubApi.webhooks.deleteWebHook(repo, id, function(err, reply) {
			callback(err, reply);
		});
	});
}

function _setStatus(repo, pr, state, remaining, callback) {
	var reviewsPluralized = remaining == 1 ? "review" : "reviews";
	var status, desc;
	switch (state) {
		case githubApi.webhooks.statusStates.success:
			status = "success";
			desc = "The number of reviews needed was successfull.";
			break;
		case githubApi.webhooks.statusStates.failure:
			status = "failure";
			desc = "More work needs to be done on this pull request";
			break;
		default:
			status = "pending";
			desc = "Waiting for " + remaining + " code " + reviewsPluralized + "...";
	}
	githubApi.webhooks.createStatus(repo, status, pr.head.sha, desc, function(err, reply) {
		if (callback) {
			callback(err, reply);
		}
	});
}

/**
 * Checks if the files changed in a PR are the ones we're scanning for
 * @param {int} prNumber - Number of PR
 * @param {string} repo - The repository name
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

	githubApi.pullrequests.getFiles(repo, prNumber, function(err, files) {
		var match = false,
			i, ii;
		if (err) {
			return debug('commentInstructions: error while trying fetch comments: ', err);
		}

		for (i = 0; i < files.length; i = i + 1) {
			for (var ii = 0; ii < filenameFilter.length; ii = ii + 1) {
				match = (result[i].filename.indexOf(filenameFilter[ii]) > -1) ? true : match;
				if (match) {
					return callback(true);
				}
			}
		}
	});
}

function checkForLabel(prNumber, repo, pr, action, callback) {
	/**
	 * @callback checkForLabelCb
	 * @param {Object} result - Object describing how the issue is labeled
	 */
	if (!prNumber || !repo || !pr) {
		console.log('checkForLabel: insufficient parameters');
		return debug('checkForLabel: insufficient parameters');
	}
	githubApi.issues.getLabels(repo, prNumber, function(error, labels) {
		var excludeLabels = config.excludeLabels,
			labeledNeedsReview = false,
			labeledReviewed = false,
			labeledExclude = false,
			labeledNeedsWork = false,
			outLabels = [];

		if (error) {
			console.log('checkForLabel: Error while fetching labels for single PR: ');
			console.log(error);
			return debug('checkForLabel: Error while fetching labels for single PR: ', error);
		}

		// Check if already labeled
		for (var i = 0; i < labels.length; i++) {
			labeledNeedsReview = (labels[i].name === config.labelNeedsReview) ? true : labeledNeedsReview;
			labeledReviewed = (labels[i].name === config.labelPeerReviewed) ? true : labeledReviewed;
			labeledNeedsWork = (labels[i].name === config.labelNeedsWork) ? true : labeledNeedsWork;

			if (excludeLabels && excludeLabels.length && excludeLabels.length > 0) {
				labeledExclude = (excludeLabels.indexOf(labels[i].name) > -1) ? true : labeledExclude;
			}

			// we need to remove the peer-reviewed label because there was a new push
			if (action === 'synchronize' && labels[i].name === config.labelPeerReviewed) {
				console.log("new push. needs review again.");
				labeledReviewed = false;
			} else {
				console.log("action: " + action);
				console.log("label: " + labels[i].name);
				outLabels.push(labels[i]);
			}
		}

		if (callback) {
			callback({
				labeledNeedsReview: labeledNeedsReview,
				labeledReviewed: labeledReviewed,
				labeledExclude: labeledExclude,
				labeledNeedsWork: labeledNeedsWork,
				labels: outLabels
			}, pr, action);
		}
	});
}


/**
 * Check if a PR already has the instructions comment
 * @param {int} prNumber - Number of PR to check
 * @param {string} repo - The repository name
 * @callback {checkForInstructionsCommentCb} callback
 */
function _checkForInstructionsComment(prNumber, repo, callback) {
	githubApi.issues.getComments(repo, prNumber, function(err, comments) {
		var instructed = false;
		if (err) {
			return debug('commentInstructions: error while trying fetch comments: ', err);
		}
		for (var i = 0; i < comments.length; i++) {
			instructed = (comments[i].body.slice(1, 30).trim() === config.instructionsComment.slice(1, 30).trim());
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
 * @param {string} repo - The repository name
 * @param {object} pr - The Pull Request object
 * @callback {checkForApprovalComments} callback
 */
function checkForApprovalComments(prNumber, repo, pr, callback) {
	console.log("checkForApprovalComments: start");
	if (!prNumber || !repo || !pr) {
		console.log('checkForApprovalComments: insufficient parameters');
		return debug('checkForApprovalComments: insufficient parameters');
	}

	var createdBy = pr.user.login;

	// we get the commits for the PR, so we can get the date of the most recent commit.
	// any votes before this date, will be ignored.
	githubApi.pullrequests.getMostRecentCommit(repo, prNumber, function(err, lastCommit) {
		console.log("getMostRecentCommit: start");
		if (err || !lastCommit) {
			console.log('Unable to get the most recent commit.');
			return debug('Unable to get the most recent commit.');
		}
		var date = Date.parse(lastCommit.commit.author.date);

		githubApi.issues.getCommentsSince(repo, prNumber, date, function(err, comments) {
			console.log("getCommentsSince: start");
			var lgtm = config.lgtmRegex,
				approvedCount = 0,
				approved,
				needsWork, ngtm = config.needsWorkRegex;
			if (err) {
				console.log('checkForApprovalComments: Error while fetching coments for single PR: ');
				console.log(err);
				return debug('checkForApprovalComments: Error while fetching coments for single PR: ', err);
			}

			var voteUsers = [],
				whoWantMore = [],
				shamed = false,
				needsShame = false;
			for (var i = 0; i < comments.length; ++i) {
				var comment = comments[i];
				console.log("processing index: " + i);
				var who = comment.user.login;
				if (comment.body) {
					console.log("processing comment: " + comment.id + " : " + comment.user.login + " : " + comment.body);
					var rbody = comment.body.trim();
					// skip all from bot
					if (who.trim() === config.github.username.trim()) {
						var isShameComment = (rbody.slice(0, 30).trim() === "@" + createdBy + " " + config.shameComment.slice(0, 30 - (createdBy.length + 2)).trim());
						if (isShameComment) {
							// remember if we have shamed.
							shamed = true;
						}
						continue;
					}
					// test if it looks good
					if (lgtm.test(rbody)) {
						console.log("looks good match");
						if (who === createdBy) {
							// you can't vote on your own PR
							needsShame = true;
							console.log("lgtm shame: continue");
							continue;
						}

						if (voteUsers.indexOf(who) >= 0) {
							// user already voted.
							console.log("User: " + who + " already voted. Skipping");
							console.log("voted: continue");
							continue;
						}
						// remember this person already voted.
						voteUsers[voteUsers.length] = who;

						var whoIndex = whoWantMore.indexOf(who);
						if (whoIndex >= 0) {
							// this user did vote no, now they say yes.
							// so we can now remove them from the whoWantMore
							whoWantMore.splice(whoIndex, 1);
						}
					} else if (ngtm.test(rbody)) {
						console.log("needs work match");
						if (who === createdBy) {
							console.log("shame exit");
							// you can't vote on your own PR
							needsShame = true;
							continue;
						}
						var whoIndex = voteUsers.indexOf(who);
						if (whoIndex >= 0) {
							// this user did vote yes, now they say no.
							// so we can now remove them from the voteUsers
							voteUsers.splice(whoIndex, 1);
						}

						if (whoWantMore.indexOf(who) < 0) {
							whoWantMore[whoWantMore.length] = who;
						}
					}
				}
			}
			if (!shamed && needsShame) {
				githubApi.comments.postComment(prNumber, repo, "@" + createdBy + " " + config.shameComment);
			}

			// process the reactions on the PR
			// currently, reactions do not trigger a webhook event
			// so it does not trigger a processing of the PR
			githubApi.reactions.getForPullRequest(repo, prNumber, function(xerr, res) {
				console.log("getForPullRequest: start");
				// TODO: filter these by the date too
				for (var i = 0; i < res.length; ++i) {
					var reaction = res[i];
					var who = reaction.user.login;
					if (who === createdBy) {
						continue;
					}
					if (config.lgtmReactions.indexOf(reaction.content) >= 0) {
						// looks good
						if (voteUsers.indexOf(who) >= 0) {
							// already voted
							continue;
						}
						// remember this person already voted.
						voteUsers[voteUsers.length] = who;
						var whoIndex = whoWantMore.indexOf(who);
						if (whoIndex >= 0) {
							// this user did vote no, now they say yes.
							// so we can now remove them from the whoWantMore
							whoWantMore.splice(whoIndex, 1);
						}
					} else if (config.needsWorkReactions.indexOf(reaction.content) >= 0) {
						// needs work
						var whoIndex = voteUsers.indexOf(who);
						if (whoIndex >= 0) {
							voteUsers.splice(whoIndex, 1);
						}

						if (whoWantMore.indexOf(who) < 0) {
							whoWantMore[whoWantMore.length] = who;
						}
					}
				}

				console.log("getAllReviews: before");
				githubApi.pullrequests.getAllReviews(repo, prNumber, (err, result) => {
					console.log("getAllReviews: start");
					if (err) {
						console.log("error");
						console.error(err);
						return;
					}
					for (var i = 0; i < result.length; i++) {

						let review = result[i];
						console.log(`Processing Review: ${review.id}`);
						let who = review.user.login;
						if (who === createdBy) {
							continue;
						}
						let whoIndex = -1;

						switch (review.state) {
							case githubApi.pullrequests.reviewStates.approved:
								if (voteUsers.indexOf(who) >= 0) {
									// already voted
									continue;
								}
								voteUsers[voteUsers.length] = who;
								whoIndex = whoWantMore.indexOf(who);
								if (whoIndex >= 0) {
									// this user did vote no, now they say yes.
									// so we can now remove them from the whoWantMore
									whoWantMore.splice(whoIndex, 1);
								}
								break;
							case githubApi.pullrequests.reviewStates.pending:
								// do nothing because no one has done anything
								break;
							default:
								// rejected (what is the text of this state?)
								console.log(`review state: ${review.state}`);
								// needs work
								whoIndex = voteUsers.indexOf(who);
								if (whoIndex >= 0) {
									voteUsers.splice(whoIndex, 1);
								}

								if (whoWantMore.indexOf(who) < 0) {
									whoWantMore[whoWantMore.length] = who;
								}
								break;
						}
					}

					console.log("getAllReviews: after");

					// after we check reactions
					approvedCount = voteUsers.length;
					console.log("people that want improvements: " + whoWantMore.length);
					console.log("number of reviews needed for approval: " + config.reviewsNeeded);
					console.log("number of people that say it's good: " + approvedCount);

					approved = (approvedCount >= config.reviewsNeeded) && whoWantMore.length == 0;
					needsWork = whoWantMore.length > 0;
					// if there are people that want more work done, mark as failure
					// otherwise, it is pending or success, depending on the number of reviews.
					var statusState = whoWantMore.length == 0 ?
						approved ? githubApi.webhooks.statusStates.success : githubApi.webhooks.statusStates.pending :
						githubApi.webhooks.statusStates.failure;

					_setStatus(repo, pr, statusState, config.reviewsNeeded - approvedCount, function(err, result) {});

					if (callback) {
						console.log("approved: " + approved);
						console.log("needsWork: " + needsWork);
						callback(approved, needsWork);
					}

				});
			});
		});
	});
}

/**
 * Label PR as approved / not approved yet
 * @param {int} prNumber - Number of PR
 * @param {boolean} approved - 'True' for 'peer-reviewed'
 * @param {sring[]} labels - Previously fetched labels
 * @callback {updateLabelsCb} callback
 */
function updateLabels(prNumber, repo, approved, needsWork, labels, callback) {
	/**
	 * @callback updateLabelsCb
	 * @param {Object} result - Result returned from GitHub
	 */

	var changed = false;

	labels = (!labels || !labels.length) ? [] : labels;

	if ((approved !== true && approved !== false) || !prNumber || (needsWork !== true && needsWork !== false) || !repo) {
		console.log('labelPullRequest: insufficient parameters');
		return debug('labelPullRequest: insufficient parameters');
	}


	// Adjust labels for approved / not approved
	if (approved && !needsWork && labels.indexOf(config.labelNeedsReview) > -1) {
		labels.splice(labels.indexOf(config.labelNeedsReview), 1);
		changed = true;
	} else if (approved && !needsWork && labels.indexOf(config.labelPeerReviewed) === -1) {
		labels.push(config.labelPeerReviewed);
		changed = true;
	}

	// need to remove this one separate because it can exist with the needs-review label
	if (!needsWork && labels.indexOf(config.labelNeedsWork) > -1) {
		// has the needs-work label
		labels.splice(labels.indexOf(config.labelNeedsWork), 1);
		changed = true;
	}


	if (!approved && labels.indexOf(config.labelPeerReviewed) > -1) {
		labels.splice(labels.indexOf(config.labelPeerReviewed), 1);
		changed = true;
	} else if (!approved && labels.indexOf(config.labelNeedsReview) === -1) {
		labels.push(config.labelNeedsReview);
		changed = true;
	}

	if (needsWork && labels.indexOf(config.labelNeedsWork) == -1) {
		// needs work, but doesn't already have the label
		labels.push(config.labelNeedsWork);
		changed = true;
	}

	if (changed) {
		githubApi.issues.edit(repo, prNumber, {
			labels: labels
		}, function(err, result) {
			if (err) {
				console.log('labelPullRequest: error while trying to label PR:');
				console.log(err);
				debug('labelPullRequest: error while trying to label PR: ', err);
				if (callback) {
					callback(null);
				}
				return;
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
	// Check for instructions comment and post if not present
	_checkForInstructionsComment(prNumber, repo, function(posted) {
		if (!posted) {
			console.log('No intructions comment found on PR ' + prNumber + '; posting instructions comment');
			debug('No intructions comment found on PR ' + prNumber + '; posting instructions comment');
			/**
			 * @callback postInstructionsCommentCb
			 * @param {Object} result - Result returned from GitHub
			 */
			var comment = config.instructionsComment;
			if (comment.indexOf('{reviewsNeeded}')) {
				comment = comment.replace('{reviewsNeeded}', config.reviewsNeeded);
			}

			githubApi.comments.postComment(prNumber, repo, comment, callback);
		}
	});

}


module.exports = {
	checkForLabel: checkForLabel,
	checkForApprovalComments: checkForApprovalComments,
	checkForFiles: checkForFiles,
	updateLabels: updateLabels,
	postInstructionsComment: postInstructionsComment,
	enforce: enforce,
	unenforce: unenforce
};
