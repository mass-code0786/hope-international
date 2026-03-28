function q(client) {
  return client || require('../db/pool').pool;
}

function coerceJsonArray(value) {
  return Array.isArray(value) ? value : [];
}

async function getTableColumns(client, tableName) {
  const { rows } = await q(client).query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return new Set(rows.map((row) => row.column_name));
}

function normalizeAuctionRow(row) {
  if (!row) return null;
  return {
    ...row,
    gallery: coerceJsonArray(row.gallery),
    specifications: coerceJsonArray(row.specifications)
  };
}

function buildAuctionStatusCase(nowPlaceholder) {
  return `
    CASE
      WHEN a.status = 'cancelled' OR a.cancelled_at IS NOT NULL THEN 'cancelled'
      WHEN a.status = 'ended' OR a.closed_at IS NOT NULL OR a.end_at <= ${nowPlaceholder} OR a.total_entries >= a.hidden_capacity THEN 'ended'
      WHEN a.is_active = true AND a.start_at <= ${nowPlaceholder} AND a.end_at > ${nowPlaceholder} THEN 'live'
      ELSE 'upcoming'
    END
  `;
}

function buildAuctionSelect(nowPlaceholder) {
  const statusCase = buildAuctionStatusCase(nowPlaceholder);
  return `
    SELECT
      a.*,
      ${statusCase} AS computed_status,
      a.entry_price::numeric(14,2) AS display_current_bid,
      a.total_entries,
      winner.username AS winner_username,
      winner.email AS winner_email,
      creator.username AS created_by_username,
      updater.username AS updated_by_username,
      p.name AS product_name,
      p.sku AS product_sku,
      p.price AS product_price,
      p.description AS product_description,
      p.is_active AS product_is_active
    FROM auctions a
    LEFT JOIN users winner ON winner.id = a.winner_user_id
    LEFT JOIN users creator ON creator.id = a.created_by
    LEFT JOIN users updater ON updater.id = a.updated_by
    LEFT JOIN products p ON p.id = a.product_id
  `;
}

async function attachWinnerRows(client, auctions) {
  if (!auctions.length) return auctions;
  const ids = auctions.map((auction) => auction.id);
  const { rows } = await q(client).query(
    `SELECT aw.*, u.username, u.email
     FROM auction_winners aw
     JOIN users u ON u.id = aw.user_id
     WHERE aw.auction_id = ANY($1::uuid[])
     ORDER BY aw.created_at ASC`,
    [ids]
  );

  const grouped = new Map();
  rows.forEach((row) => {
    const current = grouped.get(row.auction_id) || [];
    current.push(row);
    grouped.set(row.auction_id, current);
  });

  return auctions.map((auction) => ({
    ...auction,
    winners: grouped.get(auction.id) || []
  }));
}

