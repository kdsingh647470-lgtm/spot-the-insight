UPDATE public.levels SET
  image_a_url = regexp_replace(image_a_url, '\.(png|jpg|jpeg)$', '.webp'),
  image_b_url = regexp_replace(image_b_url, '\.(png|jpg|jpeg)$', '.webp')
WHERE image_a_url LIKE 'storage://%' OR image_b_url LIKE 'storage://%';