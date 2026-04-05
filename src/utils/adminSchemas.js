const { z } = require('zod');

const uuid = z.string().uuid();

const pagingQuery = z.object({
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional()
});

const adminUsersQuerySchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: pagingQuery.extend({
    search: z.string().optional(),
    rank: z.string().optional(),
    status: z.enum(['active', 'inactive']).optional(),
    joinedFrom: z.string().date().optional(),
    joinedTo: z.string().date().optional()
  })
});

const adminUserSearchQuerySchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: pagingQuery.extend({ q: z.string().min(1).max(100) })
});

const adminUserIdParamSchema = z.object({ body: z.object({}), params: z.object({ id: uuid }), query: z.object({}) });
const adminUserStatusSchema = z.object({ body: z.object({ isActive: z.boolean() }), params: z.object({ id: uuid }), query: z.object({}) });
const adminUserRankSchema = z.object({ body: z.object({ rankId: z.number().int().positive() }), params: z.object({ id: uuid }), query: z.object({}) });

const adminProductsQuerySchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: pagingQuery.extend({
    search: z.string().optional(),
    category: z.string().max(120).optional(),
    isActive: z.enum(['true', 'false']).optional(),
    isQualifying: z.enum(['true', 'false']).optional()
  })
});

const adminProductCreateSchema = z.object({
  body: z.object({
    sku: z.string().min(2).max(64),
    name: z.string().min(2).max(255),
    description: z.string().max(2000).optional(),
    category: z.string().min(2).max(120).optional(),
    price: z.number().nonnegative(),
    bv: z.number().nonnegative(),
    imageUrl: z.string().min(3).max(1000000).optional(),
    gallery: z.array(z.string().min(3).max(1000000)).optional(),
    isActive: z.boolean().optional(),
    isQualifying: z.boolean().optional()
  }),
  params: z.object({}),
  query: z.object({})
});

const adminProductUpdateSchema = z.object({
  body: z.object({
    sku: z.string().min(2).max(64).optional(),
    name: z.string().min(2).max(255).optional(),
    description: z.string().max(2000).optional(),
    category: z.string().min(2).max(120).optional(),
    price: z.number().nonnegative().optional(),
    bv: z.number().nonnegative().optional(),
    imageUrl: z.string().min(3).max(1000000).optional(),
    gallery: z.array(z.string().min(3).max(1000000)).optional(),
    isActive: z.boolean().optional(),
    isQualifying: z.boolean().optional(),
    moderationStatus: z.enum(['pending', 'approved', 'rejected']).optional(),
    moderationNotes: z.string().max(1000).optional()
  }).refine((body) => Object.keys(body).length > 0, { message: 'At least one field is required for update' }),
  params: z.object({ id: uuid }),
  query: z.object({})
});

const adminProductIdParamSchema = z.object({ body: z.object({}), params: z.object({ id: uuid }), query: z.object({}) });

const adminOrdersQuerySchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: pagingQuery.extend({
    search: z.string().optional(),
    status: z.enum(['paid', 'pending', 'cancelled', 'replaced', 'returned']).optional(),
    userId: uuid.optional(),
    productId: uuid.optional(),
    dateFrom: z.string().date().optional(),
    dateTo: z.string().date().optional()
  })
});

const adminOrderIdParamSchema = z.object({ body: z.object({}), params: z.object({ id: uuid }), query: z.object({}) });

const adminWalletTransactionsQuerySchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: pagingQuery.extend({
    search: z.string().optional(),
    source: z.string().optional(),
    type: z.enum(['credit', 'debit']).optional(),
    userId: uuid.optional(),
    dateFrom: z.string().date().optional(),
    dateTo: z.string().date().optional()
  })
});

const adminWalletAdjustSchema = z.object({
  body: z.object({ userId: uuid, amount: z.number().positive(), type: z.enum(['credit', 'debit']), reason: z.string().min(3).max(500) }),
  params: z.object({}),
  query: z.object({})
});

const adminFinanceListQuerySchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: pagingQuery.extend({
    search: z.string().optional(),
    status: z.enum(['pending', 'approved', 'rejected', 'completed', 'failed']).optional(),
    source: z.enum(['all', 'direct_income', 'matching_income', 'reward_qualification', 'direct_deposit_income', 'level_deposit_income']).optional(),
    userId: uuid.optional(),
    senderId: uuid.optional(),
    receiverId: uuid.optional(),
    dateFrom: z.string().date().optional(),
    dateTo: z.string().date().optional()
  })
});

const adminWalletReviewSchema = z.object({ body: z.object({ status: z.enum(['approved', 'rejected']), adminNote: z.string().max(1000).optional() }), params: z.object({ id: uuid }), query: z.object({}) });
const adminWalletBindingUpsertSchema = z.object({ body: z.object({ walletAddress: z.string().min(8).max(255), network: z.string().max(60).optional() }), params: z.object({ userId: uuid }), query: z.object({}) });
const adminWalletBindingParamSchema = z.object({ body: z.object({}), params: z.object({ userId: uuid }), query: z.object({}) });
const adminBtctStakingPayoutRunSchema = z.object({
  body: z.object({
    asOf: z.string().datetime().optional(),
    limit: z.number().int().positive().max(500).optional()
  }).optional().default({}),
  params: z.object({}),
  query: z.object({})
});

const adminWeeklyRunSchema = z.object({ body: z.object({ cycleStart: z.string().date(), cycleEnd: z.string().date(), notes: z.string().max(1000).optional() }), params: z.object({}), query: z.object({}) });
const adminMonthlyRunSchema = z.object({ body: z.object({ monthStart: z.string().date(), monthEnd: z.string().date(), notes: z.string().max(1000).optional() }), params: z.object({}), query: z.object({}) });
const adminSettlementRunSchema = z.object({ body: z.object({ asOf: z.string().datetime().optional(), limit: z.number().int().positive().max(500).optional(), notes: z.string().max(1000).optional() }), params: z.object({}), query: z.object({}) });
const cycleIdParamSchema = z.object({ body: z.object({}), params: z.object({ cycleId: uuid }), query: z.object({}) });

const rewardsQuerySchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: pagingQuery.extend({
    month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    status: z.enum(['qualified', 'pending', 'processed', 'rejected']).optional(),
    userId: uuid.optional(),
    search: z.string().optional()
  })
});

const rewardStatusUpdateSchema = z.object({ body: z.object({ status: z.enum(['qualified', 'pending', 'processed', 'rejected']) }), params: z.object({ id: uuid }), query: z.object({}) });
const teamTreeQuerySchema = z.object({ body: z.object({}), params: z.object({ id: uuid }), query: z.object({ depth: z.string().regex(/^\d+$/).optional() }) });
const settingsUpdateSchema = z.object({ body: z.object({ compensationSettings: z.record(z.any()).optional(), rankMultipliers: z.array(z.record(z.any())).optional(), rewardSlabs: z.array(z.record(z.any())).optional() }), params: z.object({}), query: z.object({}) });
const depositWalletSettingsUpdateSchema = z.object({
  body: z.object({
    walletAddress: z.string().min(8).max(255).optional(),
    qrImageUrl: z.string().max(1000000).optional(),
    instructions: z.string().max(1000).optional(),
    isActive: z.boolean().optional()
  }).refine((body) => Object.keys(body).length > 0, { message: 'At least one field is required for update' }),
  params: z.object({}),
  query: z.object({})
});
const adminPagingQuerySchema = z.object({ body: z.object({}), params: z.object({}), query: pagingQuery });
const rewardsSummaryQuerySchema = z.object({ body: z.object({}), params: z.object({}), query: z.object({ month: z.string().regex(/^\d{4}-\d{2}$/).optional() }) });
const teamSummaryParamSchema = z.object({ body: z.object({}), params: z.object({ id: uuid }), query: z.object({}) });

