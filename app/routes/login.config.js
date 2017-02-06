'use strict';

const xconfig = require('../../config');
const merge = require('merge');

let config = {
	login: {
		route: '/login',
		enabled: () => {
			return xconfig.authClientID != null && xconfig.authClientSecret != null;
		}
	}
};

module.exports = merge(xconfig, config);
