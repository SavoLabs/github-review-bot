'use strict';

let config = {
	"webhooks/pullrequest": {
		route: ['/pullrequest'],
		events: {
			"issue_comment": ['created', 'editied', 'deleted'],
			"pull_request_review_comment": ['created', 'editied', 'deleted'],
			"pull_request_review":['submitted'],
			"pull_request": ['opened', 'edited', 'closed', 'reopened', 'labeled', 'unlabeled', 'synchronize', 'delete']
			//"status": ['pending', 'success', 'failure', 'error'],
		},
		states: ['open']
	}
};

module.exports = config;
