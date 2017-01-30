'use strict';
const express = require('express');
const bot = require('../bot');
const passport = require('passport');
const debug = require('debug')('reviewbot:login');
const config = require('../../config');
const router = express.Router();
const Promise = require('promise');
/* GET home page. */
router.get('/', passport.authenticate('github'));
router.get('/auth/return',
	passport.authenticate('github', { failureRedirect: '/login' }), (req, res) => {
    res.redirect('/');
  }
);

module.exports = router;
