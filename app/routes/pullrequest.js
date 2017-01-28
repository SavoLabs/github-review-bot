'use strict';
var express = require('express'),
    bot = require('../bot'),
    githubApi = require('../github'),
    config = require('../../config'),
    debug = require('debug')('reviewbot:pullrequest'),
    router = express.Router();


  /**
   * POST /pullrequest: Process incoming GitHub payload
   */
   router.post('/:reviewsNeeded', _handlePREvent);
   router.post('/', _handlePREvent);


  function _handlePREvent (req, res) {
		githubApi.auth.isXHubValid(req, function(valid) {
			if(!valid) {
				console.log('XHub signature did not match expected.');
				debug('XHub signature did not match expected.');
				return _respond(res, 'XHub signature did not match expected.');
			}


	    var eventName = req.get('X-GitHub-Event');
	    if(req.params.reviewsNeeded) {
	      console.log('reviewsNeeded passed as param: ' + req.params.reviewsNeeded);
	    } else {
	      console.log('No reviewsNeeded passed, using default from config: ' + config.reviewsNeeded);
	    }
	    // see if the reviewsNeeded was passed as param to the callback
	    if(req.params.reviewsNeeded && !isNaN(parseInt(req.params.reviewsNeeded,0)) && parseInt(req.params.reviewsNeeded, 0) > 0 ) {
	      config.reviewsNeeded = parseInt(req.params.reviewsNeeded, 0);
	    }

	    // ensure we only handle events we know how to handle
	    if( config.pullRequestEvents.indexOf(eventName) < 0 ) {
	      console.log(`POST Request received, but ${eventName} is not the event I am looking for.`);
	      debug(`POST Request received, but ${eventName} is not the event I am looking for.`);
	      return _respond(res, `POST Request received, but ${eventName} is not the event I am looking for.`);
	    }

	    if (!req.body) {
	      console.log('POST Request received, but no body!');
	      debug('POST Request received, but no body!');
	      return _respond(res, 'POST Request received, but no body!');
	    }

			// assigned causes the bot to spam the instructions comment.
			if(req.body.action && req.body.action === 'assigned') {
				console.log('POST Request received, but "' + req.body.action + '" is not an action I am looking for.');
	      debug('POST Request received, but "' + req.body.action + '" is not an action I am looking for.');
	      return _respond(res, 'POST Request received, but "' + req.body.action + '" is not an action I am looking for.');
			}

	    // the same spam happens if the PR is labeled before it is hooked
	    if(req.body.action && req.body.action === 'labeled' && req.body.pull_request && req.body.pull_request.user.login === req.body.sender.login ) {
	      // make sure the label change is not one of the bot labels.
	      if( req.body.label && ( req.body.label.name !== config.labelNeedsReview && req.body.label.name !== config.labelPeerReviewed ) ) {
	        console.log('POST Request received, but "' + req.body.action + '" is not an action I am looking for.');
	        debug('POST Request received, but "' + req.body.action + '" is not an action I am looking for.');
	        return _respond(res, 'POST Request received, but "' + req.body.action + '" is not an action I am looking for.');
	      }
	    }


	    if (!req.body.repository) {
	      console.log('POST Request received, but no repo found.');
	      debug('POST Request received, but no repo found.');
	      return _respond(res, 'POST Request received, but no repo found.');
	    }

			var repo = req.body.repository.name;
	    // Check if it's a simple PR action
	    if (req.body.pull_request && req.body.pull_request.number) {

	      if ( req.body.pull_request.state && config.pullRequestsStatus.indexOf(req.body.pull_request.state) < 0 ) {
	        console.log('POST Request received, but the PR is in a state that I do not care about (' + req.body.pull_request.state + ').');
	        debug('POST Request received, but the PR is in a state that I do not care about (' + req.body.pull_request.state + ').');
	        return _respond(res, 'POST Request received, but the PR is in a state that I do not care about (' + req.body.pull_request.state + ').');
	    	}

	      bot.checkForLabel(req.body.pull_request.number, repo, req.body.pull_request, req.body.action, processPullRequest);
	      return _respond(res, 'Processing PR ' + req.body.pull_request.number);
	    }

	    // Check if it's an issue action (comment, for instance)
	    if (req.body.issue && req.body.issue.pull_request) {
	        githubApi.pullrequests.get(req.body.issue.number, repo, function (pullRequests) {
	            if (!pullRequests || pullRequests.length < 0) {
	              console.log('Error: Tried to process single pull request, but failed');
	              debug('Error: Tried to process single pull request, but failed');
	              return _respond(res, 'Error: Tried to process single pull request, but failed');
	            }
	            var pr0 = pullRequests[0];
	            if ( pr0.state && config.pullRequestsStatus.indexOf(pr0.state) < 0 ) {
	              console.log('POST Request received, but the PR is in a state that I do not care about (' + pr0.state + ').');
	              debug('POST Request received, but the PR is in a state that I do not care about (' + pr0.state + ').');
	              return _respond(res, 'POST Request received, but the PR is in a state that I do not care about (' + pr0.state + ').');
	            }
	            bot.checkForLabel(pr0.number, repo, pr0, req.body.action, processPullRequest);
	        });
	        return _respond(res, 'Processing PR as Issue' + req.body.issue.number);
	    }
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
            return res.json({messages: JSON.stringify(message)});
        } else {
            res.json({message: message});
        }
    }
}

/**
 * Process Pull Request
 * @param {string[]} labelResult - Result as generated by bot.checkForLabels;
 * @param {Object} pr - PR currently handled
 */
function processPullRequest(labelResult, pr, action) {
    // Check if we're supposed to skip this one
    if (labelResult.labeledExclude) {
        return debug('PR ' + pr.number + ' labeled to be exlcuded from the bot, stopping');
    }
    console.log('processPullRequest');
    // Check for filenameFilter
     bot.checkForFiles(pr.number, pr.head.repo.name, function (isFilenameMatched) {
        if (!isFilenameMatched) {
            console.log('PR ' + pr.number + ' does not match filenameFilter, stopping')
            return debug('PR ' + pr.number + ' does not match filenameFilter, stopping');
        }
        console.log('checkForApprovalComments:::')
        // Let's get all our comments and check them for approval
        bot.checkForApprovalComments(pr.number, pr.head.repo.name, pr, function (approved, needsWork) {
            var labels, output = [];

            // Check for instructions comment and post if not present
            bot.postInstructionsComment(pr.number, pr.head.repo.name);
            labels = labelResult.labels.map(function (label) {
                return label.name;
            });

            // Update the labels
            output.push('Updating labels for PR ' + pr.number);
            bot.updateLabels(pr.number, pr.head.repo.name, approved, needsWork, labels);

            // If we're supposed to merge, merge
            if (approved && config.mergeOnReview) {
                output.push('Merging on review set to true, PR approved, merging');
                bot.merge(pr.number);
            }
        });
    });
}

module.exports = router;
