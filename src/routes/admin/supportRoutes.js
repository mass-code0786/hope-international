const express = require('express');
const validate = require('../../middleware/validate');
const adminSupportController = require('../../controllers/admin/adminSupportController');
const {
  adminSupportThreadsQuerySchema,
  adminSupportThreadIdParamSchema,
  adminSupportMessageCreateSchema,
  adminSupportStatusUpdateSchema
} = require('../../utils/adminSchemas');

const router = express.Router();

router.get('/threads', validate(adminSupportThreadsQuerySchema), adminSupportController.listThreads);
router.get('/threads/:id', validate(adminSupportThreadIdParamSchema), adminSupportController.getThread);
router.post('/threads/:id/messages', validate(adminSupportMessageCreateSchema), adminSupportController.sendMessage);
router.patch('/threads/:id/status', validate(adminSupportStatusUpdateSchema), adminSupportController.updateStatus);

module.exports = router;
