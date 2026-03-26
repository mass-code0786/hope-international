const { z } = require('zod');

const uuid = z.string().uuid();

const registerSchema = z.object({
  body: z
    .object({
      username: z.string().min(3).max(50),
      email: z.string().email(),
      password: z.string().min(8).max(128),
      sponsorId: uuid.optional(),
      parentId: uuid.optional(),
      placementSide: z.enum(['left', 'right']).optional(),
      preferredLeg: z.enum(['left', 'right']).optional()
    })
    .superRefine((val, ctx) => {
      if ((val.parentId && !val.placementSide) || (!val.parentId && val.placementSide)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'parentId and placementSide must be provided together'
        });
      }

      if ((val.sponsorId && !val.preferredLeg) || (!val.sponsorId && val.preferredLeg)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'sponsorId and preferredLeg must be provided together'
        });
      }

      if (val.parentId && val.sponsorId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Use either direct parent placement or sponsor leg placement, not both'
        });
      }
    }),
  params: z.object({}),
  query: z.object({})
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8).max(128)
  }),
  params: z.object({}),
  query: z.object({})
});

const demoLoginSchema = z.object({
  body: z.object({
    role: z.enum(['user', 'seller', 'admin'])
  }),
  params: z.object({}),
  query: z.object({})
});

const productCreateSchema = z.object({
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

const orderCreateSchema = z.object({
  body: z.object({
    chargeWallet: z.boolean().optional().default(false),
    items: z
      .array(
        z.object({
          productId: uuid,
          quantity: z.number().int().positive()
        })
      )
      .min(1)
  }),
  params: z.object({}),
  query: z.object({})
});

const matchingRunSchema = z.object({
  body: z.object({
    cycleStart: z.string().date(),
    cycleEnd: z.string().date(),
    notes: z.string().max(1000).optional()
  }),
  params: z.object({}),
  query: z.object({})
});

const matchingResultQuerySchema = z.object({
  body: z.object({}),
  params: z.object({ cycleId: uuid }),
  query: z.object({})
});

const monthlyRewardRunSchema = z.object({
  body: z.object({
    monthStart: z.string().date(),
    monthEnd: z.string().date(),
    notes: z.string().max(1000).optional()
  }),
  params: z.object({}),
  query: z.object({})
});

const compensationWeeklyQuerySchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({
    cycleStart: z.string().date(),
    cycleEnd: z.string().date()
  })
});

const compensationMonthlyQuerySchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({
    monthStart: z.string().date(),
    monthEnd: z.string().date()
  })
});

const walletAdjustSchema = z.object({
  body: z.object({
    userId: uuid,
    amount: z.number().positive(),
    type: z.enum(['credit', 'debit']),
    note: z.string().max(300).optional()
  }),
  params: z.object({}),
  query: z.object({})
});

const sellerApplySchema = z.object({
  body: z.object({
    legalName: z.string().min(2).max(255),
    businessName: z.string().min(2).max(255),
    businessType: z.string().max(120).optional(),
    taxId: z.string().max(120).optional(),
    phone: z.string().min(6).max(40),
    email: z.string().email().optional(),
    addressLine1: z.string().max(255).optional(),
    addressLine2: z.string().max(255).optional(),
    city: z.string().max(120).optional(),
    state: z.string().max(120).optional(),
    country: z.string().max(120).optional(),
    postalCode: z.string().max(30).optional(),
    kycDetails: z.record(z.any()).optional(),
    documents: z.array(
      z.object({
        documentType: z.string().min(2).max(80),
        documentNumber: z.string().max(120).optional(),
        documentUrl: z.string().url(),
        notes: z.string().max(300).optional()
      })
    ).min(1)
  }),
  params: z.object({}),
  query: z.object({})
});

const sellerProductCreateSchema = z.object({
  body: z.object({
    sku: z.string().min(2).max(64),
    name: z.string().min(2).max(255),
    description: z.string().max(2000).optional(),
    category: z.string().min(2).max(120).optional(),
    price: z.number().nonnegative(),
    bv: z.number().nonnegative(),
    isQualifying: z.boolean().optional(),
    moderationNotes: z.string().max(1000).optional()
  }),
  params: z.object({}),
  query: z.object({})
});

const sellerProductUpdateSchema = z.object({
  body: z.object({
    sku: z.string().min(2).max(64),
    name: z.string().min(2).max(255),
    description: z.string().max(2000).optional(),
    category: z.string().min(2).max(120).optional(),
    price: z.number().nonnegative(),
    bv: z.number().nonnegative(),
    isQualifying: z.boolean().optional(),
    moderationNotes: z.string().max(1000).optional()
  }),
  params: z.object({ id: uuid }),
  query: z.object({})
});

const sellerProductIdParamSchema = z.object({
  body: z.object({}),
  params: z.object({ id: uuid }),
  query: z.object({})
});

const sellerOrdersQuerySchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    status: z.enum(['paid', 'pending', 'cancelled', 'replaced', 'returned']).optional(),
    dateFrom: z.string().date().optional(),
    dateTo: z.string().date().optional(),
    productId: uuid.optional()
  })
});

const sellerPayoutsQuerySchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    status: z.enum(['pending', 'processing', 'processed', 'failed', 'cancelled']).optional(),
    periodStart: z.string().date().optional(),
    periodEnd: z.string().date().optional()
  })
});

const sellerDocumentUploadSchema = z.object({
  body: z.object({
    documentType: z.string().min(2).max(80),
    documentNumber: z.string().max(120).optional(),
    documentUrl: z.string().url().optional(),
    fileName: z.string().min(2).max(255),
    mimeType: z.string().min(3).max(120),
    fileSizeBytes: z.number().int().positive().max(25 * 1024 * 1024),
    notes: z.string().max(300).optional()
  }),
  params: z.object({}),
  query: z.object({})
});

const sellerDocumentIdParamSchema = z.object({
  body: z.object({}),
  params: z.object({ id: uuid }),
  query: z.object({})
});

module.exports = {
  registerSchema,
  loginSchema,
  demoLoginSchema,
  productCreateSchema,
  orderCreateSchema,
  matchingRunSchema,
  matchingResultQuerySchema,
  monthlyRewardRunSchema,
  compensationWeeklyQuerySchema,
  compensationMonthlyQuerySchema,
  walletAdjustSchema,
  sellerApplySchema,
  sellerProductCreateSchema,
  sellerProductUpdateSchema,
  sellerProductIdParamSchema,
  sellerOrdersQuerySchema,
  sellerPayoutsQuerySchema,
  sellerDocumentUploadSchema,
  sellerDocumentIdParamSchema
};
