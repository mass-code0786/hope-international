const bcrypt = require('bcryptjs');
const env = require('../config/env');
const { withTransaction, pool } = require('./pool');
const { seedRanks } = require('./seed');

const IDS = {
  users: {
    superAdmin: '11111111-1111-4111-8111-111111111111',
    admin: '22222222-2222-4222-8222-222222222222',
    userA: '33333333-3333-4333-8333-333333333333',
    userB: '44444444-4444-4444-8444-444444444444',
    sellerApplicant: '55555555-5555-4555-8555-555555555555',
    sellerApproved: '66666666-6666-4666-8666-666666666666'
  },
  sellerProfiles: {
    applicant: '77777777-7777-4777-8777-777777777777',
    approved: '88888888-8888-4888-8888-888888888888'
  },
  sellerDocuments: {
    applicantPan: '99999999-9999-4999-8999-999999999991',
    approvedPan: '99999999-9999-4999-8999-999999999992'
  },
  products: {
    adminWellness: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    sellerDigitalApproved: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    sellerPhysicalPending: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    sellerBeautyRejected: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
    adminCourse: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5'
  },
  orders: {
    paidOne: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    paidTwo: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    pendingOne: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3'
  },
  orderItems: {
    paidOneSellerItem: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
    paidOneAdminItem: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2',
    paidTwoSellerItem: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3',
    pendingAdminItem: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc4'
  },
  weeklyCycle: 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
  monthlyCycle: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
  weeklySummaries: {
    admin: 'f1111111-1111-4111-8111-111111111111',
    userA: 'f2222222-2222-4222-8222-222222222222',
    userB: 'f3333333-3333-4333-8333-333333333333'
  },
  monthlySummaries: {
    admin: 'f4444444-4444-4444-8444-444444444444',
    userA: 'f5555555-5555-4555-8555-555555555555',
    userB: 'f6666666-6666-4666-8666-666666666666'
  },
  rewardQualifications: {
    userA: 'abababab-abab-4bab-8bab-ababababab01',
    userB: 'abababab-abab-4bab-8bab-ababababab02'
  },
  walletTransactions: {
    orderDebitA: 'cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcd01',
    orderDebitB: 'cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcd02',
    directIncomeAdmin: 'cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcd03',
    matchingIncomeUserA: 'cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcd04',
    rewardIncomeUserA: 'cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcd05',
    capOverflowUserA: 'cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcd06',
    manualAdjustAdmin: 'cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcd07'
  },
  moderationLogs: {
    approved: 'dededede-dede-4ede-8ede-dedededede01',
    rejected: 'dededede-dede-4ede-8ede-dedededede02'
  },
  sellerEarnings: {
    paidOne: 'efefefef-efef-4fef-8fef-efefefefef01',
    paidTwo: 'efefefef-efef-4fef-8fef-efefefefef02'
  },
  sellerPayouts: {
    processed: '12121212-1212-4212-8212-121212121201',
    pending: '12121212-1212-4212-8212-121212121202'
  },
  sellerActivityLogs: {
    apply: '34343434-3434-4434-8434-343434343401',
    productCreate: '34343434-3434-4434-8434-343434343402'
  }
};

function assertDevSafe() {
  if (env.nodeEnv === 'production') {
    throw new Error('dev seed is blocked in production');
  }
}

async function getRankIds(client) {
  const result = await client.query('SELECT id, name FROM ranks');
  const byName = new Map(result.rows.map((row) => [row.name, row.id]));
  return {
    noRank: byName.get('No Rank'),
    bronze: byName.get('Bronze'),
    silver: byName.get('Silver'),
    gold: byName.get('Gold'),
    diamond: byName.get('Diamond'),
    crown: byName.get('Crown')
  };
}

