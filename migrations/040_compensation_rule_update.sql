DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND constraint_name = 'products_pv_bv_ratio_check'
  ) THEN
    ALTER TABLE products DROP CONSTRAINT products_pv_bv_ratio_check;
  END IF;
END
$$;

ALTER TABLE products
  ADD CONSTRAINT products_pv_bv_ratio_check
  CHECK (pv = ROUND((bv * 0.3)::numeric, 2)) NOT VALID;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'order_items'
      AND constraint_name = 'order_items_pv_bv_ratio_check'
  ) THEN
    ALTER TABLE order_items DROP CONSTRAINT order_items_pv_bv_ratio_check;
  END IF;
END
$$;

ALTER TABLE order_items
  ADD CONSTRAINT order_items_pv_bv_ratio_check
  CHECK (pv = ROUND((bv * 0.3)::numeric, 2)) NOT VALID;

INSERT INTO app_settings (setting_key, setting_value, updated_by, updated_at)
VALUES (
  'compensation_settings',
  jsonb_build_object(
    'matchPercentage', 20,
    'directPercentage', 5,
    'pvBvRatio', 0.3,
    'carryForward', false
  ),
  NULL,
  NOW()
)
ON CONFLICT (setting_key)
DO UPDATE SET
  setting_value = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          COALESCE(app_settings.setting_value, '{}'::jsonb),
          '{matchPercentage}',
          to_jsonb(20),
          true
        ),
        '{directPercentage}',
        COALESCE(app_settings.setting_value->'directPercentage', to_jsonb(5)),
        true
      ),
      '{pvBvRatio}',
      to_jsonb(0.3),
      true
    ),
    '{carryForward}',
    COALESCE(app_settings.setting_value->'carryForward', to_jsonb(false)),
    true
  ),
  updated_at = NOW();
