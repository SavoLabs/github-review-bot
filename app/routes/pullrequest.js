'use strict';
const express = require('express');
const bot = require('../bot');
const githubApi = require('../github');
const config = require('../../config');
const debug = require('debug')('reviewbot:pullrequest');
const router = express.Router();
const Promise = require('promise');

let _handlePREvent = (req, res) => {
	githubApi.auth.isXHubValid(req).then((valid) => {

		// not sure why i have to parse this all of a suddon
		let payload = req.body.payload ? JSON.parse(req.body.payload) : req.body;

		if (!valid) {
			console.log('XHub signature did not match expected.');
			debug('XHub signature did not match expected.');
			return _respond(res, 'XHub signature did not match expected.');
		}


		var eventName = req.get('X-GitHub-Event');
		if (req.params.reviewsNeeded) {
			console.log('reviewsNeeded passed as param: ' + req.params.reviewsNeeded);
		} else {
			console.log('No reviewsNeeded passed, using default from config: ' + config.reviewsNeeded);
		}
		// see if the reviewsNeeded was passed as param to the callback
		if (req.params.reviewsNeeded && !isNaN(parseInt(req.params.reviewsNeeded, 0)) && parseInt(req.params.reviewsNeeded, 0) > 0) {
			config.reviewsNeeded = parseInt(req.params.reviewsNeeded, 0);
		}

		// ensure we only handle events we know how to handle
		if (config.pullRequestEvents.indexOf(eventName) < 0) {
			console.log(`POST Request received, but ${eventName} is not the event I am looking for.`);
			debug(`POST Request received, but ${eventName} is not the event I am looking for.`);
			return _respond(res, `POST Request received, but ${eventName} is not the event I am looking for.`);
		}

		if (!payload) {
			console.log('POST Request received, but no body!');
			debug('POST Request received, but no body!');
			return _respond(res, 'POST Request received, but no body!');
		}

		// assigned causes the bot to spam the instructions comment.
		if (payload.action && payload.action === 'assigned') {
			console.log('POST Request received, but "' + payload.action + '" is not an action I am looking for.');
			debug('POST Request received, but "' + payload.action + '" is not an action I am looking for.');
			return _respond(res, 'POST Request received, but "' + payload.action + '" is not an action I am looking for.');
		}

		// the same spam happens if the PR is labeled before it is hooked
		if (payload.action && payload.action === 'labeled' && payload.pull_request && payload.pull_request.user.login === payload.sender.login) {
			// make sure the label change is not one of the bot labels.
			if (payload.label && (payload.label.name !== config.labelNeedsReview && payload.label.name !== config.labelPeerReviewed)) {
				console.log('POST Request received, but "' + payload.action + '" is not an action I am looking for.');
				debug('POST Request received, but "' + payload.action + '" is not an action I am looking for.');
				return _respond(res, 'POST Request received, but "' + payload.action + '" is not an action I am looking for.');
			}
		}
		if (!payload.repository) {
			console.log('POST Request received, but no repo found.');
			debug('POST Request received, but no repo found.');
			return _respond(res, 'POST Request received, but no repo found.');
		}

		var repo = payload.repository.name;
		// Check if it's a simple PR action
		if (payload.pull_request && payload.pull_request.number) {

			if (payload.pull_request.state && config.pullRequestsStatus.indexOf(payload.pull_request.state) < 0) {
				console.log('POST Request received, but the PR is in a state that I do not care about (' + payload.pull_request.state + ').');
				debug('POST Request received, but the PR is in a state that I do not care about (' + payload.pull_request.state + ').');
				return _respond(res, 'POST Request received, but the PR is in a state that I do not care about (' + payload.pull_request.state + ').');
			}

			bot.checkForLabel(payload.pull_request.number, repo, payload.pull_request, payload.action).then((result) => {
				processPullRequest(result.labelData, result.pr, result.action).then(() => {

				}, (err) => {
					console.error(err);
					debug("Error: ", err);
					return _respond(res, err);
				});
			}, (err) => {
				console.error(err);
				debug("Error: ", err);
				return _respond(res, err);
			});
			return _respond(res, 'Processing PR ' + payload.pull_request.number);
		}

		// Check if it's an issue action (comment, for instance)
		if (payload.issue && payload.issue.pull_request) {
			githubApi.pullrequests.get(payload.issue.number, repo).then((pullRequests) => {
				if (!pullRequests || pullRequests.length < 0) {
					console.log('Error: Tried to process single pull request, but failed');
					debug('Error: Tried to process single pull request, but failed');
					return _respond(res, 'Error: Tried to process single pull request, but failed');
				}
				var pr0 = pullRequests[0];
				if (pr0.state && config.pullRequestsStatus.indexOf(pr0.state) < 0) {
					console.log('POST Request received, but the PR is in a state that I do not care about (' + pr0.state + ').');
					debug('POST Request received, but the PR is in a state that I do not care about (' + pr0.state + ').');
					return _respond(res, 'POST Request received, but the PR is in a state that I do not care about (' + pr0.state + ').');
				}
				bot.checkForLabel(pr0.number, repo, pr0, payload.action).then((result) => {
					processPullRequest(result.labelData, result.pr, result.action).then(() => {

					}, (err) => {
						console.error(err);
						debug("Error: ", err);
						return _respond(res, err);
					});
				}, (err) => {
					console.error(err);
					debug("Error: ", err);
					return _respond(res, err);
				});
			}, (err) => {
				console.error(err);
				debug("Error: ", err);
				return _resond(res, err);
			});
			return _respond(res, 'Processing PR as Issue' + payload.issue.number);
		}
	}, (err) => {
		throw err;
	});
}