const adminBannersQuerySchema = z.object({ body: z.object({}), params: z.object({}), query: pagingQuery.extend({ search: z.string().optional(), isActive: z.enum(['true', 'false']).optional() }) });
const adminBannerCreateSchema = z.object({ body: z.object({ imageUrl: z.string().min(3).max(1000000), title: z.string().min(2).max(255), subtitle: z.string().max(500).optional(), ctaText: z.string().max(80).optional(), targetLink: z.string().max(500).optional(), sortOrder: z.number().int().min(0).max(100000).optional(), isActive: z.boolean().optional(), startAt: z.string().max(64).optional(), endAt: z.string().max(64).optional() }), params: z.object({}), query: z.object({}) });
const adminBannerUpdateSchema = z.object({ body: z.object({ imageUrl: z.string().min(3).max(1000000).optional(), title: z.string().min(2).max(255).optional(), subtitle: z.string().max(500).optional(), ctaText: z.string().max(80).optional(), targetLink: z.string().max(500).optional(), sortOrder: z.number().int().min(0).max(100000).optional(), isActive: z.boolean().optional(), startAt: z.string().max(64).optional(), endAt: z.string().max(64).optional() }).refine((body) => Object.keys(body).length > 0, { message: 'At least one field is required for update' }), params: z.object({ id: uuid }), query: z.object({}) });
const adminBannerIdParamSchema = z.object({ body: z.object({}), params: z.object({ id: uuid }), query: z.object({}) });

const adminSellerApplicationsQuerySchema = z.object({ body: z.object({}), params: z.object({}), query: pagingQuery.extend({ search: z.string().optional(), status: z.enum(['pending', 'approved', 'rejected']).optional() }) });
const adminSellerApplicationReviewSchema = z.object({ body: z.object({ status: z.enum(['approved', 'rejected']), rejectionReason: z.string().max(500).optional(), notes: z.string().max(1000).optional() }).superRefine((body, ctx) => { if (body.status === 'rejected' && !body.rejectionReason) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'rejectionReason is required when status is rejected' }); } }), params: z.object({ id: uuid }), query: z.object({}) });

const adminAuctionStatuses = ['upcoming', 'live', 'ended', 'cancelled'];
const adminAuctionWinnerModes = ['highest', 'middle', 'last'];
const adminAuctionSpecsSchema = z.array(z.object({ label: z.string().min(1).max(100), value: z.string().min(1).max(300) })).optional();
const adminAuctionGallerySchema = z.array(z.string().min(3).max(1000000)).optional();
const adminAuctionSourceModes = ['existing', 'standalone'];
const adminAuctionModeSchema = z.enum(adminAuctionSourceModes).optional();
const adminAuctionBaseBody = z.object({
  sourceMode: adminAuctionModeSchema,
  productId: uuid.optional(),
  title: z.string().min(2).max(255).optional(),
  shortDescription: z.string().max(400).optional(),
  description: z.string().max(4000).optional(),
  imageUrl: z.string().max(1000000).optional(),
  gallery: adminAuctionGallerySchema,
  specifications: adminAuctionSpecsSchema,
  category: z.string().min(2).max(120).optional(),
  itemCondition: z.string().max(120).optional(),
  shippingDetails: z.string().max(1000).optional(),
  entryPrice: z.number().min(0.1),
  hiddenCapacity: z.number().int().positive(),
  winnerCount: z.number().int().positive(),
  winnerModes: z.array(z.enum(adminAuctionWinnerModes)).min(1).max(3),
  stockQuantity: z.number().int().positive().optional(),
  rewardMode: z.enum(['stock', 'split']).optional(),
  rewardValue: z.number().positive().optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  isActive: z.boolean().optional()
});

