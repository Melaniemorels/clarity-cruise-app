-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
CREATE TYPE visibility AS ENUM ('public', 'followers', 'private');
CREATE TYPE reaction_type AS ENUM ('INSPIRE', 'SAVE_IDEA');
CREATE TYPE device_provider AS ENUM ('APPLE_HEALTH', 'HEALTH_CONNECT', 'GOOGLE_FIT', 'MANUAL');
CREATE TYPE content_type AS ENUM ('MUSIC', 'AUDIOBOOK', 'PODCAST', 'CLASS_YOGA', 'CLASS_PILATES', 'CLASS_MEDITATION');
CREATE TYPE time_module AS ENUM ('FEED', 'EXPLORE', 'CALENDAR', 'PROFILE', 'FOCUS');
CREATE TYPE health_metric AS ENUM ('steps', 'workout_minutes', 'resistance');
CREATE TYPE goal_period AS ENUM ('daily', 'weekly');

-- Core & Social Tables
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  handle TEXT UNIQUE NOT NULL,
  name TEXT,
  photo_url TEXT,
  bio TEXT,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  icon TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  photo_url TEXT,
  caption TEXT CHECK (LENGTH(caption) <= 140),
  tags TEXT[] DEFAULT '{}',
  mood INTEGER CHECK (mood >= 1 AND mood <= 5),
  occurred_at TIMESTAMPTZ DEFAULT now(),
  visibility visibility DEFAULT 'private',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  type reaction_type NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, entry_id, type)
);

CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  template_items JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE habits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  frequency TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE habit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT now(),
  note TEXT
);

CREATE TABLE streaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_completed_at TIMESTAMPTZ
);

CREATE TABLE points_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  criteria JSONB
);

CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Health Tables
CREATE TABLE device_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider device_provider NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  scopes TEXT[] DEFAULT '{}',
  connected_at TIMESTAMPTZ DEFAULT now(),
  last_sync_at TIMESTAMPTZ
);

CREATE TABLE health_daily (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  steps INTEGER DEFAULT 0,
  workout_minutes INTEGER DEFAULT 0,
  active_calories INTEGER DEFAULT 0,
  distance_km DECIMAL(10,2) DEFAULT 0,
  resistance_volume INTEGER DEFAULT 0,
  resistance_proxy INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE TABLE workout_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  minutes INTEGER,
  rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE resistance_sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise TEXT NOT NULL,
  sets INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  weight DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE health_visibility (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  steps_visibility visibility DEFAULT 'private',
  workout_minutes_visibility visibility DEFAULT 'private',
  resistance_visibility visibility DEFAULT 'private',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE goals_health (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric health_metric NOT NULL,
  period goal_period NOT NULL,
  target INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, metric, period)
);

-- Time Well-Spent Tables
CREATE TABLE time_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  module time_module NOT NULL,
  seconds_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date, module)
);

CREATE TABLE time_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module time_module,
  daily_minutes INTEGER NOT NULL DEFAULT 45,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, module)
);

CREATE TABLE feed_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_feed_minutes INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Explore Catalog Tables
CREATE TABLE content_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type content_type NOT NULL,
  title TEXT NOT NULL,
  provider TEXT,
  url TEXT,
  duration_min INTEGER,
  is_free BOOLEAN DEFAULT true,
  tags TEXT[] DEFAULT '{}',
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE saved_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, item_id)
);

-- Flexible Schedule Tables
CREATE TABLE activity_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE schedule_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  activity_type_id UUID REFERENCES activity_types(id) ON DELETE SET NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  tags TEXT[] DEFAULT '{}',
  note TEXT,
  visibility visibility DEFAULT 'private',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE schedule_recurrence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  block_id UUID NOT NULL REFERENCES schedule_blocks(id) ON DELETE CASCADE,
  rrule TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE resistance_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_visibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_recurrence ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (NOT is_private OR user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for follows
CREATE POLICY "Follows are viewable by everyone"
  ON follows FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own follows"
  ON follows FOR INSERT
  WITH CHECK (follower_id = auth.uid());

CREATE POLICY "Users can delete their own follows"
  ON follows FOR DELETE
  USING (follower_id = auth.uid());

-- RLS Policies for categories
CREATE POLICY "Categories are viewable by everyone"
  ON categories FOR SELECT
  USING (true);

-- RLS Policies for entries
CREATE POLICY "Public entries are viewable by everyone"
  ON entries FOR SELECT
  USING (
    visibility = 'public' OR
    user_id = auth.uid() OR
    (visibility = 'followers' AND EXISTS (
      SELECT 1 FROM follows WHERE follower_id = auth.uid() AND following_id = entries.user_id
    ))
  );

CREATE POLICY "Users can create their own entries"
  ON entries FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own entries"
  ON entries FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own entries"
  ON entries FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for reactions
CREATE POLICY "Reactions are viewable on accessible entries"
  ON reactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM entries WHERE entries.id = reactions.entry_id AND (
      entries.visibility = 'public' OR
      entries.user_id = auth.uid() OR
      (entries.visibility = 'followers' AND EXISTS (
        SELECT 1 FROM follows WHERE follower_id = auth.uid() AND following_id = entries.user_id
      ))
    )
  ));

