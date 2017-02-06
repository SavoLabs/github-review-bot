'use strict';

const xconfig = require('../../../config');
const merge = require('merge');

let config = {
	"webhooks/repository": {
		route: ['/repository', '/webhooks/repository'],
		events: {
			"repository": ['created']
		},
		enabled: true
	}
};

let oconfig = merge(xconfig, config);
module.exports = oconfig;
