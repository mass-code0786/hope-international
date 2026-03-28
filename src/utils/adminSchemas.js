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
  query: pagingQuery.extend({
    q: z.string().min(1).max(100)
  })
});

const adminUserIdParamSchema = z.object({
  body: z.object({}),
  params: z.object({ id: uuid }),
  query: z.object({})
});

const adminUserStatusSchema = z.object({
  body: z.object({ isActive: z.boolean() }),
  params: z.object({ id: uuid }),
  query: z.object({})
});

const adminUserRankSchema = z.object({
  body: z.object({ rankId: z.number().int().positive() }),
  params: z.object({ id: uuid }),
  query: z.object({})
});

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
    isActive: z.boolean().optional(),
    isQualifying: z.boolean().optional(),
    moderationStatus: z.enum(['pending', 'approved', 'rejected']).optional(),
    moderationNotes: z.string().max(1000).optional()
  }).refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field is required for update'
  }),
  params: z.object({ id: uuid }),
  query: z.object({})
});

const adminProductIdParamSchema = z.object({
  body: z.object({}),
  params: z.object({ id: uuid }),
  query: z.object({})
});

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

const adminOrderIdParamSchema = z.object({
  body: z.object({}),
  params: z.object({ id: uuid }),
  query: z.object({})
});

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
  body: z.object({
    userId: uuid,
    amount: z.number().positive(),
    type: z.enum(['credit', 'debit']),
    reason: z.string().min(3).max(500)
  }),
  params: z.object({}),
  query: z.object({})
});

const adminFinanceListQuerySchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: pagingQuery.extend({
    search: z.string().optional(),
    status: z.enum(['pending', 'approved', 'rejected', 'completed', 'failed']).optional(),
    source: z.enum(['all', 'direct_income', 'matching_income', 'reward_qualification']).optional(),
    userId: uuid.optional(),
    senderId: uuid.optional(),
    receiverId: uuid.optional(),
    dateFrom: z.string().date().optional(),
    dateTo: z.string().date().optional()
  })
});

const adminWalletReviewSchema = z.object({
  body: z.object({
    status: z.enum(['approved', 'rejected']),
    adminNote: z.string().max(1000).optional()
  }),
  params: z.object({ id: uuid }),
  query: z.object({})
});

const adminWalletBindingUpsertSchema = z.object({
  body: z.object({
    walletAddress: z.string().min(8).max(255),
    network: z.string().max(60).optional()
  }),
  params: z.object({ userId: uuid }),
  query: z.object({})
});

const adminWalletBindingParamSchema = z.object({
  body: z.object({}),
  params: z.object({ userId: uuid }),
  query: z.object({})
});

const adminWeeklyRunSchema = z.object({
  body: z.object({
    cycleStart: z.string().date(),
    cycleEnd: z.string().date(),
    notes: z.string().max(1000).optional()
  }),
  params: z.object({}),
  query: z.object({})
});

const adminMonthlyRunSchema = z.object({
  body: z.object({
    monthStart: z.string().date(),
    monthEnd: z.string().date(),
    notes: z.string().max(1000).optional()
  }),
  params: z.object({}),
  query: z.object({})
});

const adminSettlementRunSchema = z.object({
  body: z.object({
    asOf: z.string().datetime().optional(),
    limit: z.number().int().positive().max(500).optional(),
    notes: z.string().max(1000).optional()
  }),
  params: z.object({}),
  query: z.object({})
});

const cycleIdParamSchema = z.object({
  body: z.object({}),
  params: z.object({ cycleId: uuid }),
  query: z.object({})
});

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

const rewardStatusUpdateSchema = z.object({
  body: z.object({ status: z.enum(['qualified', 'pending', 'processed', 'rejected']) }),
  params: z.object({ id: uuid }),
  query: z.object({})
});

const teamTreeQuerySchema = z.object({
  body: z.object({}),
  params: z.object({ id: uuid }),
  query: z.object({ depth: z.string().regex(/^\d+$/).optional() })
});

const settingsUpdateSchema = z.object({
  body: z.object({
    compensationSettings: z.record(z.any()).optional(),
    rankMultipliers: z.array(z.record(z.any())).optional(),
    rewardSlabs: z.array(z.record(z.any())).optional()
  }),
  params: z.object({}),
  query: z.object({})
});

const adminPagingQuerySchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: pagingQuery
});

const rewardsSummaryQuerySchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/).optional()
  })
});

const teamSummaryParamSchema = z.object({
  body: z.object({}),
  params: z.object({ id: uuid }),
  query: z.object({})
});

const adminBannersQuerySchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: pagingQuery.extend({
    search: z.string().optional(),
    isActive: z.enum(['true', 'false']).optional()
  })
});

const adminBannerCreateSchema = z.object({
  body: z.object({
    imageUrl: z.string().min(3).max(1000000),
    title: z.string().min(2).max(255),
    subtitle: z.string().max(500).optional(),
    ctaText: z.string().max(80).optional(),
    targetLink: z.string().max(500).optional(),
    sortOrder: z.number().int().min(0).max(100000).optional(),
    isActive: z.boolean().optional(),
    startAt: z.string().max(64).optional(),
    endAt: z.string().max(64).optional()
  }),
  params: z.object({}),
  query: z.object({})
});

const adminBannerUpdateSchema = z.object({
  body: z.object({
    imageUrl: z.string().min(3).max(1000000).optional(),
    title: z.string().min(2).max(255).optional(),
    subtitle: z.string().max(500).optional(),
    ctaText: z.string().max(80).optional(),
    targetLink: z.string().max(500).optional(),
    sortOrder: z.number().int().min(0).max(100000).optional(),
    isActive: z.boolean().optional(),
    startAt: z.string().max(64).optional(),
    endAt: z.string().max(64).optional()
  }).refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field is required for update'
  }),
  params: z.object({ id: uuid }),
  query: z.object({})
});

const adminBannerIdParamSchema = z.object({
  body: z.object({}),
  params: z.object({ id: uuid }),
  query: z.object({})
});

const adminSellerApplicationsQuerySchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: pagingQuery.extend({
    search: z.string().optional(),
    status: z.enum(['pending', 'approved', 'rejected']).optional()
  })
});

const adminSellerApplicationReviewSchema = z.object({
  body: z.object({
    status: z.enum(['approved', 'rejected']),
    rejectionReason: z.string().max(500).optional(),
    notes: z.string().max(1000).optional()
  }).superRefine((body, ctx) => {
    if (body.status === 'rejected' && !body.rejectionReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'rejectionReason is required when status is rejected'
      });
    }
  }),
  params: z.object({ id: uuid }),
  query: z.object({})
});

const adminAuctionStatuses = ['upcoming', 'live', 'ended', 'cancelled'];
const adminAuctionSpecsSchema = z.array(z.object({
  label: z.string().min(1).max(100),
  value: z.string().min(1).max(300)
})).optional();
const adminAuctionGallerySchema = z.array(z.string().min(3).max(1000000)).optional();

const adminAuctionsQuerySchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: pagingQuery.extend({
    search: z.string().optional(),
    status: z.enum(adminAuctionStatuses).optional()
  })
});

const adminAuctionCreateSchema = z.object({
  body: z.object({
    title: z.string().min(2).max(255),
    shortDescription: z.string().max(400).optional(),
    description: z.string().max(4000).optional(),
    imageUrl: z.string().max(1000000).optional(),
    gallery: adminAuctionGallerySchema,
    specifications: adminAuctionSpecsSchema,
    startingPrice: z.number().min(0.5).max(100),
    minBidIncrement: z.number().min(0.5).max(100).optional(),
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    isActive: z.boolean().optional()
  }),
  params: z.object({}),
  query: z.object({})
});

const adminAuctionUpdateSchema = z.object({
  body: z.object({
    title: z.string().min(2).max(255).optional(),
    shortDescription: z.string().max(400).optional(),
    description: z.string().max(4000).optional(),
    imageUrl: z.string().max(1000000).optional(),
    gallery: adminAuctionGallerySchema,
    specifications: adminAuctionSpecsSchema,
    startingPrice: z.number().min(0.5).max(100).optional(),
    minBidIncrement: z.number().min(0.5).max(100).optional(),
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
    isActive: z.boolean().optional()
  }).refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field is required for update'
  }),
  params: z.object({ id: uuid }),
  query: z.object({})
});

const adminAuctionIdParamSchema = z.object({
  body: z.object({}),
  params: z.object({ id: uuid }),
  query: z.object({})
});

const adminAuctionActionSchema = z.object({
  body: z.object({
    action: z.enum(['close', 'cancel', 'activate', 'deactivate']),
    reason: z.string().max(255).optional()
  }),
  params: z.object({ id: uuid }),
  query: z.object({})
});

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
  adminAuctionsQuerySchema,
  adminAuctionCreateSchema,
  adminAuctionUpdateSchema,
  adminAuctionIdParamSchema,
  adminAuctionActionSchema
};
