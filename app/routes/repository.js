// this is an org level hook for when a new repo is created
// allows the repo to be hooked to the bot when it is created

var express = require('express'),
    bot = require('../bot'),
    githubApi = require('../github'),
    config = require('../../config'),
    debug = require('debug')('reviewbot:pullrequest'),
    router = express.Router();

router.post('/', _processRepositoryEvent );

function _processRepositoryEvent (req, res) {
	githubApi.auth.isXHubValid(req, function(valid) {
		if(!valid) {
			console.log('XHub signature did not match expected.');
			debug('XHub signature did not match expected.');
			return _respond(res, 'XHub signature did not match expected.');
		}
		
		if(!config.enableRepositoryHook) {
			console.log('Repository hook not enabled: stopping.');
			debug('Repository hook not enabled: stopping.');
			return _respond(res, 'Repository hook not enabled: stopping.');
		}

		var eventName = req.get('X-GitHub-Event');
		// ensure we only handle events we know how to handle
		if( config.repositoryHookEvents.indexOf(eventName) < 0 ) {
			console.log('POST Request received, but this is not the event I am looking for.');
			debug('POST Request received, but this is not the event I am looking for.');
			return _respond(res, 'POST Request received, but this is not the event I am looking for.');
		}

		if(!req.body.repository) {
			console.log('POST Request received, but repository was not included in the body.');
			debug('POST Request received, but repository was not included in the body.');
			return _respond(res, 'POST Request received, but repository was not included in the body.');
		}
		var repo = req.body.repository;
		var hUrl = config.botUrlRoot + '/pullrequest/' + config.reviewsNeeded.toString();

		githubApi.webhooks.createWebHook(repo.name, hUrl, config.pullRequestEvents, function(err, result) {
			if(!err) {
				return _respond(res, 'Webhook created for repository: ' + repo.name);
			} else {
				return _respond(res, 'Error while creating webhook for repository: ' + repo.name);
			}
		});
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


module.exports = router;
