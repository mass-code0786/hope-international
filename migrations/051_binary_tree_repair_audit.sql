CREATE TABLE IF NOT EXISTS binary_tree_repair_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  options JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  report_path TEXT,
  backup_path TEXT,
  notes TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'binary_tree_repair_runs_mode_check'
  ) THEN
    ALTER TABLE binary_tree_repair_runs
      ADD CONSTRAINT binary_tree_repair_runs_mode_check
      CHECK (mode IN ('dry_run', 'apply'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'binary_tree_repair_runs_status_check'
  ) THEN
    ALTER TABLE binary_tree_repair_runs
      ADD CONSTRAINT binary_tree_repair_runs_status_check
      CHECK (status IN ('analyzed', 'applied', 'blocked', 'failed'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS binary_tree_repair_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES binary_tree_repair_runs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sponsor_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  intended_leg placement_side NULL,
  current_parent_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  current_placement_side placement_side NULL,
  corrected_parent_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  corrected_placement_side placement_side NULL,
  move_required BOOLEAN NOT NULL DEFAULT FALSE,
  direct_violation BOOLEAN NOT NULL DEFAULT FALSE,
  violation_type VARCHAR(80) NOT NULL,
  reason TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_binary_tree_repair_runs_started_at
  ON binary_tree_repair_runs(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_binary_tree_repair_logs_run_id
  ON binary_tree_repair_logs(run_id);

CREATE INDEX IF NOT EXISTS idx_binary_tree_repair_logs_user_id
  ON binary_tree_repair_logs(user_id);
