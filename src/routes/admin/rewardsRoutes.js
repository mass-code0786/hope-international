const express = require('express');
const validate = require('../../middleware/validate');
const adminRewardsController = require('../../controllers/admin/adminRewardsController');
const { rewardsQuerySchema, rewardsSummaryQuerySchema, rewardStatusUpdateSchema } = require('../../utils/adminSchemas');

const router = express.Router();

router.get('/qualifications', validate(rewardsQuerySchema), adminRewardsController.qualifications);
router.get('/summary', validate(rewardsSummaryQuerySchema), adminRewardsController.summary);
router.patch('/qualifications/:id/status', validate(rewardStatusUpdateSchema), adminRewardsController.updateStatus);

module.exports = router;
