
var config = {};

// include a `.env` file in the root
// loaded in /bin/www
// or have them loaded into the environment

// the github organization
config.organization = process.env.GRB_ORGANIZATION;
// oAuth client id
config.authClientID = process.env.GRB_AUTH_CLIENT_ID;
// oAuth client secret
config.authClientSecret = process.env.GRB_AUTH_CLIENT_SECRET;

// the username for the bot
config.username = process.env.GRB_BOT_USERNAME;
// the github user access token
config.accessToken = process.env.GRB_ACCESS_TOKEN;
// the webhook secret used to generate the x-hub sha
config.webhookSecret = process.env.GRB_WEBHOOK_SECRET;

// the base url for the bot
config.botUrlRoot = process.env.GRB_BOT_URL;


// the label that indicates the PR needs review
config.labelNeedsReview = process.env.GRB_NEEDS_REVIEW_LABEL || 'needs-peer-review';
// the label that indicates that the PR has been reviewed.
config.labelPeerReviewed = process.env.GRB_PEER_REVIEWED_LABEL || 'peer-reviewed';
// the label that indicates that someone wants more work before approving
config.labelNeedsWork = process.env.GRB_NEEDS_WORK_LABEL || 'needs-work';
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
config.lgtmRegex = /((?:\s*LGTM(?:\s+|$))|(?:\s*looks good(?:\sto me!?)?(?:\s+|$))|(?:\s*:\+1:(?:\s+|$))|(?:\s*:shipit:(?:\s+|$))|(?:\s*👍(?:\s+|$)))/i;
// regex for "needs work"
// do not use /g it causes failures on successful matches
config.needsWorkRegex = /((?:\s*:-1:(?:\s+|$))|(?:\s*needs work(?:\s+|$))|(?:\s*👎(?:\s+|$)))/i;
// the events to hook to when attaching the bot to the repository
config.pullRequestEvents = ['pull_request', 'issue_comment', 'pull_request_review_comment'];


if ( config.botUrlRoot == null ) {
	throw new Error("Configuration: Missing configuration value for botUrlRoot");
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
