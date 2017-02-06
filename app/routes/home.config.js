'use strict';

const xconfig = require('../../config');
const merge = require('merge');

let config = {
	"home": {
		route: ['/']
	}
};

let oconfig = merge(xconfig, config);
module.exports = oconfig;