function validateAuctionCreateMode(body, ctx) {
  const mode = body.sourceMode || (body.productId ? 'existing' : 'standalone');

  if (mode === 'existing') {
    if (!body.productId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['productId'], message: 'productId is required when using an existing product' });
    }
  }

  if (mode === 'standalone') {
    if (!body.title?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['title'], message: 'title is required for auction-only items' });
    }
    if (!body.shortDescription?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['shortDescription'], message: 'shortDescription is required for auction-only items' });
    }
    if (!body.imageUrl?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['imageUrl'], message: 'imageUrl is required for auction-only items' });
    }
    if (!body.category?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['category'], message: 'category is required for auction-only items' });
    }
  }

  if ((body.rewardMode || 'stock') === 'split' && body.rewardValue === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['rewardValue'], message: 'rewardValue is required when rewardMode is split' });
  }

  if (Array.isArray(body.winnerModes) && new Set(body.winnerModes).size !== body.winnerModes.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['winnerModes'], message: 'winnerModes must not contain duplicates' });
  }
}

const adminAuctionsQuerySchema = z.object({ body: z.object({}), params: z.object({}), query: pagingQuery.extend({ search: z.string().optional(), status: z.enum(adminAuctionStatuses).optional() }) });
const adminAuctionCreateSchema = z.object({ body: adminAuctionBaseBody.superRefine(validateAuctionCreateMode), params: z.object({}), query: z.object({}) });
const adminAuctionUpdateSchema = z.object({ body: adminAuctionBaseBody.partial().refine((body) => Object.keys(body).length > 0, { message: 'At least one field is required for update' }), params: z.object({ id: uuid }), query: z.object({}) });
const adminAuctionIdParamSchema = z.object({ body: z.object({}), params: z.object({ id: uuid }), query: z.object({}) });
const adminAuctionActionSchema = z.object({ body: z.object({ action: z.enum(['close', 'cancel', 'activate', 'deactivate']), reason: z.string().max(255).optional() }), params: z.object({ id: uuid }), query: z.object({}) });

const landingSectionOrderValues = ['hero', 'featured', 'benefits', 'details', 'testimonials', 'stats', 'countries', 'footer'];
const landingContentSectionValues = ['benefits', 'details'];
const landingLayoutStyleValues = ['icon-card', 'image-left', 'image-right'];
const landingMediaSlotValues = [
  'hero_image',
  'promo_banner_image',
  'feature_image_1',
  'feature_image_2',
  'feature_image_3',
  'feature_image_4',
  'step_image_1',
  'step_image_2',
  'step_image_3',
  'step_image_4',
  'reason_image_1',
  'reason_image_2',
  'reason_image_3',
  'reason_image_4',
  'product_image_1',
  'product_image_2',
  'product_image_3',
  'product_image_4'
];
const landingSectionOrderSchema = z.array(z.enum(landingSectionOrderValues)).min(1).optional();
const landingVisibilitySchema = z.record(z.boolean()).optional();
const nullableNonNegativeInt = z.union([z.number().int().min(0), z.null()]).optional();

const adminLandingSettingsUpdateSchema = z.object({
  body: z.object({
    heroBadge: z.string().min(2).max(80).optional(),
    heroHeadline: z.string().min(3).max(255).optional(),
    heroSubheadline: z.string().min(10).max(500).optional(),
    heroPrimaryCtaText: z.string().min(2).max(80).optional(),
    heroSecondaryCtaText: z.string().min(2).max(80).optional(),
    heroImageUrl: z.string().max(1000000).optional(),
    heroBackgroundNote: z.string().max(120).optional(),
    featuredSectionTitle: z.string().min(2).max(120).optional(),
    benefitsSectionTitle: z.string().min(2).max(120).optional(),
    detailsSectionTitle: z.string().min(2).max(120).optional(),
    testimonialsSectionTitle: z.string().min(2).max(120).optional(),
    statsSectionTitle: z.string().min(2).max(120).optional(),
    countriesSectionTitle: z.string().min(2).max(120).optional(),
    footerSupportText: z.string().min(4).max(200).optional(),
    footerContactEmail: z.string().max(255).optional(),
    sectionOrder: landingSectionOrderSchema,
    sectionVisibility: landingVisibilitySchema
  }).refine((body) => Object.keys(body).length > 0, { message: 'At least one field is required for update' }),
  params: z.object({}),
  query: z.object({})
});