async function listAuctions(client, filters, pagination) {
  const values = [filters.now || new Date().toISOString()];
  const statusCase = buildAuctionStatusCase('$1');
  const where = [];

  if (filters.status && filters.status !== 'all') {
    values.push(filters.status);
    where.push(`${statusCase} = $${values.length}`);
  }

  if (filters.search) {
    values.push(`%${filters.search}%`);
    where.push(`(
      a.title ILIKE $${values.length}
      OR COALESCE(a.short_description, '') ILIKE $${values.length}
      OR COALESCE(p.name, '') ILIKE $${values.length}
      OR COALESCE(p.sku, '') ILIKE $${values.length}
    )`);
  }

  if (filters.onlyActive === true) {
    where.push(`a.is_active = true`);
    where.push(`a.status <> 'cancelled'`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const sortSql = `ORDER BY
    CASE ${statusCase}
      WHEN 'live' THEN 0
      WHEN 'upcoming' THEN 1
      WHEN 'ended' THEN 2
      ELSE 3
    END,
    CASE WHEN ${statusCase} = 'upcoming' THEN a.start_at END ASC,
    CASE WHEN ${statusCase} = 'live' THEN a.created_at END DESC,
    CASE WHEN ${statusCase} = 'ended' THEN a.closed_at END DESC NULLS LAST,
    a.created_at DESC`;

  const listValues = [...values, pagination.limit, pagination.offset];
  const { rows } = await q(client).query(
    `${buildAuctionSelect('$1')}
     ${whereSql}
     ${sortSql}
     LIMIT $${listValues.length - 1} OFFSET $${listValues.length}`,
    listValues
  );

  const countResult = await q(client).query(
    `SELECT COUNT(*)
     FROM auctions a
     LEFT JOIN products p ON p.id = a.product_id
     ${whereSql}`,
    values
  );

  return {
    items: await attachWinnerRows(client, rows.map(normalizeAuctionRow)),
    total: Number(countResult.rows[0]?.count || 0)
  };
}

async function getAuctionById(client, auctionId, options = {}) {
  const now = options.now || new Date().toISOString();
  const { rows } = await q(client).query(
    `${buildAuctionSelect('$2')}
     WHERE a.id = $1`,
    [auctionId, now]
  );

  const auction = normalizeAuctionRow(rows[0]);
  if (!auction) return null;

  const withWinners = await attachWinnerRows(client, [auction]);
  return withWinners[0] || null;
}

async function getAuctionForUpdate(client, auctionId) {
  const { rows } = await q(client).query(
    `SELECT * FROM auctions WHERE id = $1 FOR UPDATE`,
    [auctionId]
  );
  return normalizeAuctionRow(rows[0] || null);
}

async function createAuction(client, payload) {
  const columns = await getTableColumns(client, 'auctions');
  const fieldNames = [];
  const values = [];

  function addField(column, value) {
    if (!columns.has(column)) return;
    fieldNames.push(column);
    values.push(value);
  }

  addField('product_id', payload.productId || null);
  addField('title', payload.title);
  addField('short_description', payload.shortDescription || null);
  addField('description', payload.description || null);
  addField('specifications', JSON.stringify(coerceJsonArray(payload.specifications)));
  addField('image_url', payload.imageUrl || null);
  addField('gallery', JSON.stringify(coerceJsonArray(payload.gallery)));
  addField('starting_price', payload.startingPrice);
  addField('min_bid_increment', payload.minBidIncrement);
  addField('current_bid', payload.currentBid);
  addField('entry_price', payload.entryPrice);
  addField('hidden_capacity', payload.hiddenCapacity);
  addField('stock_quantity', payload.stockQuantity);
  addField('reward_mode', payload.rewardMode);
  addField('reward_value', payload.rewardValue || null);
  addField('total_entries', payload.totalEntries || 0);
  addField('has_tie', payload.hasTie ?? false);
  addField('winner_count', payload.winnerCount || 0);
  addField('start_at', payload.startAt);
  addField('end_at', payload.endAt);
  addField('status', payload.status);
  addField('is_active', payload.isActive ?? true);
  addField('created_by', payload.createdBy || null);
  addField('updated_by', payload.updatedBy || null);

  const placeholders = fieldNames.map((_, index) => `${index + 1}`).join(', ');
  const { rows } = await q(client).query(
    `INSERT INTO auctions (${fieldNames.join(', ')}) VALUES (${placeholders}) RETURNING *`,
    values
  );

  return {
    ...normalizeAuctionRow(rows[0]),
    winners: []
  };
}

async function updateAuction(client, auctionId, payload) {
  const { rows } = await q(client).query(
    `UPDATE auctions
     SET product_id = $2,
         title = $3,
         short_description = $4,
         description = $5,
         specifications = $6,
         image_url = $7,
         gallery = $8,
         starting_price = $9,
         min_bid_increment = $10,
         current_bid = $11,
         entry_price = $12,
         hidden_capacity = $13,
         stock_quantity = $14,
         reward_mode = $15,
         reward_value = $16,
         total_entries = $17,
         has_tie = $18,
         winner_count = $19,
         start_at = $20,
         end_at = $21,
         status = $22,
         is_active = $23,
         cancelled_at = $24,
         closed_at = $25,
         close_reason = $26,
         winner_user_id = $27,
         winning_bid_id = $28,
         total_bids = $29,
         updated_by = $30
     WHERE id = $1
     RETURNING *`,
    [
      auctionId,
      payload.productId || null,
      payload.title,
      payload.shortDescription || null,
      payload.description || null,
      JSON.stringify(coerceJsonArray(payload.specifications)),
      payload.imageUrl || null,
      JSON.stringify(coerceJsonArray(payload.gallery)),
      payload.startingPrice,
      payload.minBidIncrement,
      payload.currentBid,
      payload.entryPrice,
      payload.hiddenCapacity,
      payload.stockQuantity,
      payload.rewardMode,
      payload.rewardValue || null,
      payload.totalEntries || 0,
      payload.hasTie ?? false,
      payload.winnerCount || 0,
      payload.startAt,
      payload.endAt,
      payload.status,
      payload.isActive ?? true,
      payload.cancelledAt || null,
      payload.closedAt || null,
      payload.closeReason || null,
      payload.winnerUserId || null,
      payload.winningBidId || null,
      payload.totalBids || 0,
      payload.updatedBy || null
    ]
  );

  const auction = normalizeAuctionRow(rows[0] || null);
  if (!auction) return null;
  const withWinners = await attachWinnerRows(client, [auction]);
  return withWinners[0] || null;
}

async function createBid(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO auction_bids (auction_id, user_id, amount, entry_count, total_amount)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [payload.auctionId, payload.userId, payload.entryPrice, payload.entryCount, payload.totalAmount]
  );
  return rows[0];
}

async function upsertParticipant(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO auction_participants (auction_id, user_id, joined_at, last_bid_at, total_bids, total_entries, highest_bid)
     VALUES ($1, $2, NOW(), NOW(), 1, $3, $4)
     ON CONFLICT (auction_id, user_id)
     DO UPDATE SET
       last_bid_at = NOW(),
       total_bids = auction_participants.total_bids + 1,
       total_entries = auction_participants.total_entries + EXCLUDED.total_entries,
       highest_bid = GREATEST(auction_participants.highest_bid, EXCLUDED.highest_bid)
     RETURNING *`,
    [payload.auctionId, payload.userId, payload.entryCount, payload.totalAmount]
  );
  return rows[0];
}

async function listAuctionBids(client, auctionId, limit = 50) {
  const { rows } = await q(client).query(
    `SELECT
      b.*,
      u.username,
      u.email
     FROM auction_bids b
     JOIN users u ON u.id = b.user_id
     WHERE b.auction_id = $1
     ORDER BY b.created_at DESC
     LIMIT $2`,
    [auctionId, limit]
  );
  return rows;
}

async function listAuctionParticipants(client, auctionId) {
  const { rows } = await q(client).query(
    `SELECT
      p.*,
      u.username,
      u.email
     FROM auction_participants p
     JOIN users u ON u.id = p.user_id
     WHERE p.auction_id = $1
     ORDER BY p.total_entries DESC, p.last_bid_at ASC NULLS LAST`,
    [auctionId]
  );
  return rows;
}

async function getHighestBid(client, auctionId) {
  const { rows } = await q(client).query(
    `SELECT *
     FROM auction_bids
     WHERE auction_id = $1
     ORDER BY entry_count DESC, created_at ASC
     LIMIT 1`,
    [auctionId]
  );
  return rows[0] || null;
}

async function getTopParticipants(client, auctionId) {
  const { rows } = await q(client).query(
    `WITH ranked AS (
      SELECT p.*, MAX(p.total_entries) OVER () AS max_entries
      FROM auction_participants p
      WHERE p.auction_id = $1
    )
     SELECT ranked.*, u.username, u.email
     FROM ranked
     JOIN users u ON u.id = ranked.user_id
     WHERE ranked.total_entries = ranked.max_entries
       AND ranked.max_entries > 0
     ORDER BY ranked.last_bid_at ASC NULLS LAST, ranked.joined_at ASC`,
    [auctionId]
  );
  return rows;
}

async function replaceAuctionWinners(client, auctionId, winners) {
  await q(client).query('DELETE FROM auction_winners WHERE auction_id = $1', [auctionId]);
  if (!winners.length) return [];

  const inserted = [];
  for (const winner of winners) {
    const { rows } = await q(client).query(
      `INSERT INTO auction_winners (auction_id, user_id, winning_entry_count, allocation_ratio, allocation_quantity, reward_mode)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        auctionId,
        winner.userId,
        winner.winningEntryCount,
        winner.allocationRatio,
        winner.allocationQuantity || null,
        winner.rewardMode
      ]
    );
    inserted.push(rows[0]);
  }
  return inserted;
}

