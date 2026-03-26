const express = require('express');
const validate = require('../../middleware/validate');
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
router.post('/weekly/run', validate(adminWeeklyRunSchema), adminCompensationController.runWeekly);
router.post('/settlements/run', validate(adminSettlementRunSchema), adminCompensationController.runSettlements);
router.get('/monthly', validate(adminPagingQuerySchema), adminCompensationController.listMonthly);
router.get('/monthly/:cycleId', validate(cycleIdParamSchema), adminCompensationController.getMonthlyById);
router.post('/monthly/run', validate(adminMonthlyRunSchema), adminCompensationController.runMonthly);

module.exports = router;
