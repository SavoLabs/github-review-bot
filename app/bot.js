'use strict';
const githubApi = require('./github');
const github = githubApi.service;
const debug = require('debug')('reviewbot:bot');
const config = require('../config');
const Promise = require('promise');
const async = require('async');

let enforce = (repo, reviewsNeeded) => {
	return new Promise(function(resolve, reject) {
		var resultReviewsNeeded = reviewsNeeded;
		if (!resultReviewsNeeded || isNaN(resultReviewsNeeded) || resultReviewsNeeded < 1) {
			resultReviewsNeeded = config.reviewsNeeded;
		}
		var cbUrl = config.botUrlRoot + "/pullrequest/" + resultReviewsNeeded.toString()
		githubApi.webhooks.createWebHook(repo, cbUrl, config.pullRequestEvents).then((result) => {
			resolve(result);
		}, (err) => {
			reject(err);
		});
	});

};

let unenforce = (repo) => {
	return new Promise(function(resolve, reject) {
		githubApi.webhooks.getWebHookId(repo, '/pullrequest').then((id) => {
			if (!id) {
				// no hook found, we can just return
				return resolve({
					result: 'ok'
				});
			}
			githubApi.webhooks.deleteWebHook(repo, id).then((reply) => {
				// return the response
				resolve(reply);
			}, (err) => {
				reject(err);
			});
		}, (err) => {
			// getWebHookId should never err.
			reject(err);
		});
	});
}

let _setStatus = (repo, pr, state, remaining) => {
	return new Promise((resolve, reject) => {
		let reviewsPluralized = remaining == 1 ? "review" : "reviews";
		let status;
		let desc;
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
		githubApi.webhooks.createStatus(repo, status, pr.head.sha, desc).then((reply) => {
			resolve(reply);
		}, (err) => {
			console.error(err);
			reject(err);
		});
	});

}

/**
 * Checks if the files changed in a PR are the ones we're scanning for
 * @param {int} prNumber - Number of PR
 * @param {string} repo - The repository name
 */
let checkForFiles = (prNumber, repo) => {
	return new Promise((resolve, reject) => {
		let filenameFilter = (config.filenameFilter) ? JSON.parse(config.filenameFilter) : [];
		// Bail out if filter not set, return 'true'
		if (!filenameFilter || filenameFilter.length < 1) {
			return resolve(true);
		}

		githubApi.pullrequests.getFiles(repo, prNumber).then((files) => {
			let match = false;
			async.filter(files, (item, next) => {
				async.each(filenameFilter, (filter, nextFilter) => {
					match = (item.filename.indexOf(filter) > -1) ? true : match
					nextFilter();
				}, (err) => { // done
					if(err) {
						console.error(err);
						debug('checkForFiles: error while trying fetch files: ', err);
						return reject(err);
					}
					next(null, match);
				});
			}, (err, results) => { // done
				if(err) {
					console.error(err);
					debug('checkForFiles: error while trying fetch files: ', err);
					return reject(err);
				}
				resolve(results.length > 0);
			});
		}, (err) => {
			console.error(err);
			debug('checkForFiles: error while trying fetch files: ', err);
			return reject(err);
		});
	});
};

let checkForLabel = (prNumber, repo, pr, action) => {
	return new Promise((resolve, reject) => {
		if (!prNumber || !repo || !pr) {
			console.log('bot.checkForLabel: insufficient parameters');
			debug('bot.checkForLabel: insufficient parameters');
			return reject('bot.checkForLabel: insufficient parameters');
		}

		githubApi.issues.getLabels(repo, prNumber).then((labels) => {
			try {
				let excludeLabels = config.excludeLabels;
				let labeledNeedsReview = false;
				let labeledReviewed = false;
				let labeledExclude = false;
				let labeledNeedsWork = false;
				let outLabels = [];

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
						outLabels.push(labels[i]);
					}
				}

				return resolve({
					labelData: {
						labeledNeedsReview: labeledNeedsReview,
						labeledReviewed: labeledReviewed,
						labeledExclude: labeledExclude,
						labeledNeedsWork: labeledNeedsWork,
						labels: outLabels
					},
					pr: pr,
					action: action
				});
			} catch (err) {
				return reject(err);
			}
		}, (err) => {
			debug('bot.checkForLabel: Error while fetching labels for single PR: ', err);
			return reject(err)
		});
	});
};