/**
 * Respond using a given Express res object
 * @param {Object} res - Express res object
 * @param {string|string[]} message - Either a message or an array filled with messages
 */
function _respond(res, message) {
	if (res && message) {
		if (message.isArray) {
			return res.json({
				messages: JSON.stringify(message)
			});
		} else {
			res.json({
				message: message
			});
		}
	}
}

/**
 * Process Pull Request
 * @param {string[]} labelResult - Result as generated by bot.checkForLabels;
 * @param {Object} pr - PR currently handled
 */
let processPullRequest = (labelResult, pr, action) => {

	return new Promise((resolve, reject) => {
		// Check if we're supposed to skip this one
		if (labelResult.labeledExclude) {
			debug('PR ' + pr.number + ' labeled to be exlcuded from the bot, stopping');
			return resolve();
		}

		console.log('processPullRequest');
		// Check for filenameFilter
		bot.checkForFiles(pr.number, pr.head.repo.name).then((isFilenameMatched) => {

			if (!isFilenameMatched) {
				console.log('PR ' + pr.number + ' does not match filenameFilter, stopping')
				return debug('PR ' + pr.number + ' does not match filenameFilter, stopping');
			}

			console.log("before: checkForApprovalComments")
			// Let's get all our comments and check them for approval
			bot.checkForApprovalComments(pr.number, pr.head.repo.name, pr).then((approvalObject) => {
				console.log("after: checkForApprovalComments");
				let approved = approvalObject.approved;
				let needsWork = approvalObject.needsWork;
				let labels;
				//let output = [];

				// Check for instructions comment and post if not present
				bot.postInstructionsComment(pr.number, pr.head.repo.name).then((result) => {
					labels = labelResult.labels.map((label) => {
						return label.name;
					});

					// Update the labels
					// output.push('Updating labels for PR ' + pr.number);
					bot.updateLabels(pr.number, pr.head.repo.name, approved, needsWork, labels).then((result) => {
						// TODO: merge not currently supported:
						// If we're supposed to merge, merge
						// if (approved && config.mergeOnReview) {
						// 	// output.push('Merging on review set to true, PR approved, merging');
						// 	bot.merge(pr.number);
						// }
						return resolve();
					}, (err) => {
						console.error('processPullRequest: Error while updating labels:');
						console.error(err);
						debug('processPullRequest: Error while updating labels:', err);
						return reject(err);
					});
				}, (err) => {
					console.error('processPullRequest: Error while posting instructions comment:');
					console.error(err);
					debug('processPullRequest: Error while instructions comment:', err);
					return reject(err);
				});
			}, (err) => {
				console.error('processPullRequest: Error while checking for approval comments:');
				console.error(err);
				debug('processPullRequest: Error while checking for approval comments:', err);
				return reject(err);
			});
		}, (err) => {
			console.error('checkForFiles: Error while processing files:');
			console.error(err);
			debug('checkForFiles: Error while processing files:', err);
			return reject(err);
		});
	});
};


/**
 * POST /pullrequest: Process incoming GitHub payload
 */
router.post('/:reviewsNeeded', _handlePREvent);
router.post('/', _handlePREvent);

module.exports = router;
