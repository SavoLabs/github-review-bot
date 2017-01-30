'use strict';
const express = require('express');
const router = express.Router();
const Promise = require('promise');

/* GET home page. */
router.get('/', (req, res) => {
    res.render('index');
});

module.exports = router;
