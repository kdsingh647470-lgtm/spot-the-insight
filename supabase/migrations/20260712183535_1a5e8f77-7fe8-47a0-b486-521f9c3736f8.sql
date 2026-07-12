
-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  avatar_url TEXT,
  coins INT NOT NULL DEFAULT 100,
  xp INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles public read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles owner update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles owner insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- auto create profile + user role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- LEVELS
CREATE TABLE public.levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world INT NOT NULL DEFAULT 1,
  level_number INT NOT NULL DEFAULT 1,
  title TEXT NOT NULL DEFAULT 'Untitled',
  image_a_url TEXT NOT NULL,
  image_b_url TEXT NOT NULL,
  difficulty INT NOT NULL DEFAULT 1,
  is_daily BOOLEAN NOT NULL DEFAULT false,
  daily_date DATE,
  published BOOLEAN NOT NULL DEFAULT false,
  time_limit_seconds INT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.levels TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.levels TO authenticated;
GRANT ALL ON public.levels TO service_role;
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "published levels public" ON public.levels FOR SELECT USING (published = true);
CREATE POLICY "admins read all levels" ON public.levels FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage levels" ON public.levels FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- DIFFERENCES
CREATE TABLE public.differences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id UUID NOT NULL REFERENCES public.levels(id) ON DELETE CASCADE,
  x NUMERIC NOT NULL,
  y NUMERIC NOT NULL,
  radius NUMERIC NOT NULL DEFAULT 0.07,
  label TEXT
);
GRANT SELECT ON public.differences TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.differences TO authenticated;
GRANT ALL ON public.differences TO service_role;
ALTER TABLE public.differences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "differences readable when level published" ON public.differences FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.levels l WHERE l.id = differences.level_id AND l.published = true)
);
CREATE POLICY "admins manage differences" ON public.differences FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- COMPLETIONS
CREATE TABLE public.level_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level_id UUID NOT NULL REFERENCES public.levels(id) ON DELETE CASCADE,
  time_ms INT NOT NULL DEFAULT 0,
  hints_used INT NOT NULL DEFAULT 0,
  mistakes INT NOT NULL DEFAULT 0,
  stars INT NOT NULL DEFAULT 0,
  coins_earned INT NOT NULL DEFAULT 0,
  xp_earned INT NOT NULL DEFAULT 0,
  mode TEXT NOT NULL DEFAULT 'story',
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.level_completions TO anon;
GRANT SELECT, INSERT ON public.level_completions TO authenticated;
GRANT ALL ON public.level_completions TO service_role;
ALTER TABLE public.level_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "completions public read" ON public.level_completions FOR SELECT USING (true);
CREATE POLICY "own completions insert" ON public.level_completions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ACHIEVEMENTS
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  coin_reward INT NOT NULL DEFAULT 0,
  xp_reward INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.achievements TO anon, authenticated;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achievements public read" ON public.achievements FOR SELECT USING (true);

CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);
GRANT SELECT, INSERT ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_achievements TO service_role;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own achievements read" ON public.user_achievements FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own achievements insert" ON public.user_achievements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- DAILY REWARDS
CREATE TABLE public.daily_rewards (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_claim_date DATE,
  streak INT NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE ON public.daily_rewards TO authenticated;
GRANT ALL ON public.daily_rewards TO service_role;
ALTER TABLE public.daily_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own rewards" ON public.daily_rewards FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Seed achievements
INSERT INTO public.achievements (code, title, description, icon, coin_reward, xp_reward) VALUES
  ('first_level', 'First Steps', 'Complete your first level', 'sparkles', 50, 20),
  ('perfect_level', 'Eagle Eye', 'Complete a level with no mistakes and no hints', 'eye', 100, 50),
  ('speed_demon', 'Speed Demon', 'Complete a level in under 30 seconds', 'zap', 150, 75),
  ('streak_3', '3-Day Streak', 'Log in 3 days in a row', 'flame', 100, 50),
  ('streak_7', 'Weekly Warrior', 'Log in 7 days in a row', 'trophy', 300, 150),
  ('daily_5', 'Daily Devotee', 'Complete 5 daily challenges', 'calendar', 200, 100),
  ('level_10', 'Getting Good', 'Complete 10 levels', 'star', 200, 100),
  ('level_50', 'Difference Master', 'Complete 50 levels', 'crown', 500, 300),
  ('coin_1000', 'Coin Collector', 'Earn 1000 coins', 'coins', 100, 50),
  ('no_hints_5', 'Sharp Focus', 'Complete 5 levels without hints', 'target', 250, 125);
