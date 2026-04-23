const { z } = require('zod');
const { SELLER_APPLICATION_FEE_USD } = require('../config/constants');

const REFERRAL_REQUIRED_MESSAGE = 'Referral link/code is required for registration';

const uuid = z.string().uuid();
const usernameSchema = z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscore');

const registerSchema = z.object({
  body: z
    .object({
      firstName: z.string().min(1).max(120),
      lastName: z.string().min(1).max(120),
      username: usernameSchema,
      mobileNumber: z.string().min(6).max(40),
      countryCode: z.string().min(1).max(12),
      email: z.string().email(),
      password: z.string().min(8).max(128),
      referralCode: z.preprocess(
        (value) => (value === undefined || value === null ? '' : value),
        z.string().trim().min(1, REFERRAL_REQUIRED_MESSAGE).max(500)
      ),
      preferredLeg: z.enum(['left', 'right']).optional()
    })
    .superRefine((val, ctx) => {
      if (!String(val.referralCode || '').trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: REFERRAL_REQUIRED_MESSAGE, path: ['referralCode'] });
      }
    }),
  params: z.object({}),
  query: z.object({})
});

const loginSchema = z.object({
  body: z.object({
    username: usernameSchema,
    password: z.string().min(8).max(128),
    rememberMe: z.boolean().optional().default(false)
  }),
  params: z.object({}),
  query: z.object({})
});

const webauthnRegisterOptionsSchema = z.object({
  body: z.object({}).optional().default({}),
  params: z.object({}),
  query: z.object({})
});

const webauthnRegisterVerifySchema = z.object({
  body: z.object({
    challenge: z.string().min(8).max(255),
    rawId: z.string().min(8).max(2048).optional(),
    credentialId: z.string().min(8).max(1024),
    clientDataJSON: z.string().min(8),
    authenticatorData: z.string().min(8),
    attestationObject: z.string().min(8).optional(),
    publicKey: z.string().min(8),
    transports: z.array(z.string().min(2).max(32)).optional(),
    deviceName: z.string().min(1).max(120).optional()
  }),
  params: z.object({}),
  query: z.object({})
});

const webauthnLoginOptionsSchema = z.object({
  body: z.object({
    username: usernameSchema
  }),
  params: z.object({}),
  query: z.object({})
});

const webauthnLoginVerifySchema = z.object({
  body: z.object({
    challenge: z.string().min(8).max(255),
    rawId: z.string().min(8).max(2048).optional(),
    credentialId: z.string().min(8).max(1024),
    clientDataJSON: z.string().min(8),
    authenticatorData: z.string().min(8),
    signature: z.string().min(8),
    userHandle: z.string().nullable().optional(),
    rememberMe: z.boolean().optional().default(false)
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
    imageUrl: z.string().min(3).max(1000000).optional(),
    gallery: z.array(z.string().min(3).max(1000000)).optional(),
    isActive: z.boolean().optional(),
    isQualifying: z.boolean().optional()
  }),
  params: z.object({}),
  query: z.object({})
});

const orderCreateSchema = z.object({
  body: z.object({
    addressId: uuid,
    chargeWallet: z.boolean().optional().default(true),
    paymentSource: z.enum(['deposit_wallet']).optional().default('deposit_wallet'),
    items: z.array(z.object({ productId: uuid, quantity: z.number().int().positive() })).min(1)
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

const matchingResultQuerySchema = z.object({ body: z.object({}), params: z.object({ cycleId: uuid }), query: z.object({}) });

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
  query: z.object({ cycleStart: z.string().date(), cycleEnd: z.string().date() })
});

const compensationMonthlyQuerySchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({ monthStart: z.string().date(), monthEnd: z.string().date() })
});

const walletAdjustSchema = z.object({
  body: z.object({ userId: uuid, amount: z.number().positive(), type: z.enum(['credit', 'debit']), note: z.string().max(300).optional() }),
  params: z.object({}),
  query: z.object({})
});

