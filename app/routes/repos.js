'use strict';
const express = require('express');
const bot = require('../bot');
const github = require('../github');
const debug = require('debug')('reviewbot:repos');
const router = express.Router();
const loginRoute = '/login';
const Promise = require('promise');

var requireLoggedIn = function() {
	return require('connect-ensure-login').ensureLoggedIn(loginRoute);
};

// app.get('/profile',
//   require('connect-ensure-login').ensureLoggedIn(),
//   function(req, res){
//     res.render('profile', { user: req.user });
//   });

/* GET home page. */
router.get('/', requireLoggedIn(), function(req, res) {
	github.auth.isUserInOrganization(req.user).then((allowed) => {
		if (allowed) {
			github.repos.getAll(function(result) {
				res.render('repos', {
					repos: result,
					user: req.user
				});
			});
		} else {
			console.log("not Authorized");
			var err = new Error('Not Authorized.');
			err.status = 403;
			throw err;
		}
	}, (err) => {
		throw err;
	});
});

router.get('/:repo', requireLoggedIn(), (req, res) => {
	let output = [];
	github.repos.get(req.params.repo).then((result) => {
		res.render('repo-edit', {
			repo: result,
			user: req.user
		});
	}, (err) => {
		throw err;
	});
});

router.post('/enforce/:repo', requireLoggedIn(), function(req, res) {
	console.log("attempting to enforce: " + req.params.repo);
	var reviewsNeeded = parseInt(req.body.reviewsNeeded || config.reviewsNeeded, 0);
	bot.enforce(req.params.repo, reviewsNeeded, function(err, result) {
		console.log("err: " + err);
		console.log("result: " + result);
		if (!err) {
			res.redirect('/repos/');
		}
	});
});

router.get('/unenforce/:repo', requireLoggedIn(), function(req, res) {
	bot.unenforce(req.params.repo, function(err, result) {
		if (!err) {
			res.redirect('/repos/' + req.params.repo);
		} else {
			res.redirect('/error');
		}
	});
});

router.get('/setup', function(req, res) {
	github.auth.isUserInOrganization(req.user).then((allowed) => {
		if (allowed) {
			github.repos.getAll(function(result) {
				var count = 0;
				for (var i = 0; i < result.length; ++i) {
					var repo = result[i];
					console.log("enforcing: " + repo.name)
					bot.enforce(repo.name, config.reviewsNeeded, function(err, data) {
						if (err) {
							console.error(err);
						}
						count++;
						if (count >= result.length) {
							res.redirect('/repos/');
						}
					});
				}
			});
		} else {
			var err = new Error('Not Authorized.');
			err.status = 403;
			throw err;
		}
	}, (err) => {
		throw err;
	});
	// get all repos
	// make sure the bot in setup on all
});

module.exports = router;
