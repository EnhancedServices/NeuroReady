/*
  # HRV Engine Fields for Sessions Table
  
  ## Overview
  This migration adds computed HRV analysis fields to the sessions table to support
  the 7-day HRV interpretation engine. These fields store the results of HRV analysis
  at the time of each session.

  ## New Fields on Sessions Table
  
  ### HRV Analysis Results
  - `hrv_entries_last_7d` - Count of valid HRV entries in the 7 days prior to session
  - `hrv_7day_avg` - Calculated 7-day HRV average
  - `hrv_baseline_avg` - Athlete's rolling personal baseline average (21-28 days)
  - `hrv_pct_diff_from_baseline` - Percentage difference from baseline
  - `hrv_trend_category` - Trend: stable, slightly_suppressed, clearly_suppressed, elevated, unstable, insufficient_data
  - `hrv_confidence` - Confidence level: high, moderate, low, none
  - `hrv_interpretation` - Recovery context interpretation
  - `hrv_supports_readiness` - Boolean flag if HRV supports readiness
  - `hrv_concerns_recovery` - Boolean flag if HRV raises recovery concerns
  - `hrv_text_summary` - Plain English summary for athlete

  ## Notes
  - These fields are computed at session creation time based on HRV history
  - They provide a snapshot of the HRV context at the moment of testing
  - The hrv_history table (created previously) stores the raw daily values
*/

-- Add HRV engine computed fields to sessions table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'hrv_entries_last_7d') THEN
    ALTER TABLE sessions ADD COLUMN hrv_entries_last_7d integer;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'hrv_7day_avg') THEN
    ALTER TABLE sessions ADD COLUMN hrv_7day_avg numeric;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'hrv_baseline_avg') THEN
    ALTER TABLE sessions ADD COLUMN hrv_baseline_avg numeric;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'hrv_pct_diff_from_baseline') THEN
    ALTER TABLE sessions ADD COLUMN hrv_pct_diff_from_baseline numeric;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'hrv_trend_category') THEN
    ALTER TABLE sessions ADD COLUMN hrv_trend_category text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'hrv_confidence') THEN
    ALTER TABLE sessions ADD COLUMN hrv_confidence text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'hrv_interpretation') THEN
    ALTER TABLE sessions ADD COLUMN hrv_interpretation text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'hrv_supports_readiness') THEN
    ALTER TABLE sessions ADD COLUMN hrv_supports_readiness boolean;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'hrv_concerns_recovery') THEN
    ALTER TABLE sessions ADD COLUMN hrv_concerns_recovery boolean;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'hrv_text_summary') THEN
    ALTER TABLE sessions ADD COLUMN hrv_text_summary text;
  END IF;
END $$;

-- Add index for HRV history queries by date range
CREATE INDEX IF NOT EXISTS idx_hrv_history_athlete_date_range ON hrv_history(athlete_id, date);
