
-- Restrict profiles SELECT to owner
DROP POLICY IF EXISTS "profiles public read" ON public.profiles;
CREATE POLICY "profiles owner select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

-- Restrict level_completions SELECT to owner
DROP POLICY IF EXISTS "completions public read" ON public.level_completions;
CREATE POLICY "completions owner select" ON public.level_completions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Revoke has_role EXECUTE from callable roles; it is used only from RLS policies where it runs as SECURITY DEFINER
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;

-- Provide a safe leaderboard function exposing only non-sensitive columns
CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE (id uuid, username text, avatar_url text, xp integer, level integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, username, avatar_url, xp, level
  FROM public.profiles
  ORDER BY xp DESC
  LIMIT 50
$$;
REVOKE EXECUTE ON FUNCTION public.get_leaderboard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO anon, authenticated;
