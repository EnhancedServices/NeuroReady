/*
  # AreYouReady v3 Schema Expansion
  
  ## Overview
  This migration expands the database schema to support session outcome tracking,
  HRV history management, and athlete flag alerts for coaches.

  ## 1. Sessions Table Expansion
  New columns added to sessions table:
  
  ### Pre-test context fields:
  - `test_reason` - Why the athlete is testing (key_session, feel_off, race_prep, coach_requested, return_after_disruption)
  - `planned_session_type` - What training is planned (recovery, easy_aerobic, long_endurance, threshold, vo2_high_intensity, race_simulation, technical_session, group_ride_run, race_event, other)
  - `sleep_quality` - Quality rating (poor, fair, good, excellent)
  - `soreness_level` - Body soreness (none, mild, moderate, severe)
  - `perceived_fatigue` - Subjective fatigue (low, moderate, high, very_high)
  - `training_load_status` - Recent training load (normal, high, very_high)
  - `hrv_7day_avg` - Optional 7-day HRV average
  - `hrv_status` - HRV compared to normal (normal, slightly_down, clearly_down, unknown)
  
  ### Result fields:
  - `session_call` - The main recommendation (ready_for_quality, ready_with_guardrails, better_suited_to_steady_work, recovery_day_preferred)
  - `primary_risk` - Main risk type identified
  - `secondary_risk` - Secondary risk if applicable
  - `action_1` - First priority action
  - `action_2` - Second priority action
  - `what_changed_text` - Explanation of cognitive changes
  - `what_it_means_text` - Training behavior implications
  - `why_this_matters_text` - Personal insight or generic explanation
  - `control_status`, `adapt_status`, `focus_status` - Domain traffic light statuses
  
  ### Athlete outcome fields (athlete enters after training):
  - `actual_session_type` - What they actually did
  - `session_completed` - completed_as_planned, modified, abandoned
  - `fueling_compliance` - hit, missed
  - `pacing_execution` - good, poor
  - `rpe_outcome` - easier, as_expected, harder
  - `athlete_note` - Optional short note
  - `athlete_outcome_at` - When athlete logged outcome
  
  ### Coach outcome fields (coach adds deeper tags):
  - `hr_drift_flag` - yes, no, unknown
  - `execution_quality` - good, fair, poor
  - `readiness_call_matched` - yes, partially, no
  - `coach_note` - Coach's interpretation
  - `coach_outcome_at` - When coach reviewed
  - `coach_outcome_by` - Coach user ID

  ## 2. New Tables
  
  ### hrv_history
  Manual HRV tracking table for coach data entry:
  - `id` - Primary key
  - `athlete_id` - Reference to athlete profile
  - `date` - Date of HRV reading
  - `hrv_value` - Optional numeric HRV value
  - `hrv_status` - Status vs normal baseline
  - `source_note` - Data source (Garmin, Whoop, Oura, manual)
  - `entered_by` - Who entered the data
  - `created_at`, `updated_at` - Timestamps
  
  ### athlete_flags
  Alert flags for coach dashboard:
  - `id` - Primary key
  - `athlete_id` - Reference to athlete profile
  - `flag_type` - Type of concerning pattern
  - `trigger_data` - JSON with details about what triggered the flag
  - `created_at` - When flag was created
  - `resolved_at` - When coach resolved/dismissed
  - `resolved_by` - Who resolved it

  ## 3. Security
  - RLS enabled on all new tables
  - Athletes can read/write their own HRV data
  - Athletes can read their own flags
  - Admins have full access to all data
*/

-- Add new columns to sessions table for pre-test context
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'test_reason') THEN
    ALTER TABLE sessions ADD COLUMN test_reason text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'planned_session_type') THEN
    ALTER TABLE sessions ADD COLUMN planned_session_type text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'sleep_quality') THEN
    ALTER TABLE sessions ADD COLUMN sleep_quality text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'soreness_level') THEN
    ALTER TABLE sessions ADD COLUMN soreness_level text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'perceived_fatigue') THEN
    ALTER TABLE sessions ADD COLUMN perceived_fatigue text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'training_load_status') THEN
    ALTER TABLE sessions ADD COLUMN training_load_status text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'hrv_7day_avg') THEN
    ALTER TABLE sessions ADD COLUMN hrv_7day_avg numeric;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'hrv_status') THEN
    ALTER TABLE sessions ADD COLUMN hrv_status text;
  END IF;
END $$;

