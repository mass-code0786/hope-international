const { pool } = require('./pool');
const { DEFAULT_RANKS } = require('../config/constants');

async function seedRanks() {
  await pool.query("UPDATE ranks SET is_active = false WHERE name NOT IN ('No Rank', 'Bronze', 'Silver', 'Gold', 'Diamond', 'Crown')");

  for (const [index, rank] of DEFAULT_RANKS.entries()) {
    await pool.query(
      `INSERT INTO ranks (name, min_bv, cap_multiplier, is_active, display_order)
       VALUES ($1, $2, $3, true, $4)
       ON CONFLICT (name) DO UPDATE SET
         min_bv = EXCLUDED.min_bv,
         cap_multiplier = EXCLUDED.cap_multiplier,
         is_active = true,
         display_order = EXCLUDED.display_order`,
      [rank.name, rank.minBv, rank.capMultiplier, index + 1]
    );
  }
  console.log('Ranks seeded.');
}

module.exports = {
  seedRanks
};

if (require.main === module) {
  seedRanks()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await pool.end();
    });
}
