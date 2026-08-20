
WITH ins AS (
  INSERT INTO public.levels (world, level_number, title, image_a_url, image_b_url, difficulty, time_limit_seconds, published)
  VALUES
    (3, 4, 'Cliff Rope Bridge', 'storage://adventure-quest/cliff-bridge-a.webp', 'storage://adventure-quest/cliff-bridge-b.webp', 2, 150, true),
    (3, 5, 'Crystal Cave Camp', 'storage://adventure-quest/crystal-cave-a.webp', 'storage://adventure-quest/crystal-cave-b.webp', 2, 150, true),
    (3, 6, 'Summit Base Camp', 'storage://adventure-quest/summit-camp-a.webp', 'storage://adventure-quest/summit-camp-b.webp', 2, 150, true)
  RETURNING id, level_number
)
INSERT INTO public.differences (level_id, x, y, radius, label)
SELECT ins.id, d.x, d.y, d.radius, d.label
FROM ins
JOIN (VALUES
  (4, 0.120, 0.200, 0.070, 'Signpost'),
  (4, 0.325, 0.430, 0.055, 'Lantern'),
  (4, 0.205, 0.600, 0.070, 'Backpack'),
  (4, 0.155, 0.830, 0.080, 'Rope coil'),
  (4, 0.885, 0.500, 0.060, 'Parrot'),
  (4, 0.865, 0.100, 0.060, 'Flag'),
  (5, 0.135, 0.450, 0.090, 'Tent'),
  (5, 0.145, 0.685, 0.070, 'Satchel'),
  (5, 0.915, 0.420, 0.060, 'Lantern'),
  (5, 0.800, 0.150, 0.075, 'Large crystal'),
  (5, 0.715, 0.400, 0.060, 'Small crystal'),
  (5, 0.770, 0.760, 0.090, 'Mossy boulder'),
  (6, 0.215, 0.520, 0.090, 'Tent'),
  (6, 0.390, 0.830, 0.090, 'Sled'),
  (6, 0.655, 0.480, 0.055, 'Thermos'),
  (6, 0.767, 0.665, 0.060, 'Oxygen tank'),
  (6, 0.895, 0.720, 0.070, 'Ice axe'),
  (6, 0.780, 0.160, 0.090, 'Prayer flags')
) AS d(lvl, x, y, radius, label) ON d.lvl = ins.level_number;
