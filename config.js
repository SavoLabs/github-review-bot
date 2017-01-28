var merge = require('merge');
var config = merge(require('./app/rules/config'));

// include a `.env` file in the root
// loaded in /bin/www
// or have them loaded into the environment

config.github = {
	// the github organization
	organization: process.env.GRB_ORGANIZATION || 'savolabs',
	// the username for the bot
	username: process.env.GRB_BOT_USERNAME || 'savo-ci',
	// the github user access token
	token: process.env.GRB_ACCESS_TOKEN,
	// the webhook secret used to generate the x-hub sha
	webhookSecret: process.env.GRB_WEBHOOK_SECRET,
	// oAuth client id
	authClientID: process.env.GRB_AUTH_CLIENT_ID,
	// oAuth client secret
	authClientSecret: process.env.GRB_AUTH_CLIENT_SECRET
};

// the label that indicates the PR needs review
config.labelNeedsReview = 'needs-peer-review';
// the label that indicates that the PR has been reviewed.
config.labelPeerReviewed = 'peer-reviewed';
// the label that indicates that someone wants more work before approving
config.labelNeedsWork = 'needs-work';
// the default number of reviews needed.
config.reviewsNeeded = 3;
// should the bot auto-merge the PR once reviewed?
config.mergeOnReview = false;
// pr's with this status will be monitored
config.pullRequestsStatus = ['open'];
// the initial comment by the bot, set below if not defined
config.instructionsComment = '';
// labels that if the bot sees it will not monitor the PR.
config.excludeLabels = ['no-review'];

// reactions are disabled because they do not issue an event one one is added/removed.
config.enableReactions = false;
// the reactions that will identify as "looks good"
config.lgtmReactions = ["+1", "heart", "hooray"];
// the reactions that will identify as "needs work"
config.needsWorkReactions = ["-1", "confused"];

config.enableRepositoryHook = true;
config.repositoryHookEvents = ['repository'];
config.repositoryHookActions = ['created'];

config.filenameFilter = '';
// comment when the PR creator tries to approve their own PR.
config.shameComment = ":bell: Shame! :bell: Shame!\nYou cannot vote to approve your own PR. 'A' for effort though.";
// regex for "looks good"
// do not use /g it causes failures on successful matches
// config.lgtmRegex = /((?:\s*LGTM(?:\s+|$))|(?:\s*looks good(?:\sto me!?)?(?:\s+|$))|(?:\s*:\+1:(?:\s+|$))|(?:\s*:shipit:(?:\s+|$))|(?:\s*👍(?:\s+|$)))/i;
config.lgtmRegex = /(:\+1:|(?:\blgtm\b|\blooks good(?:\sto me!?)?\b)|:shipit:|👍)/i;
// regex for "needs work"
// do not use /g it causes failures on successful matches
// config.needsWorkRegex = /((?:\s*:-1:(?:\s+|$))|(?:\s*needs work(?:\s+|$))|(?:\s*👎(?:\s+|$)))/i;
config.needsWorkRegex = /(\bneeds (?:some )?work\b|:-1:|👎)/i;
// the events to hook to when attaching the bot to the repository
config.pullRequestEvents = ['pull_request', 'issue_comment', 'pull_request_review_comment', 'pull_request_review'];

// the base url for the bot
config.botUrlRoot = process.env.GRB_BOT_URL;

if (!config.botUrlRoot) {
	throw new Error("Configuration: Missing configuration value for 'botUrlRoot'");
}

if (!config.github.organization) {
	throw new Error("Configuration: Missing configuration value for 'github.organization'");
}

if (!config.github.username) {
	throw new Error("Configuration: Missing configuration value for 'github.username'");
}

if (!config.github.token) {
	throw new Error("Configuration: Missing configuration value for 'github.token'");
}

if (!config.github.webhookSecret) {
	throw new Error("Configuration: Missing configuration value for 'github.webhookSecret'");
}

// Setup Instructions Comment
if (config.instructionsComment === '') {
	var comment = 'Hi! I\'m your friendly Peer Review Bot. For this Pull Request to be labeled as "peer-reviewed", ' +
		'you\'ll need at least {reviewsNeeded} comments containing the magic phrase "LGTM" or ":+1:". ' +
		'\n\nIf someone replies with "Needs Work" or ":-1:", that same user will need to reply again with indicating ' +
		'they approve of the changes.';

	config.instructionsComment = comment;
}


module.exports = config;
