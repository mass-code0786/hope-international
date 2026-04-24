const express = require('express');
const validate = require('../../middleware/validate');
const adminHelpingHandController = require('../../controllers/admin/adminHelpingHandController');
const {
  adminHelpingHandApplicationsQuerySchema,
  adminHelpingHandApplicationStatusSchema
} = require('../../utils/adminSchemas');

const router = express.Router();

router.get('/applications', validate(adminHelpingHandApplicationsQuerySchema), adminHelpingHandController.listApplications);
router.patch('/applications/:id/status', validate(adminHelpingHandApplicationStatusSchema), adminHelpingHandController.updateApplicationStatus);

module.exports = router;