const walletBindSchema = z.object({
  body: z.object({ walletAddress: z.string().min(8).max(255), network: z.string().max(60).optional() }),
  params: z.object({}),
  query: z.object({})
});

const nowPaymentsCreateSchema = z.object({
  body: z.object({
    amount: z.number().positive(),
    payCurrency: z.string().trim().min(2).max(40).optional(),
    network: z.string().trim().min(2).max(40).optional()
  }).superRefine((body, ctx) => {
    const payCurrency = String(body.payCurrency || 'usdt').trim().toLowerCase();
    if (!['usdt', 'usdtbsc'].includes(payCurrency)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'NOWPayments deposits support only USDT on BSC/BEP20', path: ['payCurrency'] });
    }

    if (body.network) {
      const network = String(body.network).trim().toLowerCase();
      if (!['bsc', 'bep20', 'bsc/bep20'].includes(network)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'NOWPayments deposits support only USDT on BSC/BEP20', path: ['network'] });
      }
    }
  }),
  params: z.object({}),
  query: z.object({})
});

const paymentIdParamSchema = z.object({
  body: z.object({}),
  params: z.object({ id: uuid }),
  query: z.object({})
});

const walletWithdrawalSchema = z.object({
  body: z.object({ amount: z.number().positive(), walletAddress: z.string().min(8).max(255).optional(), network: z.string().max(60).optional(), notes: z.string().max(800).optional() }),
  params: z.object({}),
  query: z.object({})
});

const walletTransferSchema = z.object({
  body: z.object({
    fromWallet: z.enum(['deposit_wallet', 'income_wallet', 'bonus_wallet']),
    toWallet: z.enum(['deposit_wallet', 'income_wallet', 'bonus_wallet']),
    amount: z.number().positive()
  }),
  params: z.object({}),
  query: z.object({})
});

const walletP2pSchema = z.object({
  body: z.object({
    toUsername: usernameSchema.optional(),
    toUserId: uuid.optional(),
    amount: z.number().positive(),
    notes: z.string().max(500).optional()
  }).refine((body) => Boolean(body.toUsername || body.toUserId), { message: 'Recipient username or user ID is required' }),
  params: z.object({}),
  query: z.object({})
});

const walletBtctStakingStartSchema = z.object({
  body: z.object({
    stakingAmountBtct: z.number().positive().optional()
  }).optional().default({}),
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
    applicationFee: z.number().refine((value) => Number(value) === SELLER_APPLICATION_FEE_USD, {
      message: `Seller application fee must be exactly ${SELLER_APPLICATION_FEE_USD} USD`
    }),
    kycDetails: z.record(z.any()).optional(),
    documents: z.array(z.object({
      documentType: z.string().min(2).max(80),
      documentNumber: z.string().max(120).optional(),
      documentUrl: z.string().url(),
      notes: z.string().max(300).optional()
    })).min(1)
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
    imageUrl: z.string().min(3).max(1000000).optional(),
    gallery: z.array(z.string().min(3).max(1000000)).optional(),
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
    imageUrl: z.string().min(3).max(1000000).optional(),
    gallery: z.array(z.string().min(3).max(1000000)).optional(),
    isQualifying: z.boolean().optional(),
    moderationNotes: z.string().max(1000).optional()
  }),
  params: z.object({ id: uuid }),
  query: z.object({})
});

const sellerProductIdParamSchema = z.object({ body: z.object({}), params: z.object({ id: uuid }), query: z.object({}) });

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

const sellerDocumentIdParamSchema = z.object({ body: z.object({}), params: z.object({ id: uuid }), query: z.object({}) });

function firstQueryValue(value) {
  if (Array.isArray(value)) return value[0];
  return value;
}

