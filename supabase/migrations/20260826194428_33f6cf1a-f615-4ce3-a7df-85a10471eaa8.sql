with ins as (
  insert into public.levels (world, level_number, title, difficulty, time_limit_seconds, published, image_a_url, image_b_url)
  values
    (4, 10, 'Sky Garden Pod', 1, 120, true, 'storage://future-world/sky-garden-a.webp', 'storage://future-world/sky-garden-b.webp'),
    (4, 11, 'Drone Delivery Bay', 1, 120, true, 'storage://future-world/drone-bay-a.webp', 'storage://future-world/drone-bay-b.webp'),
    (4, 12, 'Hologram Classroom', 1, 120, true, 'storage://future-world/holo-class-a.webp', 'storage://future-world/holo-class-b.webp')
  returning id, title
)
insert into public.differences (level_id, x, y, radius, label)
select ins.id, d.x, d.y, d.r, d.label
from ins
join (values
  ('Sky Garden Pod', 0.571, 0.795, 0.070, 'Flower pot colour'),
  ('Sky Garden Pod', 0.835, 0.680, 0.080, 'Bench colour'),
  ('Sky Garden Pod', 0.805, 0.855, 0.070, 'Toolbox colour'),
  ('Sky Garden Pod', 0.932, 0.360, 0.070, 'Wall hose colour'),
  ('Sky Garden Pod', 0.083, 0.117, 0.060, 'Shelf plant colour'),
  ('Drone Delivery Bay', 0.402, 0.418, 0.062, 'Left drone colour'),
  ('Drone Delivery Bay', 0.500, 0.805, 0.090, 'Landing pad colour'),
  ('Drone Delivery Bay', 0.855, 0.195, 0.060, 'Warning sign colour'),
  ('Drone Delivery Bay', 0.955, 0.520, 0.070, 'Robot arm colour'),
  ('Drone Delivery Bay', 0.842, 0.655, 0.055, 'Conveyor parcel colour'),
  ('Hologram Classroom', 0.283, 0.350, 0.072, 'Teacher robot colour'),
  ('Hologram Classroom', 0.415, 0.860, 0.065, 'Backpack colour'),
  ('Hologram Classroom', 0.580, 0.865, 0.065, 'Stool colour'),
  ('Hologram Classroom', 0.060, 0.900, 0.070, 'Corner plant pot colour'),
  ('Hologram Classroom', 0.565, 0.672, 0.045, 'Pencil cup colour')
) as d(title, x, y, r, label) on d.title = ins.title;