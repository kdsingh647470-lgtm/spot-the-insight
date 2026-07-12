
CREATE POLICY "admins upload level images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'level-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update level images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'level-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete level images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'level-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "authenticated read level images" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'level-images');