async function listAuctionWinners(client, auctionId) {
  const { rows } = await q(client).query(
    `SELECT aw.*, u.username, u.email
     FROM auction_winners aw
     JOIN users u ON u.id = aw.user_id
     WHERE aw.auction_id = $1
     ORDER BY aw.created_at ASC`,
    [auctionId]
  );
  return rows;
}

async function getUserBidStats(client, userId) {
  const { rows } = await q(client).query(
    `SELECT
      COALESCE((SELECT COUNT(*) FROM auction_bids WHERE user_id = $1), 0)::int AS my_bids,
      COALESCE((SELECT COUNT(*) FROM auction_participants WHERE user_id = $1), 0)::int AS auctions_joined,
      COALESCE((SELECT COUNT(*) FROM auction_winners WHERE user_id = $1), 0)::int AS won_auctions,
      COALESCE((SELECT COUNT(*) FROM auctions a WHERE EXISTS (SELECT 1 FROM auction_bids b WHERE b.auction_id = a.id AND b.user_id = $1) AND a.status IN ('ended', 'cancelled')), 0)::int AS auction_history`,
    [userId]
  );
  return rows[0] || null;
}

async function listUserAuctionHistory(client, userId, filters, pagination) {
  const values = [userId, filters.now || new Date().toISOString()];
  const statusCase = buildAuctionStatusCase('$2');
  const where = [`EXISTS (SELECT 1 FROM auction_bids ub WHERE ub.auction_id = a.id AND ub.user_id = $1)`];

  if (filters.kind === 'wins') {
    where.push(`EXISTS (SELECT 1 FROM auction_winners aw WHERE aw.auction_id = a.id AND aw.user_id = $1)`);
  } else if (filters.kind === 'joined') {
    where.push(`EXISTS (SELECT 1 FROM auction_participants ap WHERE ap.auction_id = a.id AND ap.user_id = $1)`);
  } else if (filters.kind === 'history') {
    where.push(`${statusCase} IN ('ended', 'cancelled')`);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;
  const listValues = [...values, pagination.limit, pagination.offset];

  const { rows } = await q(client).query(
    `SELECT
      a.*,
      ${statusCase} AS computed_status,
      a.entry_price::numeric(14,2) AS display_current_bid,
      winner.username AS winner_username,
      winner.email AS winner_email,
      creator.username AS created_by_username,
      updater.username AS updated_by_username,
      p.name AS product_name,
      p.sku AS product_sku,
      p.price AS product_price,
      p.description AS product_description,
      p.is_active AS product_is_active,
      EXISTS (SELECT 1 FROM auction_winners aw WHERE aw.auction_id = a.id AND aw.user_id = $1) AS is_winner,
      (
        SELECT COALESCE(SUM(entry_count), 0)
        FROM auction_bids ub
        WHERE ub.auction_id = a.id
          AND ub.user_id = $1
      ) AS my_entry_count,
      (
        SELECT COALESCE(SUM(total_amount), 0)
        FROM auction_bids ub
        WHERE ub.auction_id = a.id
          AND ub.user_id = $1
      ) AS my_total_spend
     FROM auctions a
     LEFT JOIN users winner ON winner.id = a.winner_user_id
     LEFT JOIN users creator ON creator.id = a.created_by
     LEFT JOIN users updater ON updater.id = a.updated_by
     LEFT JOIN products p ON p.id = a.product_id
     ${whereSql}
     ORDER BY a.closed_at DESC NULLS LAST, a.end_at DESC, a.created_at DESC
     LIMIT $${listValues.length - 1} OFFSET $${listValues.length}`,
    listValues
  );

  const countResult = await q(client).query(
    `SELECT COUNT(*)
     FROM auctions a
     ${whereSql}`,
    values
  );

  return {
    items: await attachWinnerRows(client, rows.map(normalizeAuctionRow)),
    total: Number(countResult.rows[0]?.count || 0)
  };
}

module.exports = {
  listAuctions,
  getAuctionById,
  getAuctionForUpdate,
  createAuction,
  updateAuction,
  createBid,
  upsertParticipant,
  listAuctionBids,
  listAuctionParticipants,
  getHighestBid,
  getTopParticipants,
  replaceAuctionWinners,
  listAuctionWinners,
  getUserBidStats,
  listUserAuctionHistory
};
