'use strict';

const express = require('express');
const passport = require('passport');
const Strategy = require('passport-github').Strategy;

const path = require('path');

const logger = require('morgan');
const xhub = require('express-x-hub');
const bodyParser = require('body-parser');
const config = require('../config');

const session = require('express-session');
const app = express();

if(config.authClientID && config.authClientSecret) {
  passport.use(new Strategy({
    clientID: config.authClientID,
    clientSecret: config.authClientSecret,
    callbackURL: config.botUrlRoot + "/login/auth/return"
  }, function (accessToken, refreshToken, profile, callback) {
    callback(null,profile);
  }));
  passport.serializeUser(function(user, cb) {
    cb(null, user);
  });

  passport.deserializeUser(function(obj, cb) {
    cb(null, obj);
  });
}

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/assets/material-design-lite', express.static('node_modules/material-design-lite'));

if(config.webhookSecret) {
	app.use(xhub({ algorithm: 'sha1', secret: config.webhookSecret}));
}
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(session({
  secret: config.webhookSecret,
  resave: false,
  saveUninitialized: true,
}));
if(config.authClientID && config.authClientSecret) {
  app.use(passport.initialize());
  app.use(passport.session());
}

require('./routes')(app, passport);


// Catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// Error Handlers
if (app.get('env') === 'development') {
    app.use(function (err, req, res) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
} else {
    app.use(function (err, req, res) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: {}
        });
    });
}

module.exports = app;
