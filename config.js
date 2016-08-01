
var config = {};

config.organization = 'SavoLabs';
config.username = 'savo-ci';
// include a `.env` file in the root
// loaded in /bin/www
config.authClientID = process.env.GRB_AUTH_CLIENT_ID;
config.authClientSecret = process.env.GRB_AUTH_CLIENT_SECRET;

config.accessToken = process.env.GRB_ACCESS_TOKEN;
config.webhookSecret = process.env.GRB_WEBHOOK_SECRET;
config.labelNeedsReview = 'needs-peer-review';
config.labelPeerReviewed = 'peer-reviewed';
config.reviewsNeeded = 3;
config.mergeOnReview = false;
config.pullRequestsStatus = 'open';
config.instructionsComment = '';
config.excludeLabels = 'no-review';
config.filenameFilter = '';
config.shameComment = ":bell: Shame! :bell: Shame!\nYou cannot vote to approve your own PR. 'A' for effort though.";
config.lgtmRegex = /(\s*LGTM(?:\s+|$))|(Looks good to me!?(?:\s+|$))|(\s*:\+1:(?:\s+|$))/i;
config.needsWorkRegex = /(\s*:-1:(?:\s+|$))|(\s*needs work(?:\s+|$))/i;
config.pullRequestEvents = ['pull_request', 'issue_comment', 'pull_request_review_comment'];

config.botUrlRoot = process.env.GRB_BOT_URL || 'http://peer-review-bot.azurewebsites.net';

// Setup Instructions Comment
if (config.instructionsComment === '') {
    var comment = 'Hi! I\'m your friendly/stabby Peer Review Bot. For this Pull Request to be labeled as "peer-reviewed", ' +
                  'you\'ll need at least {reviewsNeeded} comments containing the magic phrase "LGTM" or ":+1:". ' +
									'\n\nIf someone replies with "Needs Work" or ":-1:", that same user will need to reply again with indicating ' +
									'they approve of the changes.';

    config.instructionsComment = comment;
}


module.exports = config;