const adminLandingStatsUpdateSchema = z.object({
  body: z.object({
    totalVisitors: z.number().int().min(0).optional(),
    totalVisitorsOverride: nullableNonNegativeInt,
    totalReviewsOverride: nullableNonNegativeInt,
    totalMembersOverride: nullableNonNegativeInt
  }).refine((body) => Object.keys(body).length > 0, { message: 'At least one field is required for update' }),
  params: z.object({}),
  query: z.object({})
});

const adminLandingMediaSlotParamSchema = z.object({
  body: z.object({}),
  params: z.object({ slotKey: z.enum(landingMediaSlotValues) }),
  query: z.object({})
});

const adminLandingMediaSlotUpdateSchema = z.object({
  body: z.object({
    imageDataUrl: z.string().max(5000000).optional(),
    altText: z.union([z.string().max(255), z.null()]).optional(),
    removeImage: z.boolean().optional()
  }).refine((body) => Object.keys(body).length > 0, { message: 'At least one field is required for update' }),
  params: z.object({ slotKey: z.enum(landingMediaSlotValues) }),
  query: z.object({})
});

const landingFeaturedItemBody = z.object({
  productId: z.union([uuid, z.null()]).optional(),
  title: z.string().min(2).max(255).optional(),
  description: z.string().max(1000).optional(),
  imageUrl: z.string().max(1000000).optional(),
  priceLabel: z.string().max(120).optional(),
  promoText: z.string().max(120).optional(),
  ctaText: z.string().max(80).optional(),
  targetLink: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).max(100000).optional(),
  isActive: z.boolean().optional()
});

const adminLandingFeaturedItemCreateSchema = z.object({
  body: landingFeaturedItemBody.superRefine((body, ctx) => {
    if (!body.productId && !body.title?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['title'], message: 'title is required when productId is not provided' });
    }
  }),
  params: z.object({}),
  query: z.object({})
});

const adminLandingFeaturedItemUpdateSchema = z.object({
  body: landingFeaturedItemBody.refine((body) => Object.keys(body).length > 0, { message: 'At least one field is required for update' }),
  params: z.object({ id: uuid }),
  query: z.object({})
});

const landingContentBlockBody = z.object({
  sectionKey: z.enum(landingContentSectionValues),
  title: z.string().min(2).max(255),
  subtitle: z.string().max(255).optional(),
  bodyText: z.string().max(5000).optional(),
  imageUrl: z.string().max(1000000).optional(),
  iconName: z.string().max(60).optional(),
  accentLabel: z.string().max(120).optional(),
  ctaText: z.string().max(80).optional(),
  targetLink: z.string().max(500).optional(),
  layoutStyle: z.enum(landingLayoutStyleValues).optional(),
  sortOrder: z.number().int().min(0).max(100000).optional(),
  isActive: z.boolean().optional()
});

const adminLandingContentBlockCreateSchema = z.object({ body: landingContentBlockBody, params: z.object({}), query: z.object({}) });
const adminLandingContentBlockUpdateSchema = z.object({
  body: landingContentBlockBody.partial().refine((body) => Object.keys(body).length > 0, { message: 'At least one field is required for update' }),
  params: z.object({ id: uuid }),
  query: z.object({})
});

const landingTestimonialBody = z.object({
  reviewerName: z.string().min(2).max(160),
  reviewerRole: z.string().max(160).optional(),
  reviewText: z.string().min(10).max(2000),
  rating: z.number().int().min(1).max(5).optional(),
  avatarUrl: z.string().max(1000000).optional(),
  sortOrder: z.number().int().min(0).max(100000).optional(),
  isActive: z.boolean().optional()
});

const adminLandingTestimonialCreateSchema = z.object({ body: landingTestimonialBody, params: z.object({}), query: z.object({}) });
const adminLandingTestimonialUpdateSchema = z.object({
  body: landingTestimonialBody.partial().refine((body) => Object.keys(body).length > 0, { message: 'At least one field is required for update' }),
  params: z.object({ id: uuid }),
  query: z.object({})
});

