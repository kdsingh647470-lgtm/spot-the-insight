
with ins as (
  insert into public.levels (world, level_number, title, image_a_url, image_b_url, difficulty, time_limit_seconds, published)
  values
    (2, 13, 'Sunflower Field', 'storage://nature-escape/sunflower-field-a.jpg', 'storage://nature-escape/sunflower-field-b.jpg', 3, 150, true),
    (2, 14, 'Misty Lakeside Dock', 'storage://nature-escape/lakeside-dock-a.jpg', 'storage://nature-escape/lakeside-dock-b.jpg', 3, 150, true),
    (2, 15, 'Rocky Creek', 'storage://nature-escape/rocky-creek-a.jpg', 'storage://nature-escape/rocky-creek-b.jpg', 3, 150, true)
  returning id, title
)
insert into public.differences (level_id, x, y, radius, label)
select i.id, d.x, d.y, d.radius, d.label from ins i
join (values
  ('Sunflower Field', 0.203, 0.740, 0.075, 'Bicycle colour'),
  ('Sunflower Field', 0.289, 0.583, 0.062, 'Basket flowers'),
  ('Sunflower Field', 0.480, 0.516, 0.060, 'Well roof'),
  ('Sunflower Field', 0.145, 0.427, 0.060, 'Crow on post'),
  ('Sunflower Field', 0.420, 0.245, 0.060, 'Missing cloud'),
  ('Sunflower Field', 0.590, 0.333, 0.065, 'Extra cloud'),
  ('Misty Lakeside Dock', 0.230, 0.306, 0.062, 'Lantern colour'),
  ('Misty Lakeside Dock', 0.478, 0.807, 0.075, 'Rowboat colour'),
  ('Misty Lakeside Dock', 0.796, 0.833, 0.060, 'Missing duck'),
  ('Misty Lakeside Dock', 0.211, 0.781, 0.060, 'Fishing rod'),
  ('Misty Lakeside Dock', 0.109, 0.750, 0.060, 'Fish in bucket'),
  ('Misty Lakeside Dock', 0.930, 0.396, 0.062, 'Autumn tree'),
  ('Rocky Creek', 0.243, 0.145, 0.060, 'Bluebird'),
  ('Rocky Creek', 0.250, 0.565, 0.060, 'Swing seat'),
  ('Rocky Creek', 0.117, 0.750, 0.068, 'Mushroom colour'),
  ('Rocky Creek', 0.520, 0.470, 0.070, 'Bridge railing'),
  ('Rocky Creek', 0.745, 0.400, 0.062, 'Waterfall'),
  ('Rocky Creek', 0.855, 0.640, 0.070, 'Deer')
) as d(title, x, y, radius, label) on d.title = i.title;
