'use strict';
let config = {
	"setup": {
		labels: [
			{name: process.env.GRB_NEEDS_REVIEW_LABEL || 'needs-peer-review', color: '1565c0'},
			{name: process.env.GRB_NEEDS_WORK_LABEL || 'needs-work', color: 'c62828'},
			{name: process.env.GRB_PEER_REVIEWED_LABEL || 'peer-reviewed', color: '2e7d32'},
			// when the PR is closed and not merged (future work)
			{name: process.env.GRB_ABONDONED_LABEL || 'abondoned', color: 'ef6c00'},
			{name: process.env.GRB_NO_REVIEW_NEEDED || 'no-review-needed', color: '90a4ae'}
		],
		reviewsNeeded: 3

	}
};

module.exports = config;