let _checkForInstructionsComment = (prNumber, repo) => {
	return new Promise((resolve, reject) => {
		githubApi.issues.getComments(repo, prNumber).then((comments) => {
			async.filter(comments, (comment, next) => {
				let matched = comment.body.slice(1, 30).trim() === config.instructionsComment.slice(1, 30).trim();
				next(null, matched);
			}, (err, filtered) => { // done
				if(err) {
					return reject(err);
				}
				resolve(filtered.length > 0);
			});
		}, (err) => {
			debug('commentInstructions: error while trying fetch comments: ', err);
			return reject(err);
		});
	});
};

/**
 * Check a PR for 'LGTM!' comments
 * @param {int} prNumber - Number of PR to check
 * @param {string} repo - The repository name
 * @param {object} pr - The Pull Request object
 */
let checkForApprovalComments = (prNumber, repo, pr) => {
	return new Promise((resolve, reject) => {
		if (!prNumber || !repo || !pr) {
			console.error('checkForApprovalComments: insufficient parameters');
			debug('checkForApprovalComments: insufficient parameters');
			return reject('checkForApprovalComments: insufficient parameters');
		}

		let createdBy = pr.user.login;

		// we get the commits for the PR, so we can get the date of the most recent commit.
		// any votes before this date, will be ignored.
		githubApi.pullrequests.getMostRecentCommit(repo, prNumber).then((lastCommit) => {
			if (!lastCommit) {
				console.error('checkForApprovalComments->getMostRecentCommit: Unable to get the most recent commit.');
				debug('checkForApprovalComments->getMostRecentCommit: Unable to get the most recent commit.');
				return reject('checkForApprovalComments->getMostRecentCommit: Unable to get the most recent commit.');
			}

			let date = Date.parse(lastCommit.commit.author.date);

			githubApi.issues.getCommentsSince(repo, prNumber, date).then((comments) => {
				let lgtm = config.lgtmRegex;
				let approvedCount = 0;
				let approved;
				let needsWork;
				let ngtm = config.needsWorkRegex;
				let voteUsers = [];
				let whoWantMore = [];
				let shamed = false;
				let needsShame = false;
				async.each(comments, (comment, next) => {
					let who = comment.user.login;
					if(comment.body) {
						let rbody = comment.body.trim();
						// skip all from bot
						if (who.trim() === config.username.trim()) {
							var isShameComment = (rbody.slice(0, 30).trim() === "@" + createdBy + " " + config.shameComment.slice(0, 30 - (createdBy.length + 2)).trim());
							if (isShameComment) {
								// remember if we have shamed.
								shamed = true;
							}
							// exit because this is a shame comment
							return next();
						}

						// test if it looks good
						if (lgtm.test(rbody)) {
							if (who === createdBy) {
								// you can't vote on your own PR
								needsShame = true;
								// exit because this is 'you';
								return next();
							}

							if (voteUsers.indexOf(who) >= 0) {
								// user already voted.
								return next();
							}
							// remember this person already voted.
							voteUsers.push(who);

							var whoIndex = whoWantMore.indexOf(who);
							if (whoIndex >= 0) {
								// this user did vote no, now they say yes.
								// so we can now remove them from the whoWantMore
								whoWantMore.splice(whoIndex, 1);
							}
						} else if (ngtm.test(rbody)) {
							if (who === createdBy) {
								// you can't vote on your own PR
								needsShame = true;
								// exit because this is 'you';
								return next();
							}
							let whoIndex = voteUsers.indexOf(who);
							if (whoIndex >= 0) {
								// this user did vote yes, now they say no.
								// so we can now remove them from the voteUsers
								voteUsers.splice(whoIndex, 1);
							}

							if (whoWantMore.indexOf(who) < 0) {
								whoWantMore.push(who);
							}
						}
						// next item now
						next();
					}
				}, (err) => { //done
					if(err) {
						return reject(err);
					}

					if (!shamed && needsShame) {
						githubApi.comments.postComment(prNumber, repo, "@" + createdBy + " " + config.shameComment).then((result) => {
							// post the shame comment.
						}, (err) => {
							console.error(err);
						});
					}


					// process the reactions on the PR
					// currently, reactions do not trigger a webhook event
					// so it does not trigger a processing of the PR
					githubApi.reactions.getForPullRequest(repo, prNumber).then((reactions) => {
						// TODO: filter these by the date too
						// TODO: async each
						for (let i = 0; i < reactions.length; ++i) {
							let reaction = reactions[i];
							let who = reaction.user.login;
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
								voteUsers.push(who);
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
									whoWantMore.push(who);
								}
							}
						}
						githubApi.pullrequests.getAllReviews(repo, prNumber).then((reviews) => {
							// TODO: async each
							for (var i = 0; i < reviews.length; i++) {
								let review = reviews[i];
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
										voteUsers.push(who);
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
											whoWantMore.push(who);
										}
										break;
								}
							}

							// after we check reactions
							approvedCount = voteUsers.length;
							console.log("people that want improvements: " + whoWantMore.length);
							console.log("number of reviews needed for approval: " + config.reviewsNeeded);
							console.log("number of people that say it's good: " + approvedCount);

							approved = (approvedCount >= config.reviewsNeeded) && whoWantMore.length == 0;
							needsWork = whoWantMore.length > 0;
							// if there are people that want more work done, mark as failure
							// otherwise, it is pending or success, depending on the number of reviews.
							let statusState = whoWantMore.length == 0 ?
								approved ? githubApi.webhooks.statusStates.success : githubApi.webhooks.statusStates.pending :
								githubApi.webhooks.statusStates.failure;


							_setStatus(repo, pr, statusState, config.reviewsNeeded - approvedCount).then((result) => {
								console.log(`successfully set states to PR #${prNumber} in ${repo.name || repo} to ${statusState}`);
							}, (err) => {
								console.log("Error while setting the status: ");
								console.log(err);
							});

							console.log("approved: " + approved);
							console.log("needsWork: " + needsWork);
							resolve({ approved: approved, needsWork: needsWork});
						}, (err) => {
							console.log('checkForApprovalComments: Error while fetching reviews for single PR: ');
							console.log(err);
							debug('checkForApprovalComments: Error while fetching reviews for single PR: ', err);
							return reject(err);
						});
					}, (err) => {
						console.log('checkForApprovalComments: Error while fetching reactions for single PR: ');
						console.log(err);
						debug('checkForApprovalComments: Error while fetching reactions for single PR: ', err);
						return reject(err);
					});
				}, (err) => {
					console.log('checkForApprovalComments: Error while fetching coments for single PR: ');
					console.log(err);
					debug('checkForApprovalComments: Error while fetching coments for single PR: ', err);
					return reject(err);
				});
			}, (err) => {
				console.log('checkForApprovalComments: Error while fetching coments for single PR: ');
				console.log(err);
				debug('checkForApprovalComments: Error while fetching coments for single PR: ', err);
				return reject(err);
			});
		}, (err) => {
			console.log('checkForApprovalComments: Error while fetching most recent comment: ');
			console.log(err);
			debug('checkForApprovalComments: Error while fetching most recent comment: ', err);
			return reject(err);
		});
	});
};

