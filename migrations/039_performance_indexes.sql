CREATE INDEX IF NOT EXISTS idx_products_active_created_at
  ON products (is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_created_at
  ON wallet_transactions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_source_created_at
  ON wallet_transactions (user_id, source, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_deposit_requests_user_created_at
  ON wallet_deposit_requests (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_deposit_requests_status_created_at
  ON wallet_deposit_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_withdrawal_requests_user_created_at
  ON wallet_withdrawal_requests (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_withdrawal_requests_status_created_at
  ON wallet_withdrawal_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_p2p_transfers_from_created_at
  ON wallet_p2p_transfers (from_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_p2p_transfers_to_created_at
  ON wallet_p2p_transfers (to_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auctions_status_window
  ON auctions (status, is_active, start_at, end_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auction_bids_auction_user_created_at
  ON auction_bids (auction_id, user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auction_bids_user_created_at
  ON auction_bids (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auction_participants_user_auction
  ON auction_participants (user_id, auction_id);

CREATE INDEX IF NOT EXISTS idx_auction_winners_user_auction
  ON auction_winners (user_id, auction_id);

CREATE INDEX IF NOT EXISTS idx_support_threads_user_updated_at
  ON support_threads (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_threads_status_updated_at
  ON support_threads (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_messages_thread_created_at
  ON support_messages (thread_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_read_created_at
  ON user_notifications (user_id, is_read, created_at DESC);