async function upsertUser(client, payload) {
  const { rows } = await client.query(
    `INSERT INTO users (
      id,
      username,
      email,
      password_hash,
      role,
      sponsor_id,
      parent_id,
      placement_side,
      rank_id,
      is_active,
      left_child_id,
      right_child_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULL, NULL)
    ON CONFLICT (id)
    DO UPDATE SET
      username = EXCLUDED.username,
      email = EXCLUDED.email,
      password_hash = EXCLUDED.password_hash,
      role = EXCLUDED.role,
      sponsor_id = EXCLUDED.sponsor_id,
      parent_id = EXCLUDED.parent_id,
      placement_side = EXCLUDED.placement_side,
      rank_id = EXCLUDED.rank_id,
      is_active = EXCLUDED.is_active,
      left_child_id = NULL,
      right_child_id = NULL
    RETURNING id`,
    [
      payload.id,
      payload.username,
      payload.email,
      payload.passwordHash,
      payload.role,
      payload.sponsorId || null,
      payload.parentId || null,
      payload.placementSide || null,
      payload.rankId,
      payload.isActive ?? true
    ]
  );
  return rows[0];
}

async function upsertWallet(client, userId, balance) {
  await client.query(
    `INSERT INTO wallets (user_id, balance)
     VALUES ($1, $2)
     ON CONFLICT (user_id)
     DO UPDATE SET balance = EXCLUDED.balance`,
    [userId, balance]
  );
}

async function upsertSellerProfile(client, payload) {
  await client.query(
    `INSERT INTO seller_profiles (
      id,
      user_id,
      legal_name,
      business_name,
      business_type,
      tax_id,
      phone,
      email,
      address_line1,
      city,
      state,
      country,
      postal_code,
      kyc_details,
      application_status,
      rejection_reason,
      reviewed_by,
      reviewed_at,
      approved_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    ON CONFLICT (user_id)
    DO UPDATE SET
      legal_name = EXCLUDED.legal_name,
      business_name = EXCLUDED.business_name,
      business_type = EXCLUDED.business_type,
      tax_id = EXCLUDED.tax_id,
      phone = EXCLUDED.phone,
      email = EXCLUDED.email,
      address_line1 = EXCLUDED.address_line1,
      city = EXCLUDED.city,
      state = EXCLUDED.state,
      country = EXCLUDED.country,
      postal_code = EXCLUDED.postal_code,
      kyc_details = EXCLUDED.kyc_details,
      application_status = EXCLUDED.application_status,
      rejection_reason = EXCLUDED.rejection_reason,
      reviewed_by = EXCLUDED.reviewed_by,
      reviewed_at = EXCLUDED.reviewed_at,
      approved_at = EXCLUDED.approved_at`,
    [
      payload.id,
      payload.userId,
      payload.legalName,
      payload.businessName,
      payload.businessType,
      payload.taxId,
      payload.phone,
      payload.email,
      payload.addressLine1,
      payload.city,
      payload.state,
      payload.country,
      payload.postalCode,
      payload.kycDetails,
      payload.applicationStatus,
      payload.rejectionReason || null,
      payload.reviewedBy || null,
      payload.reviewedAt || null,
      payload.approvedAt || null
    ]
  );
}

