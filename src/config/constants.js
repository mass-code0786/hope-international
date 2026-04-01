module.exports = {
  PV_TO_BV_RATIO: 0.4,
  SELLER_APPLICATION_FEE_USD: 70,
  DIRECT_INCOME_PERCENTAGE: 0.05,
  MATCH_PERCENTAGE: 0.10,
  BASE_MATCH_CAP_MULTIPLIER: 3,
  DEFAULT_RANKS: [
    { name: 'No Rank', minBv: 0, capMultiplier: 3 },
    { name: 'Bronze', minBv: 1000, capMultiplier: 4 },
    { name: 'Silver', minBv: 5000, capMultiplier: 5 },
    { name: 'Gold', minBv: 15000, capMultiplier: 6 },
    { name: 'Diamond', minBv: 50000, capMultiplier: 7 },
    { name: 'Crown', minBv: 100000, capMultiplier: 8 }
  ],
  MONTHLY_REWARD_THRESHOLDS: [
    { thresholdBv: 2000, rewardAmount: 100, rewardLabel: '100 Cash Reward' },
    { thresholdBv: 5000, rewardAmount: 250, rewardLabel: '250 Cash Reward' },
    { thresholdBv: 10000, rewardAmount: 500, rewardLabel: '500 Cash Reward' },
    { thresholdBv: 50000, rewardAmount: 1000, rewardLabel: '1000 Cash + iPhone' },
    { thresholdBv: 100000, rewardAmount: 2000, rewardLabel: '2000 Cash + Four Wheeler' },
    { thresholdBv: 500000, rewardAmount: 5000, rewardLabel: '5000 Cash + Bungalow' }
  ]
};
