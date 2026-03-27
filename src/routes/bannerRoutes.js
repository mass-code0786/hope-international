const express = require('express');
const bannerController = require('../controllers/bannerController');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth(false), bannerController.list);

module.exports = router;
