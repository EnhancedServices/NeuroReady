/*
  # Create sleep_history table

  1. New Tables
    - `sleep_history`
      - `id` (uuid, primary key)
      - `athlete_id` (uuid, foreign key to profiles)
      - `date` (date)
      - `sleep_hours` (numeric, nullable)
      - `sleep_quality` (text - poor/fair/good/excellent)
      - `source_note` (text, nullable - device/manual entry source)
      - `entered_by` (uuid, nullable - who entered the data)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `sleep_history` table
    - Athletes can view and manage their own sleep data
    - Admins can view and manage all sleep data
  
  3. Indexes
    - Index on athlete_id for fast lookups
    - Index on date for time-based queries
*/

CREATE TABLE IF NOT EXISTS sleep_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  sleep_hours numeric,
  sleep_quality text CHECK (sleep_quality IN ('poor', 'fair', 'good', 'excellent')),
  source_note text,
  entered_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sleep_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_sleep_history_athlete_id ON sleep_history(athlete_id);
CREATE INDEX IF NOT EXISTS idx_sleep_history_date ON sleep_history(date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sleep_history_athlete_date ON sleep_history(athlete_id, date);

CREATE POLICY "Athletes can view own sleep data"
  ON sleep_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = athlete_id);

CREATE POLICY "Athletes can insert own sleep data"
  ON sleep_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = athlete_id);

CREATE POLICY "Athletes can update own sleep data"
  ON sleep_history
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = athlete_id)
  WITH CHECK (auth.uid() = athlete_id);

CREATE POLICY "Athletes can delete own sleep data"
  ON sleep_history
  FOR DELETE
  TO authenticated
  USING (auth.uid() = athlete_id);

CREATE POLICY "Admins can view all sleep data"
  ON sleep_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert sleep data for athletes"
  ON sleep_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update sleep data"
  ON sleep_history
  FOR UPDATE
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

CREATE POLICY "Admins can delete sleep data"
  ON sleep_history
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );