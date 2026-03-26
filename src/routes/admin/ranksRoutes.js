const express = require('express');
const adminUsersController = require('../../controllers/admin/adminUsersController');

const router = express.Router();

router.get('/', adminUsersController.listRanks);

module.exports = router;
