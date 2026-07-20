/*
  # Add HRV engine fields to neuro_sessions

  ## Why
  The application writes 9 computed HRV-analysis fields on every session save
  (see `sessionPayload` in src/App.tsx). These columns existed only in the old
  standalone `sessions` table migration (20260404032824_add_hrv_engine_fields.sql),
  but the live database uses the `neuro_sessions` table, which never received them.

  As a result, every insert/update to `neuro_sessions` was rejected by PostgREST
  with `column neuro_sessions.hrv_entries_last_7d does not exist` (HTTP 400), so
  no session could be saved and the user was bounced back to the start of the flow.

  ## Change
  Adds the missing HRV engine columns to `neuro_sessions` (idempotent).
  Note: `hrv_7day_avg` already exists on the live table and is intentionally omitted.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'neuro_sessions' AND column_name = 'hrv_entries_last_7d') THEN
    ALTER TABLE neuro_sessions ADD COLUMN hrv_entries_last_7d integer;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'neuro_sessions' AND column_name = 'hrv_baseline_avg') THEN
    ALTER TABLE neuro_sessions ADD COLUMN hrv_baseline_avg numeric;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'neuro_sessions' AND column_name = 'hrv_pct_diff_from_baseline') THEN
    ALTER TABLE neuro_sessions ADD COLUMN hrv_pct_diff_from_baseline numeric;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'neuro_sessions' AND column_name = 'hrv_trend_category') THEN
    ALTER TABLE neuro_sessions ADD COLUMN hrv_trend_category text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'neuro_sessions' AND column_name = 'hrv_confidence') THEN
    ALTER TABLE neuro_sessions ADD COLUMN hrv_confidence text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'neuro_sessions' AND column_name = 'hrv_interpretation') THEN
    ALTER TABLE neuro_sessions ADD COLUMN hrv_interpretation text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'neuro_sessions' AND column_name = 'hrv_supports_readiness') THEN
    ALTER TABLE neuro_sessions ADD COLUMN hrv_supports_readiness boolean;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'neuro_sessions' AND column_name = 'hrv_concerns_recovery') THEN
    ALTER TABLE neuro_sessions ADD COLUMN hrv_concerns_recovery boolean;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'neuro_sessions' AND column_name = 'hrv_text_summary') THEN
    ALTER TABLE neuro_sessions ADD COLUMN hrv_text_summary text;
  END IF;
END $$;
