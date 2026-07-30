
with ins as (
  insert into public.levels (world, level_number, title, image_a_url, image_b_url, difficulty, published)
  values
    (2, 4, 'Jungle Waterfall', 'storage://seed/jungle_a.jpg', 'storage://seed/jungle_b.jpg', 5, true),
    (2, 5, 'Autumn Trail',     'storage://seed/trail_a.jpg',  'storage://seed/trail_b.jpg',  5, true),
    (2, 6, 'Coral Lagoon',     'storage://seed/reef_a.jpg',   'storage://seed/reef_b.jpg',   5, true)
  returning id, title
)
insert into public.differences (level_id, x, y, radius, label)
select i.id, d.x, d.y, d.radius, d.label
from ins i
join (values
  ('Jungle Waterfall', 0.72, 0.40, 0.06, 'Butterfly'),
  ('Jungle Waterfall', 0.57, 0.87, 0.06, 'Middle stone'),
  ('Jungle Waterfall', 0.835, 0.115, 0.06, 'Toucan beak colour'),
  ('Jungle Waterfall', 0.44, 0.10, 0.06, 'Cloud'),
  ('Jungle Waterfall', 0.94, 0.62, 0.07, 'Plant colour'),
  ('Jungle Waterfall', 0.24, 0.90, 0.06, 'Hibiscus flower'),
  ('Jungle Waterfall', 0.12, 0.29, 0.06, 'Banana'),
  ('Autumn Trail', 0.50, 0.15, 0.07, 'Lantern'),
  ('Autumn Trail', 0.86, 0.22, 0.06, 'Owl eyes'),
  ('Autumn Trail', 0.78, 0.70, 0.06, 'Acorn'),
  ('Autumn Trail', 0.14, 0.88, 0.08, 'Mushroom'),
  ('Autumn Trail', 0.13, 0.58, 0.07, 'Signpost arrow'),
  ('Autumn Trail', 0.32, 0.58, 0.08, 'Fence colour'),
  ('Autumn Trail', 0.53, 0.17, 0.06, 'Bird'),
  ('Coral Lagoon', 0.86, 0.22, 0.07, 'Seahorse'),
  ('Coral Lagoon', 0.18, 0.85, 0.07, 'Starfish colour'),
  ('Coral Lagoon', 0.59, 0.23, 0.06, 'Bubble'),
  ('Coral Lagoon', 0.45, 0.83, 0.06, 'Chest lock'),
  ('Coral Lagoon', 0.70, 0.52, 0.07, 'Turtle spots'),
  ('Coral Lagoon', 0.34, 0.45, 0.08, 'Coral colour'),
  ('Coral Lagoon', 0.60, 0.92, 0.06, 'Pink coral')
) as d(title, x, y, radius, label) on d.title = i.title;
