const express = require('express');
const validate = require('../../middleware/validate');
const adminGalleryController = require('../../controllers/admin/adminGalleryController');
const {
  adminGalleryCreateSchema,
  adminGalleryUpdateSchema,
  adminGalleryIdParamSchema
} = require('../../utils/adminSchemas');

const router = express.Router();

router.get('/', adminGalleryController.listItems);
router.post('/', validate(adminGalleryCreateSchema), adminGalleryController.createItem);
router.patch('/:id', validate(adminGalleryUpdateSchema), adminGalleryController.updateItem);
router.delete('/:id', validate(adminGalleryIdParamSchema), adminGalleryController.deleteItem);

module.exports = router;