const pagingQuery = z.object({
  page: z.preprocess((value) => firstQueryValue(value), z.union([z.string(), z.number()]).optional()).transform((value) => {
    if (value === undefined || value === null || value === '') return undefined;
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? String(parsed) : undefined;
  }),
  limit: z.preprocess((value) => firstQueryValue(value), z.union([z.string(), z.number()]).optional()).transform((value) => {
    if (value === undefined || value === null || value === '') return undefined;
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? String(parsed) : undefined;
  })
});

const auctionStatuses = ['all', 'upcoming', 'live', 'ended', 'cancelled'];

const auctionStatusSchema = z.preprocess((value) => firstQueryValue(value), z.string().optional()).transform((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'active') return 'live';
  return auctionStatuses.includes(normalized) ? normalized : undefined;
});

const auctionListQuerySchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: pagingQuery.extend({
    status: auctionStatusSchema,
    includeTotal: z.preprocess((value) => firstQueryValue(value), z.union([z.boolean(), z.string()]).optional()).transform((value) => {
      if (value === undefined || value === null || value === '') return undefined;
      if (typeof value === 'boolean') return value;
      return String(value).trim().toLowerCase() !== 'false';
    }),
    view: z.preprocess((value) => firstQueryValue(value), z.string().optional()).transform((value) => {
      if (value === undefined || value === null || value === '') return undefined;
      const normalized = String(value).trim().toLowerCase();
      return ['card', 'default'].includes(normalized) ? normalized : undefined;
    }),
    search: z.preprocess((value) => firstQueryValue(value), z.string().optional()).transform((value) => {
      if (value === undefined || value === null) return undefined;
      const normalized = String(value).trim();
      return normalized ? normalized.slice(0, 120) : undefined;
    })
  })
});

const auctionIdParamSchema = z.object({ body: z.object({}), params: z.object({ id: uuid }), query: z.object({}) });

const auctionBidSchema = z.object({
  body: z.object({ entryCount: z.number().int().positive().max(100) }),
  params: z.object({ id: uuid }),
  query: z.object({})
});

const auctionHistoryQuerySchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: pagingQuery.extend({
    kind: z.preprocess((value) => firstQueryValue(value), z.string().optional()).transform((value) => {
      if (value === undefined || value === null || value === '') return undefined;
      const normalized = String(value).trim().toLowerCase();
      return ['bids', 'joined', 'wins', 'history'].includes(normalized) ? normalized : undefined;
    })
  })
});

const supportCategories = ['order_issue', 'payment_issue', 'auction_issue', 'account_issue', 'seller_issue', 'other'];
const supportStatuses = ['open', 'replied', 'closed'];

const supportThreadsQuerySchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: pagingQuery.extend({
    status: z.preprocess((value) => firstQueryValue(value), z.enum(supportStatuses).optional()),
    category: z.preprocess((value) => firstQueryValue(value), z.enum(supportCategories).optional()),
    search: z.preprocess((value) => firstQueryValue(value), z.string().max(120).optional()),
    dateFrom: z.preprocess((value) => firstQueryValue(value), z.string().date().optional()),
    dateTo: z.preprocess((value) => firstQueryValue(value), z.string().date().optional())
  })
});

const supportThreadCreateSchema = z.object({
  body: z.object({
    subject: z.string().min(2).max(160),
    category: z.enum(supportCategories),
    message: z.string().min(1).max(5000)
  }),
  params: z.object({}),
  query: z.object({})
});

