
var express = require('express');
var passport = require('passport');
var Strategy = require('passport-github').Strategy;

var path = require('path');

var logger = require('morgan'),
    bodyParser = require('body-parser'),
    config = require('../config'),
    routes = require('./routes/index'),
    pullrequest = require('./routes/pullrequest'),
		comment = require('./routes/comment'),
    repos = require('./routes/repos'),
    audit = require('./routes/audit'),
    login = require('./routes/login'),
		managed = require('./routes/managed'),
		unmanaged = require('./routes/unmanaged'),
    session = require('express-session'),
    app = express();

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
//app.use(express.cookieParser());
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
app.use('/', routes);
app.use('/pullrequest', pullrequest);
app.use('/comment', comment);
app.use('/managed', managed);
app.use('/unmanaged', unmanaged);
app.use('/repos', repos);
app.use('/audit', audit);

if(config.authClientID && config.authClientSecret) {
  app.use('/login', login);
}

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
