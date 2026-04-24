const express = require('express');
const validate = require('../middleware/validate');
const { auth } = require('../middleware/auth');
const helpingHandController = require('../controllers/helpingHandController');
const {
  helpingHandEligibilityQuerySchema,
  helpingHandApplicationCreateSchema,
  helpingHandApplicationsQuerySchema
} = require('../utils/schemas');

const router = express.Router();

router.get('/eligibility', auth(), validate(helpingHandEligibilityQuerySchema), helpingHandController.eligibility);
router.post('/applications', auth(), validate(helpingHandApplicationCreateSchema), helpingHandController.createApplication);
router.get('/my-applications', auth(), validate(helpingHandApplicationsQuerySchema), helpingHandController.myApplications);

module.exports = router;
