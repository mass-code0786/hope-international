const express = require('express');
const sellerController = require('../controllers/sellerController');
const { auth, requireSeller } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  sellerApplySchema,
  sellerProductCreateSchema,
  sellerProductUpdateSchema,
  sellerProductIdParamSchema,
  sellerOrdersQuerySchema,
  sellerPayoutsQuerySchema,
  sellerDocumentUploadSchema,
  sellerDocumentIdParamSchema
} = require('../utils/schemas');

const router = express.Router();

router.post('/apply', auth(), validate(sellerApplySchema), sellerController.apply);
router.get('/me', auth(), sellerController.me);
router.get('/orders', auth(), requireSeller, validate(sellerOrdersQuerySchema), sellerController.orders);
router.get('/payouts', auth(), requireSeller, validate(sellerPayoutsQuerySchema), sellerController.payouts);
router.post('/documents/upload', auth(), requireSeller, validate(sellerDocumentUploadSchema), sellerController.uploadDocument);
router.get('/documents', auth(), requireSeller, sellerController.listDocuments);
router.delete('/documents/:id', auth(), requireSeller, validate(sellerDocumentIdParamSchema), sellerController.deleteDocument);
router.post('/products', auth(), requireSeller, validate(sellerProductCreateSchema), sellerController.createProduct);
router.get('/products/:id', auth(), requireSeller, validate(sellerProductIdParamSchema), sellerController.getProduct);
router.patch('/products/:id', auth(), requireSeller, validate(sellerProductUpdateSchema), sellerController.updateProduct);

module.exports = router;