async function seedDevData() {
  assertDevSafe();
  await seedRanks();

  const passwordHash = await bcrypt.hash('Password@123', 10);

  await withTransaction(async (client) => {
    const rankIds = await getRankIds(client);
    if (!rankIds.noRank || !rankIds.bronze || !rankIds.silver || !rankIds.gold || !rankIds.crown) {
      throw new Error('required ranks are missing; run migrations and seed ranks first');
    }

    await upsertUser(client, {
      id: IDS.users.superAdmin,
      username: 'superadmin',
      email: 'superadmin@hope.local',
      passwordHash,
      role: 'super_admin',
      rankId: rankIds.crown
    });

    await upsertUser(client, {
      id: IDS.users.admin,
      username: 'admin',
      email: 'admin@hope.local',
      passwordHash,
      role: 'admin',
      rankId: rankIds.gold
    });

    await upsertUser(client, {
      id: IDS.users.userA,
      username: 'alice',
      email: 'alice@hope.local',
      passwordHash,
      role: 'user',
      sponsorId: IDS.users.admin,
      parentId: IDS.users.admin,
      placementSide: 'left',
      rankId: rankIds.silver
    });

    await upsertUser(client, {
      id: IDS.users.userB,
      username: 'bob',
      email: 'bob@hope.local',
      passwordHash,
      role: 'user',
      sponsorId: IDS.users.admin,
      parentId: IDS.users.admin,
      placementSide: 'right',
      rankId: rankIds.bronze
    });

    await upsertUser(client, {
      id: IDS.users.sellerApplicant,
      username: 'sellerapplicant',
      email: 'seller.applicant@hope.local',
      passwordHash,
      role: 'user',
      sponsorId: IDS.users.userA,
      parentId: IDS.users.userA,
      placementSide: 'left',
      rankId: rankIds.noRank
    });

    await upsertUser(client, {
      id: IDS.users.sellerApproved,
      username: 'sellerpro',
      email: 'seller.approved@hope.local',
      passwordHash,
      role: 'seller',
      sponsorId: IDS.users.userA,
      parentId: IDS.users.userA,
      placementSide: 'right',
      rankId: rankIds.bronze
    });

    await client.query(
      `UPDATE users
       SET left_child_id = $2, right_child_id = $3
       WHERE id = $1`,
      [IDS.users.admin, IDS.users.userA, IDS.users.userB]
    );
    await client.query(
      `UPDATE users
       SET left_child_id = $2, right_child_id = $3
       WHERE id = $1`,
      [IDS.users.userA, IDS.users.sellerApplicant, IDS.users.sellerApproved]
    );

    await upsertWallet(client, IDS.users.superAdmin, 50000);
    await upsertWallet(client, IDS.users.admin, 18000);
    await upsertWallet(client, IDS.users.userA, 7200);
    await upsertWallet(client, IDS.users.userB, 4300);
    await upsertWallet(client, IDS.users.sellerApplicant, 1500);
    await upsertWallet(client, IDS.users.sellerApproved, 9600);

    await upsertSellerProfile(client, {
      id: IDS.sellerProfiles.applicant,
      userId: IDS.users.sellerApplicant,
      legalName: 'Rohan Applicant',
      businessName: 'Applicant Ventures',
      businessType: 'Proprietorship',
      taxId: 'APPL-TAX-001',
      phone: '+91-9000000001',
      email: 'seller.applicant@hope.local',
      addressLine1: '12 Market Street',
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      postalCode: '411001',
      kycDetails: { pan: 'ABCDE1234F', gst: '27ABCDE1234F1Z5' },
      applicationStatus: 'pending'
    });

    await upsertSellerProfile(client, {
      id: IDS.sellerProfiles.approved,
      userId: IDS.users.sellerApproved,
      legalName: 'Sneha Seller',
      businessName: 'Seller Pro Commerce',
      businessType: 'LLP',
      taxId: 'SELL-TAX-777',
      phone: '+91-9000000002',
      email: 'seller.approved@hope.local',
      addressLine1: '88 Business Park',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      postalCode: '560001',
      kycDetails: { pan: 'PQRSX9876K', gst: '29PQRSX9876K1Z3' },
      applicationStatus: 'approved',
      reviewedBy: IDS.users.admin,
      reviewedAt: '2026-03-10T10:30:00.000Z',
      approvedAt: '2026-03-10T10:30:00.000Z'
    });

    await client.query(
      `INSERT INTO seller_documents (
        id,
        seller_profile_id,
        document_type,
        document_number,
        document_url,
        verification_status,
        notes,
        file_name,
        mime_type,
        file_size_bytes,
        uploaded_by
      )
      VALUES
        ($1, $2, 'PAN', 'ABCDE1234F', 'private://seller-documents/applicant/pan.pdf', 'submitted', 'Pending review', 'applicant-pan.pdf', 'application/pdf', 280123, $3),
        ($4, $5, 'PAN', 'PQRSX9876K', 'private://seller-documents/approved/pan.pdf', 'verified', 'Verified by admin', 'approved-pan.pdf', 'application/pdf', 310450, $6)
      ON CONFLICT (id)
      DO UPDATE SET
        verification_status = EXCLUDED.verification_status,
        notes = EXCLUDED.notes,
        document_url = EXCLUDED.document_url,
        file_name = EXCLUDED.file_name,
        mime_type = EXCLUDED.mime_type,
        file_size_bytes = EXCLUDED.file_size_bytes,
        uploaded_by = EXCLUDED.uploaded_by,
        deleted_at = NULL`,
      [
        IDS.sellerDocuments.applicantPan,
        IDS.sellerProfiles.applicant,
        IDS.users.sellerApplicant,
        IDS.sellerDocuments.approvedPan,
        IDS.sellerProfiles.approved,
        IDS.users.sellerApproved
      ]
    );

    await client.query(
      `INSERT INTO products (
        id,
        sku,
        name,
        description,
        category,
        price,
        pv,
        bv,
        is_active,
        is_qualifying,
        seller_profile_id,
        moderation_status,
        moderation_notes,
        moderated_by,
        moderated_at
      )
      VALUES
        ($1, 'ADM-WELL-001', 'Hope Wellness Combo', 'Admin curated wellness combo', 'Health', 120.00, 40.00, 100.00, true, true, NULL, 'approved', 'Internal product', $6, NOW()),
        ($2, 'SEL-DIGI-001', 'Seller Premium Course', 'Digital growth program from approved seller', 'Courses', 300.00, 100.00, 250.00, true, true, $7, 'approved', 'Approved for marketplace', $6, NOW()),
        ($3, 'SEL-PHYS-001', 'Seller Nutrition Pack', 'Physical nutrition bundle', 'Physical', 180.00, 60.00, 150.00, false, true, $7, 'pending', 'Awaiting compliance check', NULL, NULL),
        ($4, 'SEL-BEAU-001', 'Seller Beauty Kit', 'Beauty starter collection', 'Beauty', 95.00, 32.00, 80.00, false, false, $7, 'rejected', 'Packaging label mismatch', $6, NOW()),
        ($5, 'ADM-COURSE-001', 'Hope Leadership Masterclass', 'Leadership and network strategy course', 'Digital', 650.00, 200.00, 500.00, true, true, NULL, 'approved', 'Internal product', $6, NOW())
      ON CONFLICT (id)
      DO UPDATE SET
        sku = EXCLUDED.sku,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        price = EXCLUDED.price,
        pv = EXCLUDED.pv,
        bv = EXCLUDED.bv,
        is_active = EXCLUDED.is_active,
        is_qualifying = EXCLUDED.is_qualifying,
        seller_profile_id = EXCLUDED.seller_profile_id,
        moderation_status = EXCLUDED.moderation_status,
        moderation_notes = EXCLUDED.moderation_notes,
        moderated_by = EXCLUDED.moderated_by,
        moderated_at = EXCLUDED.moderated_at`,
      [
        IDS.products.adminWellness,
        IDS.products.sellerDigitalApproved,
        IDS.products.sellerPhysicalPending,
        IDS.products.sellerBeautyRejected,
        IDS.products.adminCourse,
        IDS.users.admin,
        IDS.sellerProfiles.approved
      ]
    );

    await client.query(
      `INSERT INTO orders (
        id,
        user_id,
        status,
        total_amount,
        total_pv,
        total_bv,
        created_at,
        replacement_window_ends_at,
        settlement_status,
        settled_at,
        settlement_processed_at,
        settlement_notes
      )
      VALUES
        ($1, $4, 'paid', 420.00, 140.00, 350.00, '2026-03-18T09:00:00.000Z', '2026-03-21T09:00:00.000Z', 'settled', '2026-03-21T10:00:00.000Z', '2026-03-21T10:00:00.000Z', 'Settled in dev seed'),
        ($2, $5, 'paid', 600.00, 200.00, 500.00, '2026-03-19T11:30:00.000Z', '2026-03-22T11:30:00.000Z', 'settled', '2026-03-22T12:00:00.000Z', '2026-03-22T12:00:00.000Z', 'Settled in dev seed'),
        ($3, $6, 'pending', 120.00, 40.00, 100.00, '2026-03-20T13:15:00.000Z', '2026-03-23T13:15:00.000Z', 'pending', NULL, NULL, 'Awaiting replacement window')
      ON CONFLICT (id)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        status = EXCLUDED.status,
        total_amount = EXCLUDED.total_amount,
        total_pv = EXCLUDED.total_pv,
        total_bv = EXCLUDED.total_bv,
        created_at = EXCLUDED.created_at,
        replacement_window_ends_at = EXCLUDED.replacement_window_ends_at,
        settlement_status = EXCLUDED.settlement_status,
        settled_at = EXCLUDED.settled_at,
        settlement_processed_at = EXCLUDED.settlement_processed_at,
        settlement_notes = EXCLUDED.settlement_notes`,
      [IDS.orders.paidOne, IDS.orders.paidTwo, IDS.orders.pendingOne, IDS.users.userA, IDS.users.userB, IDS.users.sellerApplicant]
    );

    await client.query(
      `INSERT INTO order_items (id, order_id, product_id, quantity, price, pv, bv, line_total)
      VALUES
        ($1, $5, $9, 1, 300.00, 100.00, 250.00, 300.00),
        ($2, $5, $8, 1, 120.00, 40.00, 100.00, 120.00),
        ($3, $6, $9, 2, 300.00, 100.00, 250.00, 600.00),
        ($4, $7, $8, 1, 120.00, 40.00, 100.00, 120.00)
      ON CONFLICT (id)
      DO UPDATE SET
        order_id = EXCLUDED.order_id,
        product_id = EXCLUDED.product_id,
        quantity = EXCLUDED.quantity,
        price = EXCLUDED.price,
        pv = EXCLUDED.pv,
        bv = EXCLUDED.bv,
        line_total = EXCLUDED.line_total`,
      [
        IDS.orderItems.paidOneSellerItem,
        IDS.orderItems.paidOneAdminItem,
        IDS.orderItems.paidTwoSellerItem,
        IDS.orderItems.pendingAdminItem,
        IDS.orders.paidOne,
        IDS.orders.paidTwo,
        IDS.orders.pendingOne,
        IDS.products.adminWellness,
        IDS.products.sellerDigitalApproved
      ]
    );

    await client.query(
      `INSERT INTO wallet_transactions (id, user_id, tx_type, source, amount, reference_id, metadata, created_by_admin_id, created_at)
      VALUES
        ($1, $8, 'debit', 'order_purchase', 420.00, $10, '{"orderLabel":"Order #1"}'::jsonb, NULL, '2026-03-18T09:10:00.000Z'),
        ($2, $9, 'debit', 'order_purchase', 600.00, $11, '{"orderLabel":"Order #2"}'::jsonb, NULL, '2026-03-19T11:40:00.000Z'),
        ($3, $7, 'credit', 'direct_income', 17.50, $10, '{"fromUser":"alice","qualifyingBv":350}'::jsonb, NULL, '2026-03-18T09:20:00.000Z'),
        ($4, $8, 'credit', 'matching_income', 120.00, $12, '{"cycle":"weekly"}'::jsonb, NULL, '2026-03-22T08:00:00.000Z'),
        ($5, $8, 'credit', 'reward_qualification', 250.00, $13, '{"rewardLabel":"250 Cash Reward"}'::jsonb, NULL, '2026-03-23T09:30:00.000Z'),
        ($6, $8, 'credit', 'cap_overflow', 30.00, $12, '{"reason":"cap trace entry"}'::jsonb, NULL, '2026-03-22T08:05:00.000Z'),
        ($7, $7, 'debit', 'manual_adjustment', 50.00, NULL, '{"reason":"QA adjustment"}'::jsonb, $14, '2026-03-24T10:00:00.000Z')
      ON CONFLICT (id)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        tx_type = EXCLUDED.tx_type,
        source = EXCLUDED.source,
        amount = EXCLUDED.amount,
        reference_id = EXCLUDED.reference_id,
        metadata = EXCLUDED.metadata,
        created_by_admin_id = EXCLUDED.created_by_admin_id,
        created_at = EXCLUDED.created_at`,
      [
        IDS.walletTransactions.orderDebitA,
        IDS.walletTransactions.orderDebitB,
        IDS.walletTransactions.directIncomeAdmin,
        IDS.walletTransactions.matchingIncomeUserA,
        IDS.walletTransactions.rewardIncomeUserA,
        IDS.walletTransactions.capOverflowUserA,
        IDS.walletTransactions.manualAdjustAdmin,
        IDS.users.userA,
        IDS.users.userB,
        IDS.orders.paidOne,
        IDS.orders.paidTwo,
        IDS.weeklyCycle,
        IDS.monthlyCycle,
        IDS.users.superAdmin
      ]
    );

    await client.query(
      `INSERT INTO weekly_cycles (id, cycle_start, cycle_end, closed_at, notes)
      VALUES ($1, '2026-03-16', '2026-03-22', '2026-03-22T08:00:00.000Z', 'Dev seed weekly cycle')
      ON CONFLICT (id)
      DO UPDATE SET
        cycle_start = EXCLUDED.cycle_start,
        cycle_end = EXCLUDED.cycle_end,
        closed_at = EXCLUDED.closed_at,
        notes = EXCLUDED.notes`,
      [IDS.weeklyCycle]
    );

    await client.query(
      `INSERT INTO weekly_user_summaries (
        id,
        cycle_id,
        user_id,
        rank_id,
        self_pv,
        left_pv,
        right_pv,
        matched_pv,
        matching_income_gross,
        cap_multiplier,
        cap_limit,
        matching_income_net,
        capped_overflow,
        flushed_left_pv,
        flushed_right_pv,
        direct_income
      )
      VALUES
        ($1, $4, $7, $10, 40, 140, 200, 140, 14, 6, 240, 14, 0, 0, 60, 17.5),
        ($2, $4, $8, $11, 140, 200, 180, 180, 18, 5, 700, 18, 0, 20, 0, 0),
        ($3, $4, $9, $12, 200, 100, 200, 100, 10, 4, 800, 10, 0, 0, 100, 0)
      ON CONFLICT (id)
      DO UPDATE SET
        cycle_id = EXCLUDED.cycle_id,
        user_id = EXCLUDED.user_id,
        rank_id = EXCLUDED.rank_id,
        self_pv = EXCLUDED.self_pv,
        left_pv = EXCLUDED.left_pv,
        right_pv = EXCLUDED.right_pv,
        matched_pv = EXCLUDED.matched_pv,
        matching_income_gross = EXCLUDED.matching_income_gross,
        cap_multiplier = EXCLUDED.cap_multiplier,
        cap_limit = EXCLUDED.cap_limit,
        matching_income_net = EXCLUDED.matching_income_net,
        capped_overflow = EXCLUDED.capped_overflow,
        flushed_left_pv = EXCLUDED.flushed_left_pv,
        flushed_right_pv = EXCLUDED.flushed_right_pv,
        direct_income = EXCLUDED.direct_income`,
      [
        IDS.weeklySummaries.admin,
        IDS.weeklySummaries.userA,
        IDS.weeklySummaries.userB,
        IDS.weeklyCycle,
        IDS.users.admin,
        IDS.users.userA,
        IDS.users.userB,
        rankIds.gold,
        rankIds.silver,
        rankIds.bronze
      ]
    );

    await client.query(
      `INSERT INTO monthly_cycles (id, month_start, month_end, calculated_at, notes)
      VALUES ($1, '2026-03-01', '2026-03-31', '2026-03-23T09:00:00.000Z', 'Dev seed monthly cycle')
      ON CONFLICT (id)
      DO UPDATE SET
        month_start = EXCLUDED.month_start,
        month_end = EXCLUDED.month_end,
        calculated_at = EXCLUDED.calculated_at,
        notes = EXCLUDED.notes`,
      [IDS.monthlyCycle]
    );

    await client.query(
      `INSERT INTO monthly_user_summaries (
        id,
        cycle_id,
        user_id,
        monthly_bv,
        monthly_pv,
        direct_income,
        matching_income,
        reward_amount,
        reward_label,
        qualified
      )
      VALUES
        ($1, $4, $6, 4500, 1800, 35, 50, 0, NULL, false),
        ($2, $4, $7, 5200, 2080, 22, 120, 250, '250 Cash Reward', true),
        ($3, $4, $8, 2200, 880, 0, 40, 100, '100 Cash Reward', true)
      ON CONFLICT (id)
      DO UPDATE SET
        cycle_id = EXCLUDED.cycle_id,
        user_id = EXCLUDED.user_id,
        monthly_bv = EXCLUDED.monthly_bv,
        monthly_pv = EXCLUDED.monthly_pv,
        direct_income = EXCLUDED.direct_income,
        matching_income = EXCLUDED.matching_income,
        reward_amount = EXCLUDED.reward_amount,
        reward_label = EXCLUDED.reward_label,
        qualified = EXCLUDED.qualified`,
      [
        IDS.monthlySummaries.admin,
        IDS.monthlySummaries.userA,
        IDS.monthlySummaries.userB,
        IDS.monthlyCycle,
        IDS.users.admin,
        IDS.users.userA,
        IDS.users.userB
      ]
    );

    await client.query(
      `INSERT INTO monthly_reward_qualifications (
        id,
        cycle_id,
        user_id,
        monthly_bv,
        threshold_bv,
        reward_amount,
        reward_label,
        status,
        reward_level,
        reward_extra,
        processed_at,
        processed_by,
        updated_at
      )
      VALUES
        ($1, $3, $5, 5200, 5000, 250, '250 Cash Reward', 'processed', 'Silver Reward', NULL, '2026-03-23T10:00:00.000Z', $7, NOW()),
        ($2, $3, $6, 2200, 2000, 100, '100 Cash Reward', 'pending', 'Bronze Reward', NULL, NULL, NULL, NOW())
      ON CONFLICT (id)
      DO UPDATE SET
        cycle_id = EXCLUDED.cycle_id,
        user_id = EXCLUDED.user_id,
        monthly_bv = EXCLUDED.monthly_bv,
        threshold_bv = EXCLUDED.threshold_bv,
        reward_amount = EXCLUDED.reward_amount,
        reward_label = EXCLUDED.reward_label,
        status = EXCLUDED.status,
        reward_level = EXCLUDED.reward_level,
        reward_extra = EXCLUDED.reward_extra,
        processed_at = EXCLUDED.processed_at,
        processed_by = EXCLUDED.processed_by,
        updated_at = NOW()`,
      [
        IDS.rewardQualifications.userA,
        IDS.rewardQualifications.userB,
        IDS.monthlyCycle,
        IDS.users.userA,
        IDS.users.userB,
        IDS.users.admin
      ]
    );

    await client.query(
      `INSERT INTO seller_product_moderation_logs (
        id,
        product_id,
        seller_profile_id,
        admin_user_id,
        previous_status,
        next_status,
        notes
      )
      VALUES
        ($1, $3, $5, $6, 'pending', 'approved', 'Meets seller quality standards'),
        ($2, $4, $5, $6, 'pending', 'rejected', 'Labeling issue on package')
      ON CONFLICT (id)
      DO UPDATE SET
        product_id = EXCLUDED.product_id,
        seller_profile_id = EXCLUDED.seller_profile_id,
        admin_user_id = EXCLUDED.admin_user_id,
        previous_status = EXCLUDED.previous_status,
        next_status = EXCLUDED.next_status,
        notes = EXCLUDED.notes`,
      [
        IDS.moderationLogs.approved,
        IDS.moderationLogs.rejected,
        IDS.products.sellerDigitalApproved,
        IDS.products.sellerBeautyRejected,
        IDS.sellerProfiles.approved,
        IDS.users.admin
      ]
    );

    await client.query(
      `INSERT INTO seller_earnings_ledger (
        id,
        seller_profile_id,
        seller_user_id,
        order_id,
        order_item_id,
        source_type,
        gross_amount,
        net_earning_amount,
        commission_rate,
        platform_margin_amount,
        bv,
        pv,
        earning_status,
        metadata
      )
      VALUES
        ($1, $3, $4, $5, $7, 'order_sale', 300.00, 150.00, 0.50, 150.00, 250.00, 100.00, 'finalized', '{"orderLabel":"Order #1"}'::jsonb),
        ($2, $3, $4, $6, $8, 'order_sale', 600.00, 300.00, 0.50, 300.00, 500.00, 200.00, 'pending', '{"orderLabel":"Order #2"}'::jsonb)
      ON CONFLICT (id)
      DO UPDATE SET
        seller_profile_id = EXCLUDED.seller_profile_id,
        seller_user_id = EXCLUDED.seller_user_id,
        order_id = EXCLUDED.order_id,
        order_item_id = EXCLUDED.order_item_id,
        source_type = EXCLUDED.source_type,
        gross_amount = EXCLUDED.gross_amount,
        net_earning_amount = EXCLUDED.net_earning_amount,
        commission_rate = EXCLUDED.commission_rate,
        platform_margin_amount = EXCLUDED.platform_margin_amount,
        bv = EXCLUDED.bv,
        pv = EXCLUDED.pv,
        earning_status = EXCLUDED.earning_status,
        metadata = EXCLUDED.metadata`,
      [
        IDS.sellerEarnings.paidOne,
        IDS.sellerEarnings.paidTwo,
        IDS.sellerProfiles.approved,
        IDS.users.sellerApproved,
        IDS.orders.paidOne,
        IDS.orders.paidTwo,
        IDS.orderItems.paidOneSellerItem,
        IDS.orderItems.paidTwoSellerItem
      ]
    );

    await client.query(
      `INSERT INTO seller_payouts (
        id,
        seller_profile_id,
        seller_user_id,
        period_start,
        period_end,
        gross_amount,
        deductions_amount,
        net_amount,
        payout_status,
        payout_reference,
        notes,
        metadata,
        processed_by,
        processed_at
      )
      VALUES
        ($1, $3, $4, '2026-03-01', '2026-03-15', 300.00, 15.00, 285.00, 'processed', 'PAYOUT-20260315-01', 'Processed in dev seed', '{"batch":"march-1"}'::jsonb, $5, '2026-03-16T09:00:00.000Z'),
        ($2, $3, $4, '2026-03-16', '2026-03-31', 600.00, 30.00, 570.00, 'pending', NULL, 'Awaiting payout run', '{"batch":"march-2"}'::jsonb, NULL, NULL)
      ON CONFLICT (id)
      DO UPDATE SET
        seller_profile_id = EXCLUDED.seller_profile_id,
        seller_user_id = EXCLUDED.seller_user_id,
        period_start = EXCLUDED.period_start,
        period_end = EXCLUDED.period_end,
        gross_amount = EXCLUDED.gross_amount,
        deductions_amount = EXCLUDED.deductions_amount,
        net_amount = EXCLUDED.net_amount,
        payout_status = EXCLUDED.payout_status,
        payout_reference = EXCLUDED.payout_reference,
        notes = EXCLUDED.notes,
        metadata = EXCLUDED.metadata,
        processed_by = EXCLUDED.processed_by,
        processed_at = EXCLUDED.processed_at`,
      [
        IDS.sellerPayouts.processed,
        IDS.sellerPayouts.pending,
        IDS.sellerProfiles.approved,
        IDS.users.sellerApproved,
        IDS.users.admin
      ]
    );

    await client.query(
      `INSERT INTO seller_activity_logs (
        id,
        actor_user_id,
        seller_profile_id,
        action_type,
        target_entity,
        target_id,
        metadata,
        created_at
      )
      VALUES
        ($1, $3, $5, 'seller.application.submit', 'seller_profile', $5::text, '{"seed":"true"}'::jsonb, '2026-03-09T12:00:00.000Z'),
        ($2, $4, $6, 'seller.product.create', 'product', $7::text, '{"seed":"true"}'::jsonb, '2026-03-11T14:00:00.000Z')
      ON CONFLICT (id)
      DO UPDATE SET
        actor_user_id = EXCLUDED.actor_user_id,
        seller_profile_id = EXCLUDED.seller_profile_id,
        action_type = EXCLUDED.action_type,
        target_entity = EXCLUDED.target_entity,
        target_id = EXCLUDED.target_id,
        metadata = EXCLUDED.metadata,
        created_at = EXCLUDED.created_at`,
      [
        IDS.sellerActivityLogs.apply,
        IDS.sellerActivityLogs.productCreate,
        IDS.users.sellerApplicant,
        IDS.users.sellerApproved,
        IDS.sellerProfiles.applicant,
        IDS.sellerProfiles.approved,
        IDS.products.sellerDigitalApproved
      ]
    );
  });
}

module.exports = {
  seedDevData,
  IDS
};

if (require.main === module) {
  seedDevData()
    .then(() => {
      console.log('Dev seed completed successfully.');
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await pool.end();
    });
}
