
-- 1) has_role → SECURITY INVOKER (user_roles has an own-row SELECT policy so this still works)
ALTER FUNCTION public.has_role(uuid, public.app_role) SECURITY INVOKER;

-- 2) handle_new_user is only used as a trigger; remove API-callable EXECUTE
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 3) Replace SECURITY DEFINER get_leaderboard with a limited view.
DROP FUNCTION IF EXISTS public.get_leaderboard();

CREATE OR REPLACE VIEW public.leaderboard AS
SELECT id, username, avatar_url, xp, level
FROM public.profiles
ORDER BY xp DESC
LIMIT 50;

GRANT SELECT ON public.leaderboard TO anon, authenticated;

-- 4) Restrict level-image storage reads to images of published levels
DROP POLICY IF EXISTS "anon read level images" ON storage.objects;
DROP POLICY IF EXISTS "authenticated read level images" ON storage.objects;

CREATE POLICY "read published level images" ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'level-images'
  AND EXISTS (
    SELECT 1 FROM public.levels l
    WHERE l.published = true
      AND ('storage://' || storage.objects.name) IN (l.image_a_url, l.image_b_url)
  )
);

-- Admins keep full read access for unpublished/draft images
CREATE POLICY "admins read all level images" ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'level-images'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);