/**
 * Label PR as approved / not approved yet
 * @param {int} prNumber - Number of PR
 * @param {boolean} approved - 'True' for 'peer-reviewed'
 * @param {sring[]} labels - Previously fetched labels
 */
let updateLabels =(prNumber, repo, approved, needsWork, labels) => {
	return new Promise((resolve, reject) => {
		let changed = false;

		labels = (!labels || !labels.length) ? [] : labels;

		if ((approved !== true && approved !== false) || !prNumber || (needsWork !== true && needsWork !== false) || !repo) {
			console.log('updateLabels: insufficient parameters');
			debug('updateLabels: insufficient parameters');
			return reject('updateLabels: insufficient parameters');
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
			}).then((result) => {
				return resolve(result);
			}, (err) => {
				if (err) {
					console.log('updateLabels: error while trying to label PR:');
					console.log(err);
					debug('updateLabels: error while trying to label PR: ', err);
					return reject(err);
				}
			});
		} else {
			// nothing changed, just need to resolve
			resolve(null);
		}
	});
};

/**
 * Post the instructions comment to a PR
 * @param {int} prNumber - Number of the PR to post to
 * @param {repository} repo - The repo the PR exists in
 */
let postInstructionsComment = (prNumber, repo) => {
	return new Promise((resolve, reject) => {
		// Check for instructions comment and post if not present
		_checkForInstructionsComment(prNumber, repo).then((posted) => {
			if (!posted) {
				console.log('No intructions comment found on PR ' + prNumber + '; posting instructions comment');
				debug('No intructions comment found on PR ' + prNumber + '; posting instructions comment');
				var comment = config.instructionsComment;
				if (comment.indexOf('{reviewsNeeded}')) {
					comment = comment.replace('{reviewsNeeded}', config.reviewsNeeded);
				}

				githubApi.comments.postComment(prNumber, repo, comment).then((result) => {
					resolve(result);
				}, (err) => {
					reject(err);
				});
			} else {
				// no need to post, just resolve
				resolve(null);
			}
		}, (err) => {
			reject(err);
		});
	});
};


module.exports = {
	checkForLabel: checkForLabel,
	checkForApprovalComments: checkForApprovalComments,
	checkForFiles: checkForFiles,
	updateLabels: updateLabels,
	postInstructionsComment: postInstructionsComment,
	enforce: enforce,
	unenforce: unenforce
};
