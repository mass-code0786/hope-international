const now = '2026-03-25T10:00:00.000Z';

export const demoProducts = [
  {
    id: 'prod-demo-1',
    name: 'Hope Wellness Pack',
    description: 'Signature nutrition bundle with starter wellness essentials.',
    price: 1299,
    bv: 480,
    pv: 192,
    category: 'Wellness',
    is_qualifying: true
  },
  {
    id: 'prod-demo-2',
    name: 'Daily Vitality Capsules',
    description: 'High-repeat personal care supplement for active members.',
    price: 799,
    bv: 260,
    pv: 104,
    category: 'Supplements',
    is_qualifying: true
  },
  {
    id: 'prod-demo-3',
    name: 'Radiance Skin Kit',
    description: 'Beauty and skincare bundle designed for monthly retail demand.',
    price: 1499,
    bv: 540,
    pv: 216,
    category: 'Beauty',
    is_qualifying: true
  }
];

export const demoOrders = [
  {
    id: 'ord-demo-1',
    status: 'paid',
    total_amount: 1299,
    total_bv: 480,
    total_pv: 192,
    created_at: '2026-03-22T09:30:00.000Z',
    items: [{ product_name: 'Hope Wellness Pack', quantity: 1 }]
  },
  {
    id: 'ord-demo-2',
    status: 'paid',
    total_amount: 799,
    total_bv: 260,
    total_pv: 104,
    created_at: '2026-03-18T14:20:00.000Z',
    items: [{ product_name: 'Daily Vitality Capsules', quantity: 1 }]
  }
];

export const demoWallet = {
  wallet: {
    balance: 18650
  },
  transactions: [
    {
      id: 'tx-demo-1',
      tx_type: 'credit',
      source: 'direct_income',
      amount: 2250,
      created_at: '2026-03-24T08:30:00.000Z',
      metadata: { note: 'Direct referral bonus' }
    },
    {
      id: 'tx-demo-2',
      tx_type: 'credit',
      source: 'matching_income',
      amount: 4125,
      created_at: '2026-03-23T11:00:00.000Z',
      metadata: { note: 'Weekly binary payout' }
    },
    {
      id: 'tx-demo-3',
      tx_type: 'credit',
      source: 'reward_qualification',
      amount: 3000,
      created_at: '2026-03-20T15:45:00.000Z',
      metadata: { note: 'Reward qualification payout' }
    },
    {
      id: 'tx-demo-4',
      tx_type: 'debit',
      source: 'cap_overflow',
      amount: 500,
      created_at: '2026-03-19T07:10:00.000Z',
      metadata: { note: 'Cap overflow adjustment' }
    }
  ]
};

export const demoWeeklyCompensation = {
  currentRank: 'Silver',
  weeklyCapMultiplier: 3.5,
  weeklyLeftPv: 980,
  weeklyRightPv: 860,
  matchedPv: 860,
  weeklySelfPv: 240,
  weeklyCap: 25200,
  matchingIncomeNet: 4125,
  directIncome: 2250
};

export const demoMonthlyCompensation = {
  monthlyBv: 18600,
  monthlyPv: 7440,
  rewardLabel: 'Smart TV Reward',
  rewardAmount: 3000
};

export const demoTeamChildren = [
  { id: 'team-demo-1', username: 'Asha Partner', role: 'user', rank_name: 'Bronze', created_at: now },
  { id: 'team-demo-2', username: 'Ravi Builder', role: 'user', rank_name: 'Silver', created_at: now }
];

export const demoSellerMe = {
  profile: {
    business_name: 'Hope Naturals Demo Store',
    application_status: 'approved'
  },
  documents: [
    { id: 'doc-demo-1', type: 'kyc', status: 'verified' },
    { id: 'doc-demo-2', type: 'gst', status: 'verified' }
  ],
  products: [
    {
      id: 'seller-prod-1',
      name: 'Herbal Energy Tea',
      sku: 'HT-001',
      description: 'Moderation-approved herbal wellness tea.',
      price: 699,
      bv: 210,
      pv: 84,
      is_qualifying: true,
      moderation_status: 'approved',
      moderation_notes: '',
      created_at: '2026-03-10T06:00:00.000Z',
      updated_at: '2026-03-22T06:00:00.000Z'
    },
    {
      id: 'seller-prod-2',
      name: 'Protein Balance Mix',
      sku: 'PB-220',
      description: 'Awaiting final moderation review.',
      price: 1199,
      bv: 420,
      pv: 168,
      is_qualifying: true,
      moderation_status: 'pending',
      moderation_notes: '',
      created_at: '2026-03-14T06:00:00.000Z',
      updated_at: '2026-03-21T06:00:00.000Z'
    },
    {
      id: 'seller-prod-3',
      name: 'Glow Care Combo',
      sku: 'GC-315',
      description: 'Needs packaging image revision before approval.',
      price: 899,
      bv: 300,
      pv: 120,
      is_qualifying: false,
      moderation_status: 'rejected',
      moderation_notes: 'Primary image needs white-background packaging shot.',
      created_at: '2026-03-08T06:00:00.000Z',
      updated_at: '2026-03-18T06:00:00.000Z'
    }
  ],
  summary: {
    total_products: 3,
    pending_products: 1,
    approved_products: 1,
    rejected_products: 1
  },
  canAccessDashboard: true
};

