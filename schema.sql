-- =========================================================
-- RUN THIS ENTIRE SCRIPT IN YOUR SUPABASE SQL EDITOR
-- It is completely safe to run (uses IF NOT EXISTS)
-- =========================================================

-- 1. Create / Update Problem Statements Table
CREATE TABLE IF NOT EXISTS problem_statements (
  id text PRIMARY KEY,
  title text NOT NULL,
  sponsor text,
  description text,
  categories text[],
  current_teams integer DEFAULT 0,
  max_teams integer DEFAULT 17,
  presentation_day text,
  room_number text
);

ALTER TABLE problem_statements ADD COLUMN IF NOT EXISTS presentation_day text;
ALTER TABLE problem_statements ADD COLUMN IF NOT EXISTS session text DEFAULT 'FN';
ALTER TABLE problem_statements ADD COLUMN IF NOT EXISTS session_type text DEFAULT 'PPT';
ALTER TABLE problem_statements ADD COLUMN IF NOT EXISTS batch text;
ALTER TABLE problem_statements ADD COLUMN IF NOT EXISTS room_number text;
ALTER TABLE problem_statements ADD COLUMN IF NOT EXISTS current_teams integer DEFAULT 0;
ALTER TABLE problem_statements ADD COLUMN IF NOT EXISTS max_teams integer DEFAULT 17;

-- 2. Create / Update Teams Table
CREATE TABLE IF NOT EXISTS teams (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  team_name text NOT NULL,
  tl_email text UNIQUE NOT NULL,
  tl_name text,
  tl_mobile text,
  tl_department text,
  tl_year text,
  members text[],
  allocated_ps_id text REFERENCES problem_statements(id),
  allocation_time timestamp with time zone,
  is_disabled boolean DEFAULT false
);

ALTER TABLE teams ADD COLUMN IF NOT EXISTS members text[];
ALTER TABLE teams ADD COLUMN IF NOT EXISTS allocated_ps_id text REFERENCES problem_statements(id);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS allocation_time timestamp with time zone;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS is_disabled boolean DEFAULT false;

-- 3. Create / Update Admins Table
CREATE TABLE IF NOT EXISTS admins (
  email text PRIMARY KEY
);

-- 4. Create / Update Site Visits Table
CREATE TABLE IF NOT EXISTS site_visits (
  email text PRIMARY KEY,
  last_visited_at timestamp with time zone DEFAULT now()
);

-- 5. Create / Update Registered Emails Table
CREATE TABLE IF NOT EXISTS registered_emails (
  email text PRIMARY KEY
);

-- 6. Create / Update Evaluation Settings Table
CREATE TABLE IF NOT EXISTS evaluation_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  categories jsonb DEFAULT '[{"id": "cat1", "name": "Innovation", "maxMarks": 25}, {"id": "cat2", "name": "Feasibility", "maxMarks": 25}, {"id": "cat3", "name": "Presentation", "maxMarks": 25}, {"id": "cat4", "name": "Technicality", "maxMarks": 25}]'::jsonb,
  category_1 text DEFAULT 'Innovation',
  category_2 text DEFAULT 'Feasibility',
  category_3 text DEFAULT 'Presentation',
  category_4 text DEFAULT 'Technicality',
  max_marks integer DEFAULT 100,
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE evaluation_settings ADD COLUMN IF NOT EXISTS categories jsonb DEFAULT '[{"id": "cat1", "name": "Innovation", "maxMarks": 25}, {"id": "cat2", "name": "Feasibility", "maxMarks": 25}, {"id": "cat3", "name": "Presentation", "maxMarks": 25}, {"id": "cat4", "name": "Technicality", "maxMarks": 25}]'::jsonb;
ALTER TABLE evaluation_settings ADD COLUMN IF NOT EXISTS category_1 text DEFAULT 'Innovation';
ALTER TABLE evaluation_settings ADD COLUMN IF NOT EXISTS category_2 text DEFAULT 'Feasibility';
ALTER TABLE evaluation_settings ADD COLUMN IF NOT EXISTS category_3 text DEFAULT 'Presentation';
ALTER TABLE evaluation_settings ADD COLUMN IF NOT EXISTS category_4 text DEFAULT 'Technicality';
ALTER TABLE evaluation_settings ADD COLUMN IF NOT EXISTS max_marks integer DEFAULT 100;

-- 7. Create / Update Evaluations Table
CREATE TABLE IF NOT EXISTS evaluations (
  team_id uuid PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
  cat1_score integer DEFAULT 0,
  cat2_score integer DEFAULT 0,
  cat3_score integer DEFAULT 0,
  cat4_score integer DEFAULT 0,
  scores jsonb DEFAULT '{}'::jsonb,
  total_score integer DEFAULT 0,
  evaluated_by text,
  evaluated_at timestamp with time zone DEFAULT now(),
  update_count integer DEFAULT 0
);

ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS cat1_score integer DEFAULT 0;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS cat2_score integer DEFAULT 0;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS cat3_score integer DEFAULT 0;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS cat4_score integer DEFAULT 0;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS scores jsonb DEFAULT '{}'::jsonb;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS total_score integer DEFAULT 0;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS evaluated_by text;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS evaluated_at timestamp with time zone DEFAULT now();
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS update_count integer DEFAULT 0;

-- 8. Create / Update Room Coordinators Table
CREATE TABLE IF NOT EXISTS room_coordinators (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  presentation_day text NOT NULL,
  room_number text NOT NULL,
  faculty_coordinator text DEFAULT '',
  student_coordinator text DEFAULT '',
  UNIQUE(presentation_day, room_number)
);

ALTER TABLE room_coordinators ADD COLUMN IF NOT EXISTS faculty_coordinator text DEFAULT '';
ALTER TABLE room_coordinators ADD COLUMN IF NOT EXISTS student_coordinator text DEFAULT '';

-- 9. Team Presentation Slot & Batch Columns
ALTER TABLE teams ADD COLUMN IF NOT EXISTS presentation_day text;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS session text;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS session_type text;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS batch text;

ALTER TABLE evaluation_settings ADD COLUMN IF NOT EXISTS day1_fn_type text DEFAULT 'PPT';
ALTER TABLE evaluation_settings ADD COLUMN IF NOT EXISTS day1_an_type text DEFAULT 'Prototype';
ALTER TABLE evaluation_settings ADD COLUMN IF NOT EXISTS day2_fn_type text DEFAULT 'Prototype';
ALTER TABLE evaluation_settings ADD COLUMN IF NOT EXISTS day2_an_type text DEFAULT 'PPT';
ALTER TABLE evaluation_settings ADD COLUMN IF NOT EXISTS day3_fn_type text DEFAULT 'PPT';
ALTER TABLE evaluation_settings ADD COLUMN IF NOT EXISTS day3_an_type text DEFAULT 'Prototype';

