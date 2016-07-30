
var express = require('express');
var path = require('path');

var logger = require('morgan'),
    bodyParser = require('body-parser'),

    routes = require('./routes/index'),
    pullrequest = require('./routes/pullrequest'),
		comment = require('./routes/comment'),
		repos = require('./routes/repos'),

    app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/public/material-design-lite', express.static('node_modules/material-design-lite'));

app.use('/', routes);
app.use('/pullrequest', pullrequest);
app.use('/comment', comment);
app.use('/repos', repos);

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
