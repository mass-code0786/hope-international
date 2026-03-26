const express = require('express');
const validate = require('../../middleware/validate');
const { blockDemoSession } = require('../../middleware/auth');
const adminCompensationController = require('../../controllers/admin/adminCompensationController');
const {
  adminPagingQuerySchema,
  cycleIdParamSchema,
  adminWeeklyRunSchema,
  adminMonthlyRunSchema,
  adminSettlementRunSchema
} = require('../../utils/adminSchemas');

const router = express.Router();

router.get('/weekly', validate(adminPagingQuerySchema), adminCompensationController.listWeekly);
router.get('/weekly/:cycleId', validate(cycleIdParamSchema), adminCompensationController.getWeeklyById);
router.post('/weekly/run', blockDemoSession('Compensation runs'), validate(adminWeeklyRunSchema), adminCompensationController.runWeekly);
router.post('/settlements/run', blockDemoSession('Compensation runs'), validate(adminSettlementRunSchema), adminCompensationController.runSettlements);
router.get('/monthly', validate(adminPagingQuerySchema), adminCompensationController.listMonthly);
router.get('/monthly/:cycleId', validate(cycleIdParamSchema), adminCompensationController.getMonthlyById);
router.post('/monthly/run', blockDemoSession('Compensation runs'), validate(adminMonthlyRunSchema), adminCompensationController.runMonthly);

module.exports = router;