CREATE POLICY "Users can create their own reactions"
  ON reactions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own reactions"
  ON reactions FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for templates
CREATE POLICY "Templates are viewable by creator and public ones"
  ON templates FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can create their own templates"
  ON templates FOR INSERT
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can update their own templates"
  ON templates FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own templates"
  ON templates FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for habits
CREATE POLICY "Users can view their own habits"
  ON habits FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own habits"
  ON habits FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own habits"
  ON habits FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own habits"
  ON habits FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for habit_logs
CREATE POLICY "Users can view their own habit logs"
  ON habit_logs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own habit logs"
  ON habit_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own habit logs"
  ON habit_logs FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for streaks
CREATE POLICY "Users can view their own streaks"
  ON streaks FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own streaks"
  ON streaks FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own streaks"
  ON streaks FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policies for points_ledger
CREATE POLICY "Users can view their own points"
  ON points_ledger FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own points"
  ON points_ledger FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for badges
CREATE POLICY "Badges are viewable by everyone"
  ON badges FOR SELECT
  USING (true);

-- RLS Policies for user_badges
CREATE POLICY "User badges are viewable by everyone"
  ON user_badges FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own user badges"
  ON user_badges FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for device_connections
CREATE POLICY "Users can view their own device connections"
  ON device_connections FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own device connections"
  ON device_connections FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own device connections"
  ON device_connections FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own device connections"
  ON device_connections FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for health_daily
CREATE POLICY "Users can view their own health data"
  ON health_daily FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own health data"
  ON health_daily FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own health data"
  ON health_daily FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policies for workout_sessions
CREATE POLICY "Users can view their own workout sessions"
  ON workout_sessions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own workout sessions"
  ON workout_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own workout sessions"
  ON workout_sessions FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own workout sessions"
  ON workout_sessions FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for resistance_sets
CREATE POLICY "Users can view resistance sets from their sessions"
  ON resistance_sets FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM workout_sessions WHERE workout_sessions.id = resistance_sets.session_id AND workout_sessions.user_id = auth.uid()
  ));

CREATE POLICY "Users can create resistance sets for their sessions"
  ON resistance_sets FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM workout_sessions WHERE workout_sessions.id = resistance_sets.session_id AND workout_sessions.user_id = auth.uid()
  ));

CREATE POLICY "Users can update resistance sets from their sessions"
  ON resistance_sets FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM workout_sessions WHERE workout_sessions.id = resistance_sets.session_id AND workout_sessions.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete resistance sets from their sessions"
  ON resistance_sets FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM workout_sessions WHERE workout_sessions.id = resistance_sets.session_id AND workout_sessions.user_id = auth.uid()
  ));

-- RLS Policies for health_visibility
CREATE POLICY "Users can view their own health visibility settings"
  ON health_visibility FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own health visibility settings"
  ON health_visibility FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own health visibility settings"
  ON health_visibility FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policies for goals_health
CREATE POLICY "Users can view their own health goals"
  ON goals_health FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own health goals"
  ON goals_health FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own health goals"
  ON goals_health FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own health goals"
  ON goals_health FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for time_usage
CREATE POLICY "Users can view their own time usage"
  ON time_usage FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own time usage"
  ON time_usage FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own time usage"
  ON time_usage FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policies for time_goals
CREATE POLICY "Users can view their own time goals"
  ON time_goals FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own time goals"
  ON time_goals FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own time goals"
  ON time_goals FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own time goals"
  ON time_goals FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for feed_settings