export const demoAdminDashboard = {
  summary: {
    total_users: 1284,
    active_users: 932,
    total_sales_amount: 842500,
    total_pv: 136440,
    total_paid_orders: 614,
    total_direct_income_paid: 118200,
    total_matching_income_paid: 163400,
    total_cap_overflow: 9200,
    current_weekly_cycle_status: 'Monitoring',
    current_monthly_cycle_status: 'Open',
    total_reward_qualification_count: 48,
    total_reward_cash_value: 72000,
    inactive_users: 352,
    total_bv: 341100
  },
  recentOrders: [
    { id: 'adm-ord-1', status: 'paid', total_amount: 4499, created_at: '2026-03-24T10:00:00.000Z' },
    { id: 'adm-ord-2', status: 'paid', total_amount: 2299, created_at: '2026-03-23T10:00:00.000Z' }
  ],
  recentTransactions: [
    { id: 'adm-tx-1', source: 'matching_income', tx_type: 'credit', amount: 5200, created_at: '2026-03-24T10:00:00.000Z' },
    { id: 'adm-tx-2', source: 'direct_income', tx_type: 'credit', amount: 3100, created_at: '2026-03-23T10:00:00.000Z' }
  ],
  charts: {
    weeklySalesTrend: [
      { week_start: '2026-02-23', sales_amount: 108000, sales_bv: 43200 },
      { week_start: '2026-03-02', sales_amount: 121500, sales_bv: 48600 },
      { week_start: '2026-03-09', sales_amount: 132000, sales_bv: 52800 },
      { week_start: '2026-03-16', sales_amount: 146500, sales_bv: 58600 }
    ],
    incomeDistribution: [
      { source: 'direct_income', total_amount: 118200 },
      { source: 'matching_income', total_amount: 163400 },
      { source: 'reward_qualification', total_amount: 72000 },
      { source: 'cap_overflow', total_amount: 9200 }
    ]
  }
};

export const demoAdminWalletSummary = {
  total_credits: 524000,
  total_debits: 88400,
  total_direct: 118200,
  total_matching: 163400
};

export const demoAdminWalletTransactions = {
  data: [
    {
      id: 'adm-wallet-1',
      user_id: 'demo-user-001',
      source: 'direct_income',
      tx_type: 'credit',
      amount: 2250,
      created_at: '2026-03-24T08:30:00.000Z',
      metadata: { note: 'Referral bonus' }
    },
    {
      id: 'adm-wallet-2',
      user_id: 'demo-seller-001',
      source: 'matching_income',
      tx_type: 'credit',
      amount: 4125,
      created_at: '2026-03-23T11:00:00.000Z',
      metadata: { note: 'Binary payout' }
    }
  ],
  pagination: {
    page: 1,
    totalPages: 1
  }
};

export const demoAdminWeeklyCompensation = {
  data: [
    {
      id: 'weekly-demo-1',
      cycle_start: '2026-03-17',
      cycle_end: '2026-03-23',
      total_matched_pv: 18420,
      total_overflow: 1420
    }
  ],
  pagination: {
    page: 1,
    totalPages: 1
  }
};

export const demoAdminWeeklyCompensationDetail = {
  data: {
    users: [{ id: 'demo-user-001' }, { id: 'demo-seller-001' }],
    summary: {
      total_gross_income: 84200,
      total_paid_income: 79100,
      total_flushed_pv: 1420
    }
  }
};

export const demoAdminMonthlyCompensation = {
  data: [
    {
      id: 'monthly-demo-1',
      month_start: '2026-03-01',
      month_end: '2026-03-31',
      qualified_users: 48,
      total_reward_amount: 72000
    }
  ],
  pagination: {
    page: 1,
    totalPages: 1
  }
};

export const demoAdminMonthlyCompensationDetail = {
  data: {
    users: [{ id: 'demo-user-001' }, { id: 'demo-seller-001' }, { id: 'demo-admin-001' }],
    summary: {
      total_monthly_bv: 341100,
      total_monthly_pv: 136440,
      total_reward_amount: 72000
    }
  }
};

export const demoAdminSettings = {
  compensationSettings: {
    matchPercentage: 10,
    directPercentage: 5,
    pvBvRatio: 0.4,
    carryForward: true
  },
  rankMultipliers: [
    { name: 'Bronze', capMultiplier: 2.5 },
    { name: 'Silver', capMultiplier: 3.5 },
    { name: 'Gold', capMultiplier: 5 }
  ],
  rewardSlabs: [
    { thresholdBv: 5000, rewardLabel: 'Mixer Grinder' },
    { thresholdBv: 15000, rewardLabel: 'Smart TV' },
    { thresholdBv: 30000, rewardLabel: 'International Trip' }
  ]
};
