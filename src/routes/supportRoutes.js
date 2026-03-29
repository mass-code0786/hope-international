const express = require('express');
const validate = require('../middleware/validate');
const { auth } = require('../middleware/auth');
const supportController = require('../controllers/supportController');
const {
  supportThreadsQuerySchema,
  supportThreadCreateSchema,
  supportThreadIdParamSchema,
  supportMessageCreateSchema
} = require('../utils/schemas');

const router = express.Router();

router.get('/threads', auth(), validate(supportThreadsQuerySchema), supportController.listThreads);
router.post('/threads', auth(), validate(supportThreadCreateSchema), supportController.createThread);
router.get('/threads/:id', auth(), validate(supportThreadIdParamSchema), supportController.getThread);
router.post('/threads/:id/messages', auth(), validate(supportMessageCreateSchema), supportController.sendMessage);

module.exports = router;
