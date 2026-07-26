DROP POLICY IF EXISTS "differences readable when level published" ON public.differences;
REVOKE SELECT ON public.differences FROM anon, authenticated;
GRANT ALL ON public.differences TO service_role;