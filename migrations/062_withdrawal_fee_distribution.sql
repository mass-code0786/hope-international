ALTER TABLE wallet_withdrawal_requests
  ADD COLUMN IF NOT EXISTS admin_fee NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS auction_bonus_credit NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS net_paid_amount NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS fee_version SMALLINT,
  ADD COLUMN IF NOT EXISTS auction_bonus_credited_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'wallet_withdrawal_requests_fee_breakdown_check'
  ) THEN
    ALTER TABLE wallet_withdrawal_requests
      ADD CONSTRAINT wallet_withdrawal_requests_fee_breakdown_check CHECK (
        fee_version IS NULL
        OR (
          fee_version = 2
          AND admin_fee >= 0
          AND auction_bonus_credit >= 0
          AND net_paid_amount >= 0
          AND amount = admin_fee + auction_bonus_credit + net_paid_amount
        )
      );
  END IF;
END $$;
