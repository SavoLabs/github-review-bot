'use strict';

let config = {
	"peer-review": {
		events: ['pull_request', 'issue_comment', 'pull_request_review_comment', 'pull_request_review'],
		// regex for "looks good"
		// do not use /g it causes failures on successful matches
		lgtmRegex: /(:\+1:|(?:\blgtm\b|\blooks good(?:\sto me!?)?\b)|:shipit:|👍)/i,
		// regex for "needs work"
		// do not use /g it causes failures on successful matches
		needsWorkRegex: /(\bneeds (?:some )?work\b|:-1:|👎)/i,
		filenameFilter: '',
		// comment when the PR creator tries to approve their own PR.
		shameComment: ":bell: Shame! :bell: Shame!\nYou cannot vote to approve your own PR. 'A' for effort though.",
		instructionsComment: 'Hi! I\'m your friendly Peer Review Bot. For this Pull Request to be labeled as "peer-reviewed", ' +
                  'you\'ll need at least {reviewsNeeded} comments containing the magic phrase "LGTM" or ":+1:". ' +
									'\n\nIf someone replies with "Needs Work" or ":-1:", that same user will need to reply again with indicating ' +
									'they approve of the changes.'
	}
};

module.exports = config;
