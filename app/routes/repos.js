var express = require('express'),
		bot = require('../bot'),
		debug = require('debug')('reviewbot:comment'),
    router = express.Router();

/* GET home page. */
router.get('/', function (req, res) {
		bot.getAllRepositories(function(result) {
			console.log("type: " + typeof(result));
	    res.render('repos', { repos: result });
		});
});

router.get('/repos/:repo', function (req, res) {
		bot.getAllRepositories(function(result) {
			console.log("type: " + typeof(result));
	    res.render('repos', { repos: result });
		});
});

router.get('/enforce/:repo', function(req, res) {
		console.log("attempting to enforce: " + req.params.repo);
		bot.enforce(req.params.repo,function(err,result) {
			console.log("err: " + err);
			console.log("result: " + result);
			if(!err){
				res.redirect('/repos/');
			}
		});
});

router.get('/unenforce/:repo',function(req, res) {
		bot.unenforce(req.params.repo,function(err,result) {
			if(!err){
				res.redirect('/repos/' + req.params.repo);
			} else {
				res.redirect('/error');
			}
		});
});

/**
**/
router.get('/:id', function (req, res) {

});

module.exports = router;
