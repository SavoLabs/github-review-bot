'use strict';
const debug = require('debug')('reviewbot:bot');
const config = require('../../config');
const Promise = require('promise');
const async = require('async');
const fs = require('fs');
const path = require('path');
const scan_path = '../';
const normalizedPath = path.join(__dirname, scan_path);
const merge = require('merge');

let config_base = merge({}, config);

let _processPath = (p) => {
	fs.readdirSync(p).forEach((file) => {
		try {
			//let configMatch = /.*?\.config\.js$/i;
			let configMatch = /(\.config\.js|\/config\/.*?\.js)$/i;
			let deepPath = p.substring(normalizedPath.length).replace(/\\/g, "/");
			let fullPath = path.join(p, file);
			if (fs.lstatSync(fullPath).isDirectory()) {
				_processPath(fullPath);
			} else {

				if (file !== 'index.js' && configMatch.test(fullPath)) {
					let name = file.substring(0, file.lastIndexOf('.'));
					let p1 = deepPath.length > 0 ? `${deepPath}/` : "";

					// console.log(`${p1}${name}`);
					try {
						console.log(`${scan_path}${p1}${name}`);
						let req_config = require(`${scan_path}${p1}${name}`);
						config_base = merge(req_config, config_base);
					} catch (e) {
						console.log(e);
					}
				}
			}
		} catch (ex) {
			console.error(ex);
		}
	});
};


_processPath(normalizedPath);
module.exports = config_base;
