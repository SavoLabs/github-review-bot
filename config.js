
var config = {};

config.organization = 'SavoLabs';
config.username = 'savo-ci';
// include a `.env` file in the root
// loaded in /bin/www
// or have them loaded into the environment
config.authClientID = process.env.GRB_AUTH_CLIENT_ID;
config.authClientSecret = process.env.GRB_AUTH_CLIENT_SECRET;

config.accessToken = process.env.GRB_ACCESS_TOKEN;
config.webhookSecret = process.env.GRB_WEBHOOK_SECRET;

// the label that indicates the PR needs review
config.labelNeedsReview = 'needs-peer-review';
// the label that indicates that the PR has been reviewed.
config.labelPeerReviewed = 'peer-reviewed';
// the default number of reviews needed.
config.reviewsNeeded = 3;
// should the bot auto-merge the PR once reviewed?
config.mergeOnReview = false;
// pr's with this status will be monitored
config.pullRequestsStatus = 'open';
// the initial comment by the bot, set below if not defined
config.instructionsComment = '';
// labels that if the bot sees it will not monitor the PR.
config.excludeLabels = 'no-review';

config.filenameFilter = '';
// comment when the PR creator tries to approve their own PR.
config.shameComment = ":bell: Shame! :bell: Shame!\nYou cannot vote to approve your own PR. 'A' for effort though.";
// regex for "looks good"
// do not use /g it causes failures on successful matches
config.lgtmRegex = /((?:\s*LGTM(?:\s+|$))|(?:\s*looks good(?:\sto me!?)?(?:\s+|$))|(?:\s*:\+1:(?:\s+|$))|(?:\s*:shipit:(?:\s+|$)))/i;
config.needsWorkRegex = /((?:\s*:-1:(?:\s+|$))|(?:\s*needs work(?:\s+|$)))/i;
config.pullRequestEvents = ['pull_request', 'issue_comment', 'pull_request_review_comment'];

config.botUrlRoot = process.env.GRB_BOT_URL || 'http://peer-review-bot.azurewebsites.net';

// Setup Instructions Comment
if (config.instructionsComment === '') {
    var comment = 'Hi! I\'m your friendly Peer Review Bot. For this Pull Request to be labeled as "peer-reviewed", ' +
                  'you\'ll need at least {reviewsNeeded} comments containing the magic phrase "LGTM" or ":+1:". ' +
									'\n\nIf someone replies with "Needs Work" or ":-1:", that same user will need to reply again with indicating ' +
									'they approve of the changes.';

    config.instructionsComment = comment;
}


module.exports = config;