const landingCountryBody = z.object({
  countryCode: z.string().min(2).max(8),
  countryName: z.string().min(2).max(80),
  flagEmoji: z.string().min(1).max(12),
  sortOrder: z.number().int().min(0).max(100000).optional(),
  isActive: z.boolean().optional()
});

const adminLandingCountryCreateSchema = z.object({ body: landingCountryBody, params: z.object({}), query: z.object({}) });
const adminLandingCountryUpdateSchema = z.object({
  body: landingCountryBody.partial().refine((body) => Object.keys(body).length > 0, { message: 'At least one field is required for update' }),
  params: z.object({ id: uuid }),
  query: z.object({})
});

const adminLandingEntityIdParamSchema = z.object({ body: z.object({}), params: z.object({ id: uuid }), query: z.object({}) });

const supportCategories = ['order_issue', 'payment_issue', 'auction_issue', 'account_issue', 'seller_issue', 'other'];
const supportStatuses = ['open', 'replied', 'closed'];

const adminSupportThreadsQuerySchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: pagingQuery.extend({
    search: z.string().max(120).optional(),
    status: z.enum(supportStatuses).optional(),
    category: z.enum(supportCategories).optional(),
    userId: uuid.optional(),
    dateFrom: z.string().date().optional(),
    dateTo: z.string().date().optional()
  })
});

const adminSupportThreadIdParamSchema = z.object({ body: z.object({}), params: z.object({ id: uuid }), query: z.object({}) });
const adminSupportMessageCreateSchema = z.object({ body: z.object({ message: z.string().min(1).max(5000) }), params: z.object({ id: uuid }), query: z.object({}) });
const adminSupportStatusUpdateSchema = z.object({ body: z.object({ status: z.enum(supportStatuses) }), params: z.object({ id: uuid }), query: z.object({}) });

module.exports = {
  adminUsersQuerySchema,
  adminUserSearchQuerySchema,
  adminUserIdParamSchema,
  adminUserStatusSchema,
  adminUserRankSchema,
  adminProductsQuerySchema,
  adminProductCreateSchema,
  adminProductUpdateSchema,
  adminProductIdParamSchema,
  adminOrdersQuerySchema,
  adminOrderIdParamSchema,
  adminWalletTransactionsQuerySchema,
  adminWalletAdjustSchema,
  adminFinanceListQuerySchema,
  adminWalletReviewSchema,
  adminWalletBindingUpsertSchema,
  adminWalletBindingParamSchema,
  adminBtctStakingPayoutRunSchema,
  adminWeeklyRunSchema,
  adminMonthlyRunSchema,
  adminSettlementRunSchema,
  cycleIdParamSchema,
  adminPagingQuerySchema,
  rewardsQuerySchema,
  rewardsSummaryQuerySchema,
  rewardStatusUpdateSchema,
  teamTreeQuerySchema,
  teamSummaryParamSchema,
  adminBannersQuerySchema,
  adminBannerCreateSchema,
  adminBannerUpdateSchema,
  adminBannerIdParamSchema,
  adminSellerApplicationsQuerySchema,
  adminSellerApplicationReviewSchema,
  settingsUpdateSchema,
  depositWalletSettingsUpdateSchema,
  adminAuctionsQuerySchema,
  adminAuctionCreateSchema,
  adminAuctionUpdateSchema,
  adminAuctionIdParamSchema,
  adminAuctionActionSchema,
  adminLandingSettingsUpdateSchema,
  adminLandingStatsUpdateSchema,
  adminLandingMediaSlotParamSchema,
  adminLandingMediaSlotUpdateSchema,
  adminLandingFeaturedItemCreateSchema,
  adminLandingFeaturedItemUpdateSchema,
  adminLandingContentBlockCreateSchema,
  adminLandingContentBlockUpdateSchema,
  adminLandingTestimonialCreateSchema,
  adminLandingTestimonialUpdateSchema,
  adminLandingCountryCreateSchema,
  adminLandingCountryUpdateSchema,
  adminLandingEntityIdParamSchema
};