const supportThreadIdParamSchema = z.object({ body: z.object({}), params: z.object({ id: uuid }), query: z.object({}) });
const supportMessageCreateSchema = z.object({ body: z.object({ message: z.string().min(1).max(5000) }), params: z.object({ id: uuid }), query: z.object({}) });
const notificationsListQuerySchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: pagingQuery
});
const autopoolOverviewQuerySchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({})
});
const autopoolHistoryQuerySchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: pagingQuery
});
const autopoolEnterSchema = z.object({
  body: z.object({
    requestId: uuid.optional()
  }).optional().default({}),
  params: z.object({}),
  query: z.object({})
});
const notificationIdParamSchema = z.object({ body: z.object({}), params: z.object({ id: uuid }), query: z.object({}) });
const notificationReadAllSchema = z.object({ body: z.object({}).optional().default({}), params: z.object({}), query: z.object({}) });
const assistantChatSchema = z.object({
  body: z.object({
    message: z.string().trim().min(1).max(1000),
    language: z.enum(['en', 'hi', 'ur', 'ar', 'bn', 'ps']).optional().default('en')
  }),
  params: z.object({}),
  query: z.object({})
});

const mobileFieldSchema = z.string().trim().min(6).max(40).regex(/^[0-9+\-() ]+$/, 'Enter a valid mobile number');
const postalCodeFieldSchema = z.string().trim().min(3).max(32).regex(/^[A-Za-z0-9\- ]+$/, 'Enter a valid postal code');

const userAddressBodySchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  mobile: mobileFieldSchema,
  alternateMobile: z.union([mobileFieldSchema, z.literal('')]).optional(),
  country: z.string().trim().min(2).max(120),
  state: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(120),
  area: z.string().trim().min(2).max(160),
  addressLine: z.string().trim().min(5).max(500),
  postalCode: postalCodeFieldSchema,
  deliveryNote: z.string().trim().max(500).optional()
});

const userAddressQuerySchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({})
});

const welcomeSpinStatusSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({})
});

const welcomeSpinClaimSchema = z.object({
  body: z.object({}).optional().default({}),
  params: z.object({}),
  query: z.object({})
});

const webauthnStatusSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({})
});

const webauthnCredentialParamSchema = z.object({
  body: z.object({}),
  params: z.object({ credentialId: uuid }),
  query: z.object({})
});

const userAddressCreateSchema = z.object({
  body: userAddressBodySchema,
  params: z.object({}),
  query: z.object({})
});

const userAddressUpdateSchema = z.object({
  body: userAddressBodySchema,
  params: z.object({}),
  query: z.object({})
});

module.exports = {
  registerSchema,
  loginSchema,
  webauthnRegisterOptionsSchema,
  webauthnRegisterVerifySchema,
  webauthnLoginOptionsSchema,
  webauthnLoginVerifySchema,
  productCreateSchema,
  orderCreateSchema,
  matchingRunSchema,
  matchingResultQuerySchema,
  monthlyRewardRunSchema,
  compensationWeeklyQuerySchema,
  compensationMonthlyQuerySchema,
  walletAdjustSchema,
  walletBindSchema,
  nowPaymentsCreateSchema,
  paymentIdParamSchema,
  walletTransferSchema,
  walletWithdrawalSchema,
  walletP2pSchema,
  walletBtctStakingStartSchema,
  sellerApplySchema,
  sellerProductCreateSchema,
  sellerProductUpdateSchema,
  sellerProductIdParamSchema,
  sellerOrdersQuerySchema,
  sellerPayoutsQuerySchema,
  sellerDocumentUploadSchema,
  sellerDocumentIdParamSchema,
  auctionListQuerySchema,
  auctionIdParamSchema,
  auctionBidSchema,
  auctionHistoryQuerySchema,
  supportThreadsQuerySchema,
  supportThreadCreateSchema,
  supportThreadIdParamSchema,
  supportMessageCreateSchema,
  autopoolOverviewQuerySchema,
  autopoolHistoryQuerySchema,
  autopoolEnterSchema,
  notificationsListQuerySchema,
  notificationIdParamSchema,
  notificationReadAllSchema,
  assistantChatSchema,
  userAddressQuerySchema,
  userAddressCreateSchema,
  userAddressUpdateSchema,
  webauthnStatusSchema,
  webauthnCredentialParamSchema,
  welcomeSpinStatusSchema,
  welcomeSpinClaimSchema
};




