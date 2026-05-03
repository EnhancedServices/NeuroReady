/*
  # Add Coach Insight Fields to Sessions Table

  1. New Columns on `sessions` table
    - `coach_pattern_type` (text) - Classification: stable_readiness, mental_strain, recovery_strain, combined_strain, execution_risk, unclear_pattern
    - `coach_insight_text` (text) - Main coaching insight
    - `coach_discussion_prompt` (text) - Question for weekly feedback
    - `coach_next_step` (text) - Recommended action
    - `coach_why_it_matters` (text) - Performance consequence
    - `coach_confidence_level` (text) - Insight confidence: high, moderate, low
    - `coach_sleep_override_hours` (numeric) - Coach-editable sleep hours override
    - `coach_sleep_override_quality` (text) - Coach-editable sleep quality override
    - `coach_hrv_override_category` (text) - Coach-editable HRV trend category override
    - `coach_insight_generated_at` (timestamptz) - When insight was last generated

  2. Notes
    - These fields are coach-only and not visible to athletes
    - Coach can override athlete-reported sleep/HRV context for deeper interpretation
    - Pattern type follows a deterministic decision-tree logic
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'coach_pattern_type'
  ) THEN
    ALTER TABLE sessions ADD COLUMN coach_pattern_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'coach_insight_text'
  ) THEN
    ALTER TABLE sessions ADD COLUMN coach_insight_text text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'coach_discussion_prompt'
  ) THEN
    ALTER TABLE sessions ADD COLUMN coach_discussion_prompt text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'coach_next_step'
  ) THEN
    ALTER TABLE sessions ADD COLUMN coach_next_step text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'coach_why_it_matters'
  ) THEN
    ALTER TABLE sessions ADD COLUMN coach_why_it_matters text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'coach_confidence_level'
  ) THEN
    ALTER TABLE sessions ADD COLUMN coach_confidence_level text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'coach_sleep_override_hours'
  ) THEN
    ALTER TABLE sessions ADD COLUMN coach_sleep_override_hours numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'coach_sleep_override_quality'
  ) THEN
    ALTER TABLE sessions ADD COLUMN coach_sleep_override_quality text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'coach_hrv_override_category'
  ) THEN
    ALTER TABLE sessions ADD COLUMN coach_hrv_override_category text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'coach_insight_generated_at'
  ) THEN
    ALTER TABLE sessions ADD COLUMN coach_insight_generated_at timestamptz;
  END IF;
END $$;
