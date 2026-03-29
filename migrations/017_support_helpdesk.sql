CREATE TABLE IF NOT EXISTS support_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(160) NOT NULL,
  category VARCHAR(40) NOT NULL DEFAULT 'other',
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ NULL,
  closed_by UUID NULL REFERENCES users(id) ON DELETE SET NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'support_threads_category_check'
  ) THEN
    ALTER TABLE support_threads
      ADD CONSTRAINT support_threads_category_check
      CHECK (category IN ('order_issue', 'payment_issue', 'auction_issue', 'account_issue', 'seller_issue', 'other'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'support_threads_status_check'
  ) THEN
    ALTER TABLE support_threads
      ADD CONSTRAINT support_threads_status_check
      CHECK (status IN ('open', 'replied', 'closed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_support_threads_user_id ON support_threads(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_threads_status ON support_threads(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_threads_category ON support_threads(category, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_threads_updated_at ON support_threads(updated_at DESC);

CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES support_threads(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL,
  sender_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'support_messages_sender_type_check'
  ) THEN
    ALTER TABLE support_messages
      ADD CONSTRAINT support_messages_sender_type_check
      CHECK (sender_type IN ('user', 'admin'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_support_messages_thread_id ON support_messages(thread_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_support_messages_sender_type ON support_messages(sender_type, created_at DESC);
