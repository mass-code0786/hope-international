const express = require('express');
const validate = require('../../middleware/validate');
const adminLandingController = require('../../controllers/admin/adminLandingController');
const {
  adminLandingSettingsUpdateSchema,
  adminLandingStatsUpdateSchema,
  adminLandingMediaSlotUpdateSchema,
  adminLandingFeaturedItemCreateSchema,
  adminLandingFeaturedItemUpdateSchema,
  adminLandingContentBlockCreateSchema,
  adminLandingContentBlockUpdateSchema,
  adminLandingTestimonialCreateSchema,
  adminLandingTestimonialUpdateSchema,
  adminLandingCountryCreateSchema,
  adminLandingCountryUpdateSchema,
  adminLandingEntityIdParamSchema,
  adminLandingMediaSlotParamSchema
} = require('../../utils/adminSchemas');

const router = express.Router();

router.get('/', adminLandingController.getState);
router.patch('/settings', validate(adminLandingSettingsUpdateSchema), adminLandingController.updateSettings);
router.patch('/stats', validate(adminLandingStatsUpdateSchema), adminLandingController.updateStats);
router.patch('/media/:slotKey', validate(adminLandingMediaSlotUpdateSchema), adminLandingController.updateMediaSlot);
router.delete('/media/:slotKey', validate(adminLandingMediaSlotParamSchema), adminLandingController.deleteMediaSlotImage);

router.post('/featured-items', validate(adminLandingFeaturedItemCreateSchema), adminLandingController.createFeaturedItem);
router.patch('/featured-items/:id', validate(adminLandingFeaturedItemUpdateSchema), adminLandingController.updateFeaturedItem);
router.delete('/featured-items/:id', validate(adminLandingEntityIdParamSchema), adminLandingController.deleteFeaturedItem);

router.post('/content-blocks', validate(adminLandingContentBlockCreateSchema), adminLandingController.createContentBlock);
router.patch('/content-blocks/:id', validate(adminLandingContentBlockUpdateSchema), adminLandingController.updateContentBlock);
router.delete('/content-blocks/:id', validate(adminLandingEntityIdParamSchema), adminLandingController.deleteContentBlock);

router.post('/testimonials', validate(adminLandingTestimonialCreateSchema), adminLandingController.createTestimonial);
router.patch('/testimonials/:id', validate(adminLandingTestimonialUpdateSchema), adminLandingController.updateTestimonial);
router.delete('/testimonials/:id', validate(adminLandingEntityIdParamSchema), adminLandingController.deleteTestimonial);

router.post('/countries', validate(adminLandingCountryCreateSchema), adminLandingController.createCountry);
router.patch('/countries/:id', validate(adminLandingCountryUpdateSchema), adminLandingController.updateCountry);
router.delete('/countries/:id', validate(adminLandingEntityIdParamSchema), adminLandingController.deleteCountry);

module.exports = router;
