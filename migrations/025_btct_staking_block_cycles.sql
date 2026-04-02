ALTER TABLE btct_staking_plans
  ADD COLUMN IF NOT EXISTS staked_blocks INT,
  ADD COLUMN IF NOT EXISTS payout_per_cycle_usd NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS schedule_code VARCHAR(80) NOT NULL DEFAULT 'fixed_month_days_10_20_30';

UPDATE btct_staking_plans
SET staked_blocks = GREATEST(1, FLOOR(COALESCE(staking_amount_btct, 0) / 5000.0))::int,
    payout_per_cycle_usd = GREATEST(10, FLOOR(COALESCE(staking_amount_btct, 0) / 5000.0) * 10)::numeric(14,2),
    schedule_code = 'fixed_month_days_10_20_30'
WHERE staked_blocks IS NULL
   OR payout_per_cycle_usd IS NULL
   OR schedule_code IS DISTINCT FROM 'fixed_month_days_10_20_30';

ALTER TABLE btct_staking_payouts
  ADD COLUMN IF NOT EXISTS cycle_key VARCHAR(32);

UPDATE btct_staking_payouts
SET cycle_key = TO_CHAR(payout_date AT TIME ZONE 'UTC', 'YYYY-MM-DD')
WHERE cycle_key IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_btct_staking_payouts_cycle_key
  ON btct_staking_payouts(staking_id, cycle_key);
