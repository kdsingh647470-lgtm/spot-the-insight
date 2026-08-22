
with ins as (
  insert into public.levels (world, level_number, title, difficulty, image_a_url, image_b_url, published, time_limit_seconds)
  values
    (3, 7, 'Lost City Ruins', 5, 'storage://adventure-quest/lost-city-a.webp', 'storage://adventure-quest/lost-city-b.webp', true, 180),
    (3, 8, 'River Rapids Camp', 5, 'storage://adventure-quest/river-rapids-a.webp', 'storage://adventure-quest/river-rapids-b.webp', true, 180),
    (3, 9, 'Volcano Outpost', 5, 'storage://adventure-quest/volcano-outpost-a.webp', 'storage://adventure-quest/volcano-outpost-b.webp', true, 180)
  returning id, level_number
)
insert into public.differences (level_id, x, y, radius, label)
select i.id, d.x, d.y, d.r, d.label
from ins i
join (values
  (7, 0.156, 0.521, 0.085, 'Tent'),
  (7, 0.125, 0.745, 0.055, 'Lantern'),
  (7, 0.305, 0.845, 0.065, 'Backpack'),
  (7, 0.916, 0.135, 0.060, 'Parrot'),
  (7, 0.496, 0.583, 0.070, 'Treasure chest'),
  (7, 0.754, 0.123, 0.050, 'Tower flag'),
  (7, 0.805, 0.750, 0.090, 'Stone idol'),
  (8, 0.640, 0.588, 0.085, 'Raft'),
  (8, 0.145, 0.867, 0.070, 'Cooler'),
  (8, 0.145, 0.617, 0.090, 'Tent'),
  (8, 0.875, 0.625, 0.055, 'Paddle'),
  (8, 0.840, 0.880, 0.070, 'Duffel bag'),
  (8, 0.762, 0.115, 0.060, 'Seagull'),
  (8, 0.473, 0.813, 0.055, 'Campfire'),
  (9, 0.191, 0.766, 0.100, 'Jeep'),
  (9, 0.375, 0.659, 0.050, 'Helmet'),
  (9, 0.910, 0.823, 0.065, 'Barrel'),
  (9, 0.547, 0.847, 0.065, 'Toolbox'),
  (9, 0.555, 0.700, 0.040, 'Oxygen tank'),
  (9, 0.832, 0.186, 0.055, 'Satellite dish'),
  (9, 0.703, 0.672, 0.095, 'Tent')
) as d(lvl, x, y, r, label) on d.lvl = i.level_number;
