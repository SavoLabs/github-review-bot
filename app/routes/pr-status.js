var express = require('express'),
		bot = require('../bot'),
		debug = require('debug')('reviewbot:comment'),
    router = express.Router();

/* GET home page. */
router.get('/:repo/:id', function (req, res) {
		// bot.getAllRepositories(function(result) {
		// 	console.log("type: " + typeof(result));
	  //   res.render('repos', { repos: result });
		// });
});


module.exports = router;
