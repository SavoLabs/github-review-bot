var express = require('express'),
		bot = require('../bot'),
		debug = require('debug')('reviewbot:comment'),
    router = express.Router();

/* GET home page. */
router.get('/', function (req, res) {
		bot.getAllRepositories(function(result) {
	    res.render('repos', { repos: result });
		});
});

router.get('/:repo', function (req, res) {
	var output = [];
	bot.getRepository(req.params.repo, function(result) {
		if(result) {
			output[output.length] = result;
		} else {
			output = null;
		}
		res.render('repos', { repos: output });
	});
});

router.post('/enforce/:repo', function(req, res) {
		console.log("attempting to enforce: " + req.params.repo);
		var reviewsNeeded = parseInt(req.body.reviewsNeeded || config.reviewsNeeded, 0);
		bot.enforce(req.params.repo, reviewsNeeded ,function(err,result) {
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
