function q(client) {
  return client || require('../db/pool').pool;
}

function coerceJsonArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildAuctionStatusCase(nowPlaceholder) {
  return `
    CASE
      WHEN a.status = 'cancelled' OR a.cancelled_at IS NOT NULL THEN 'cancelled'
      WHEN a.status = 'ended' OR a.closed_at IS NOT NULL OR a.end_at <= ${nowPlaceholder} THEN 'ended'
      WHEN a.is_active = true AND a.start_at <= ${nowPlaceholder} AND a.end_at > ${nowPlaceholder} THEN 'live'
      ELSE 'upcoming'
    END
  `;
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
    where.push(`(a.title ILIKE $${values.length} OR COALESCE(a.short_description, '') ILIKE $${values.length})`);
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
    CASE WHEN ${statusCase} = 'live' THEN a.end_at END ASC,
    a.created_at DESC`;

  const listValues = [...values, pagination.limit, pagination.offset];
  const { rows } = await q(client).query(
    `SELECT
      a.*,
      ${statusCase} AS computed_status,
      COALESCE(a.current_bid, a.starting_price)::numeric(14,2) AS display_current_bid,
      winner.username AS winner_username,
      creator.username AS created_by_username
     FROM auctions a
     LEFT JOIN users winner ON winner.id = a.winner_user_id
     LEFT JOIN users creator ON creator.id = a.created_by
     ${whereSql}
     ${sortSql}
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
    items: rows.map((row) => ({
      ...row,
      gallery: coerceJsonArray(row.gallery),
      specifications: coerceJsonArray(row.specifications)
    })),
    total: Number(countResult.rows[0]?.count || 0)
  };
}

async function getAuctionById(client, auctionId, options = {}) {
  const now = options.now || new Date().toISOString();
  const { rows } = await q(client).query(
    `SELECT
      a.*,
      ${buildAuctionStatusCase('$2')} AS computed_status,
      COALESCE(a.current_bid, a.starting_price)::numeric(14,2) AS display_current_bid,
      winner.username AS winner_username,
      winner.email AS winner_email,
      creator.username AS created_by_username,
      updater.username AS updated_by_username
     FROM auctions a
     LEFT JOIN users winner ON winner.id = a.winner_user_id
     LEFT JOIN users creator ON creator.id = a.created_by
     LEFT JOIN users updater ON updater.id = a.updated_by
     WHERE a.id = $1`,
    [auctionId, now]
  );

  const auction = rows[0] || null;
  if (!auction) return null;

  return {
    ...auction,
    gallery: coerceJsonArray(auction.gallery),
    specifications: coerceJsonArray(auction.specifications)
  };
}

async function getAuctionForUpdate(client, auctionId) {
  const { rows } = await q(client).query(
    `SELECT * FROM auctions WHERE id = $1 FOR UPDATE`,
    [auctionId]
  );
  const auction = rows[0] || null;
  if (!auction) return null;
  return {
    ...auction,
    gallery: coerceJsonArray(auction.gallery),
    specifications: coerceJsonArray(auction.specifications)
  };
}

async function createAuction(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO auctions (
      title,
      short_description,
      description,
      specifications,
      image_url,
      gallery,
      starting_price,
      min_bid_increment,
      current_bid,
      start_at,
      end_at,
      status,
      is_active,
      created_by,
      updated_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     RETURNING *`,
    [
      payload.title,
      payload.shortDescription || null,
      payload.description || null,
      JSON.stringify(coerceJsonArray(payload.specifications)),
      payload.imageUrl || null,
      JSON.stringify(coerceJsonArray(payload.gallery)),
      payload.startingPrice,
      payload.minBidIncrement,
      payload.currentBid,
      payload.startAt,
      payload.endAt,
      payload.status,
      payload.isActive ?? true,
      payload.createdBy || null,
      payload.updatedBy || null
    ]
  );
  return {
    ...rows[0],
    gallery: coerceJsonArray(rows[0]?.gallery),
    specifications: coerceJsonArray(rows[0]?.specifications)
  };
}

async function updateAuction(client, auctionId, payload) {
  const { rows } = await q(client).query(
    `UPDATE auctions
     SET title = $2,
         short_description = $3,
         description = $4,
         specifications = $5,
         image_url = $6,
         gallery = $7,
         starting_price = $8,
         min_bid_increment = $9,
         current_bid = $10,
         start_at = $11,
         end_at = $12,
         status = $13,
         is_active = $14,
         cancelled_at = $15,
         closed_at = $16,
         close_reason = $17,
         winner_user_id = $18,
         winning_bid_id = $19,
         total_bids = $20,
         updated_by = $21
     WHERE id = $1
     RETURNING *`,
    [
      auctionId,
      payload.title,
      payload.shortDescription || null,
      payload.description || null,
      JSON.stringify(coerceJsonArray(payload.specifications)),
      payload.imageUrl || null,
      JSON.stringify(coerceJsonArray(payload.gallery)),
      payload.startingPrice,
      payload.minBidIncrement,
      payload.currentBid,
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
  const auction = rows[0] || null;
  if (!auction) return null;
  return {
    ...auction,
    gallery: coerceJsonArray(auction.gallery),
    specifications: coerceJsonArray(auction.specifications)
  };
}

async function createBid(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO auction_bids (auction_id, user_id, amount)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [payload.auctionId, payload.userId, payload.amount]
  );
  return rows[0];
}

async function upsertParticipant(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO auction_participants (auction_id, user_id, joined_at, last_bid_at, total_bids, highest_bid)
     VALUES ($1, $2, NOW(), NOW(), 1, $3)
     ON CONFLICT (auction_id, user_id)
     DO UPDATE SET
       last_bid_at = NOW(),
       total_bids = auction_participants.total_bids + 1,
       highest_bid = GREATEST(auction_participants.highest_bid, EXCLUDED.highest_bid)
     RETURNING *`,
    [payload.auctionId, payload.userId, payload.amount]
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
     ORDER BY b.amount DESC, b.created_at ASC
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
     ORDER BY p.highest_bid DESC, p.last_bid_at DESC NULLS LAST`,
    [auctionId]
  );
  return rows;
}

async function getHighestBid(client, auctionId) {
  const { rows } = await q(client).query(
    `SELECT *
     FROM auction_bids
     WHERE auction_id = $1
     ORDER BY amount DESC, created_at ASC
     LIMIT 1`,
    [auctionId]
  );
  return rows[0] || null;
}

async function getUserBidStats(client, userId) {
  const { rows } = await q(client).query(
    `SELECT
      COALESCE((SELECT COUNT(*) FROM auction_bids WHERE user_id = $1), 0)::int AS my_bids,
      COALESCE((SELECT COUNT(*) FROM auction_participants WHERE user_id = $1), 0)::int AS auctions_joined,
      COALESCE((SELECT COUNT(*) FROM auctions WHERE winner_user_id = $1), 0)::int AS won_auctions,
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
    where.push(`a.winner_user_id = $1`);
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
      winner.username AS winner_username,
      (
        SELECT MAX(amount)
        FROM auction_bids ub
        WHERE ub.auction_id = a.id
          AND ub.user_id = $1
      ) AS my_highest_bid
     FROM auctions a
     LEFT JOIN users winner ON winner.id = a.winner_user_id
     ${whereSql}
     ORDER BY a.end_at DESC, a.created_at DESC
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
    items: rows.map((row) => ({
      ...row,
      gallery: coerceJsonArray(row.gallery),
      specifications: coerceJsonArray(row.specifications)
    })),
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
  getUserBidStats,
  listUserAuctionHistory
};

