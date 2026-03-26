const express = require('express');
const adminDashboardController = require('../../controllers/admin/adminDashboardController');

const router = express.Router();

router.get('/', adminDashboardController.overview);

module.exports = router;
