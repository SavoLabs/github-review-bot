var express = require('express'),
		bot = require('../bot'),
		passport = require('passport'),
		debug = require('debug')('reviewbot:comment'),
		config = require('../../config'),
		router = express.Router();

/* GET home page. */
router.get('/', passport.authenticate('github'));
router.get('/auth/return',
	passport.authenticate('github', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  }
);

module.exports = router;