CREATE POLICY "Users can view their own feed settings"
  ON feed_settings FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own feed settings"
  ON feed_settings FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own feed settings"
  ON feed_settings FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policies for content_items
CREATE POLICY "Content items are viewable by everyone"
  ON content_items FOR SELECT
  USING (true);

-- RLS Policies for saved_items
CREATE POLICY "Users can view their own saved items"
  ON saved_items FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own saved items"
  ON saved_items FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own saved items"
  ON saved_items FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for activity_types
CREATE POLICY "Activity types are viewable by creator and default ones"
  ON activity_types FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL OR is_default = true);

CREATE POLICY "Users can create their own activity types"
  ON activity_types FOR INSERT
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can update their own activity types"
  ON activity_types FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own activity types"
  ON activity_types FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for schedule_blocks
CREATE POLICY "Users can view their own schedule blocks"
  ON schedule_blocks FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own schedule blocks"
  ON schedule_blocks FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own schedule blocks"
  ON schedule_blocks FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own schedule blocks"
  ON schedule_blocks FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for schedule_recurrence
CREATE POLICY "Users can view recurrence for their schedule blocks"
  ON schedule_recurrence FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM schedule_blocks WHERE schedule_blocks.id = schedule_recurrence.block_id AND schedule_blocks.user_id = auth.uid()
  ));

CREATE POLICY "Users can create recurrence for their schedule blocks"
  ON schedule_recurrence FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM schedule_blocks WHERE schedule_blocks.id = schedule_recurrence.block_id AND schedule_blocks.user_id = auth.uid()
  ));

CREATE POLICY "Users can update recurrence for their schedule blocks"
  ON schedule_recurrence FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM schedule_blocks WHERE schedule_blocks.id = schedule_recurrence.block_id AND schedule_blocks.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete recurrence for their schedule blocks"
  ON schedule_recurrence FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM schedule_blocks WHERE schedule_blocks.id = schedule_recurrence.block_id AND schedule_blocks.user_id = auth.uid()
  ));

-- Create function for auto-updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_entries_updated_at BEFORE UPDATE ON entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_habits_updated_at BEFORE UPDATE ON habits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_health_daily_updated_at BEFORE UPDATE ON health_daily FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_health_visibility_updated_at BEFORE UPDATE ON health_visibility FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_goals_health_updated_at BEFORE UPDATE ON goals_health FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_time_usage_updated_at BEFORE UPDATE ON time_usage FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_time_goals_updated_at BEFORE UPDATE ON time_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_feed_settings_updated_at BEFORE UPDATE ON feed_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_schedule_blocks_updated_at BEFORE UPDATE ON schedule_blocks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, handle, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'handle', 'user' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'name', '')
  );
  
  -- Initialize default feed settings
  INSERT INTO public.feed_settings (user_id, daily_feed_minutes)
  VALUES (NEW.id, 10);
  
  -- Initialize default time goals
  INSERT INTO public.time_goals (user_id, module, daily_minutes)
  VALUES 
    (NEW.id, NULL, 45),
    (NEW.id, 'FEED', 10),
    (NEW.id, 'EXPLORE', 15);
  
  -- Initialize health visibility settings
  INSERT INTO public.health_visibility (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert default categories
INSERT INTO categories (name, icon, is_default) VALUES
  ('Yoga', '🧘', true),
  ('Pilates', '🤸', true),
  ('Meditation', '🧘‍♀️', true),
  ('Music', '🎵', true),
  ('Audiobook', '🎧', true),
  ('Podcast', '🎙️', true),
  ('Workout', '💪', true),
  ('Running', '🏃', true),
  ('Cycling', '🚴', true),
  ('Swimming', '🏊', true);

-- Insert default activity types
INSERT INTO activity_types (name, icon, color, is_default) VALUES
  ('Work', '💼', '#3B82F6', true),
  ('Exercise', '💪', '#10B981', true),
  ('Study', '📚', '#8B5CF6', true),
  ('Social', '👥', '#EC4899', true),
  ('Sleep', '😴', '#6366F1', true),
  ('Meal', '🍽️', '#F59E0B', true),
  ('Commute', '🚗', '#6B7280', true),
  ('Relaxation', '☕', '#14B8A6', true);