const express = require('express');
const landingController = require('../controllers/landingController');

const router = express.Router();

router.get('/public', landingController.getPublicPage);
router.post('/visit', landingController.trackVisit);

module.exports = router;
