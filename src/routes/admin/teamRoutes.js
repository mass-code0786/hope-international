const express = require('express');
const validate = require('../../middleware/validate');
const adminTeamController = require('../../controllers/admin/adminTeamController');
const { teamTreeQuerySchema, teamSummaryParamSchema } = require('../../utils/adminSchemas');

const router = express.Router();

router.get('/user/:id/tree', validate(teamTreeQuerySchema), adminTeamController.tree);
router.get('/user/:id/summary', validate(teamSummaryParamSchema), adminTeamController.summary);

module.exports = router;
