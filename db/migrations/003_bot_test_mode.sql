-- Bot test mode + whitelist of test numbers.
-- Run once per tenant schema. Replace {schema} with the schema name.
-- Example:
--   psql ... -v ON_ERROR_STOP=1 \
--     -c "SET search_path TO allpfit" \
--     -f db/migrations/003_bot_test_mode.sql
-- Or wrap in a loop via runMigrations.js.

ALTER TABLE IF EXISTS bots
    ADD COLUMN IF NOT EXISTS test_mode BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS bot_test_numbers (
    id text PRIMARY KEY DEFAULT gen_random_uuid(),
    assistant_id text NOT NULL,
    number text NOT NULL,
    created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000),
    UNIQUE(assistant_id, number)
);
