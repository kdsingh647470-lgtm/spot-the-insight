
with ins as (
  insert into public.levels (world, level_number, title, difficulty, image_a_url, image_b_url, time_limit_seconds, published)
  values
   (4,7,'Orbital Control Room',5,'storage://future-world/orbital-control-a.webp','storage://future-world/orbital-control-b.webp',180,true),
   (4,8,'Sky Train Platform',5,'storage://future-world/sky-platform-a.webp','storage://future-world/sky-platform-b.webp',180,true),
   (4,9,'Android Lab',5,'storage://future-world/android-lab-a.webp','storage://future-world/android-lab-b.webp',180,true)
  returning id, level_number
)
insert into public.differences (level_id, x, y, radius, label)
select i.id, d.x, d.y, d.radius, d.label
from ins i
join (values
 (7,0.150,0.700,0.070,'Pilot chair'),
 (7,0.450,0.770,0.060,'Holo globe'),
 (7,0.645,0.880,0.055,'Toolbox'),
 (7,0.710,0.440,0.055,'Coolant tank'),
 (7,0.870,0.250,0.065,'Robot arm'),
 (7,0.885,0.625,0.050,'Plant pot'),
 (7,0.845,0.730,0.050,'Helmet'),
 (8,0.120,0.480,0.070,'Vending machine'),
 (8,0.270,0.520,0.055,'Ticket kiosk'),
 (8,0.640,0.645,0.050,'Luggage bot'),
 (8,0.825,0.635,0.070,'Bench'),
 (8,0.865,0.400,0.055,'Lamp post'),
 (8,0.785,0.420,0.055,'Ad panel'),
 (8,0.472,0.850,0.055,'Suitcase'),
 (9,0.150,0.320,0.075,'Repair pod'),
 (9,0.360,0.320,0.060,'Flask liquid'),
 (9,0.600,0.320,0.070,'Android torso'),
 (9,0.855,0.420,0.075,'Tool cart'),
 (9,0.105,0.765,0.055,'Power cell'),
 (9,0.320,0.755,0.080,'Console'),
 (9,0.845,0.785,0.075,'Storage crate')
) as d(lvl, x, y, radius, label) on d.lvl = i.level_number;