-- Add result fields to sessions table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'session_call') THEN
    ALTER TABLE sessions ADD COLUMN session_call text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'primary_risk') THEN
    ALTER TABLE sessions ADD COLUMN primary_risk text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'secondary_risk') THEN
    ALTER TABLE sessions ADD COLUMN secondary_risk text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'action_1') THEN
    ALTER TABLE sessions ADD COLUMN action_1 text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'action_2') THEN
    ALTER TABLE sessions ADD COLUMN action_2 text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'what_changed_text') THEN
    ALTER TABLE sessions ADD COLUMN what_changed_text text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'what_it_means_text') THEN
    ALTER TABLE sessions ADD COLUMN what_it_means_text text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'why_this_matters_text') THEN
    ALTER TABLE sessions ADD COLUMN why_this_matters_text text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'control_status') THEN
    ALTER TABLE sessions ADD COLUMN control_status text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'adapt_status') THEN
    ALTER TABLE sessions ADD COLUMN adapt_status text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'focus_status') THEN
    ALTER TABLE sessions ADD COLUMN focus_status text;
  END IF;
END $$;

-- Add athlete outcome fields to sessions table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'actual_session_type') THEN
    ALTER TABLE sessions ADD COLUMN actual_session_type text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'session_completed') THEN
    ALTER TABLE sessions ADD COLUMN session_completed text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'fueling_compliance') THEN
    ALTER TABLE sessions ADD COLUMN fueling_compliance text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'pacing_execution') THEN
    ALTER TABLE sessions ADD COLUMN pacing_execution text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'rpe_outcome') THEN
    ALTER TABLE sessions ADD COLUMN rpe_outcome text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'athlete_note') THEN
    ALTER TABLE sessions ADD COLUMN athlete_note text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'athlete_outcome_at') THEN
    ALTER TABLE sessions ADD COLUMN athlete_outcome_at timestamptz;
  END IF;
END $$;

-- Add coach outcome fields to sessions table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'hr_drift_flag') THEN
    ALTER TABLE sessions ADD COLUMN hr_drift_flag text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'execution_quality') THEN
    ALTER TABLE sessions ADD COLUMN execution_quality text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'readiness_call_matched') THEN
    ALTER TABLE sessions ADD COLUMN readiness_call_matched text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'coach_note') THEN
    ALTER TABLE sessions ADD COLUMN coach_note text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'coach_outcome_at') THEN
    ALTER TABLE sessions ADD COLUMN coach_outcome_at timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'coach_outcome_by') THEN
    ALTER TABLE sessions ADD COLUMN coach_outcome_by uuid REFERENCES profiles(id);
  END IF;
END $$;

-- Create HRV history table
CREATE TABLE IF NOT EXISTS hrv_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  hrv_value numeric,
  hrv_status text NOT NULL DEFAULT 'unknown',
  source_note text,
  entered_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT hrv_status_check CHECK (hrv_status IN ('normal', 'slightly_down', 'clearly_down', 'unknown'))
);

-- Create athlete flags table
CREATE TABLE IF NOT EXISTS athlete_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  flag_type text NOT NULL,
  trigger_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES profiles(id),
  CONSTRAINT flag_type_check CHECK (flag_type IN (
    'repeated_red_outcomes',
    'low_focus_poor_sleep',
    'readiness_mismatch',
    'missed_fueling_pattern',
    'red_cognition_hrv_down'
  ))
);

-- Enable RLS on new tables
ALTER TABLE hrv_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE athlete_flags ENABLE ROW LEVEL SECURITY;

-- RLS policies for hrv_history
CREATE POLICY "Athletes can view own HRV history"
  ON hrv_history FOR SELECT
  TO authenticated
  USING (athlete_id = auth.uid());

CREATE POLICY "Athletes can insert own HRV history"
  ON hrv_history FOR INSERT
  TO authenticated
  WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "Athletes can update own HRV history"
  ON hrv_history FOR UPDATE
  TO authenticated
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "Admins can view all HRV history"
  ON hrv_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert HRV history for any athlete"
  ON hrv_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update any HRV history"
  ON hrv_history FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete HRV history"
  ON hrv_history FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS policies for athlete_flags
CREATE POLICY "Athletes can view own flags"
  ON athlete_flags FOR SELECT
  TO authenticated
  USING (athlete_id = auth.uid());

CREATE POLICY "Admins can view all flags"
  ON athlete_flags FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert flags"
  ON athlete_flags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update flags"
  ON athlete_flags FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete flags"
  ON athlete_flags FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_hrv_history_athlete_date ON hrv_history(athlete_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_athlete_flags_athlete ON athlete_flags(athlete_id);
CREATE INDEX IF NOT EXISTS idx_athlete_flags_unresolved ON athlete_flags(athlete_id) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_athlete_date ON sessions(athlete_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_session_call ON sessions(session_call) WHERE session_call IS NOT NULL;
