CREATE TABLE IF NOT EXISTS security_event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  action_type VARCHAR(80) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_event_logs_user_action
  ON security_event_logs(user_id, action_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_event_logs_created_at
  ON security_event_logs(created_at DESC);
