
with l as (
  insert into public.levels (world, level_number, title, image_a_url, image_b_url, difficulty, is_daily, published, time_limit_seconds) values
  (4,1,'Neon Rooftop','storage://future-world/neon-rooftop-a.webp','storage://future-world/neon-rooftop-b.webp',1,false,true,120),
  (4,2,'Robot Workshop','storage://future-world/robot-workshop-a.webp','storage://future-world/robot-workshop-b.webp',1,false,true,120),
  (4,3,'Station Lounge','storage://future-world/station-lounge-a.webp','storage://future-world/station-lounge-b.webp',1,false,true,120),
  (4,4,'Hover Car Garage','storage://future-world/hover-garage-a.webp','storage://future-world/hover-garage-b.webp',3,false,true,150),
  (4,5,'Mars Colony Dome','storage://future-world/mars-colony-a.webp','storage://future-world/mars-colony-b.webp',3,false,true,150),
  (4,6,'Cyber Market Street','storage://future-world/cyber-market-a.webp','storage://future-world/cyber-market-b.webp',3,false,true,150)
  returning id, level_number
)
insert into public.differences (level_id, x, y, radius, label)
select l.id, d.x, d.y, 0.06, d.label
from l
join (values
  (1,0.168,0.135,'Drone color'),(1,0.113,0.417,'Plant color'),(1,0.875,0.156,'Satellite dish color'),(1,0.852,0.813,'Crate color'),(1,0.180,0.781,'Bench color'),
  (2,0.199,0.172,'Monitor color'),(2,0.816,0.250,'Battery color'),(2,0.176,0.755,'Toolbox color'),(2,0.508,0.839,'Wrench color'),(2,0.863,0.792,'Oil can color'),
  (3,0.180,0.182,'Wall clock color'),(3,0.855,0.276,'Locker color'),(3,0.512,0.552,'Coffee cup color'),(3,0.223,0.677,'Armchair color'),(3,0.512,0.870,'Robot vacuum color'),
  (4,0.113,0.135,'Warning sign color'),(4,0.094,0.365,'Helmet color'),(4,0.875,0.229,'Charging station color'),(4,0.168,0.792,'Tool cart color'),(4,0.512,0.833,'Traffic cone color'),(4,0.859,0.792,'Fuel canister color'),
  (5,0.176,0.250,'Solar panel color'),(5,0.785,0.302,'Antenna tower color'),(5,0.918,0.500,'Oxygen tank color'),(5,0.141,0.688,'Rover body color'),(5,0.504,0.823,'Supply crate color'),(5,0.789,0.844,'Plant box color'),
  (6,0.195,0.156,'Awning color'),(6,0.555,0.188,'Lantern color'),(6,0.844,0.167,'Hologram fish color'),(6,0.539,0.531,'Noodle sign color'),(6,0.234,0.792,'Scooter color'),(6,0.625,0.833,'Trash bin color')
) as d(lvl, x, y, label) on d.lvl = l.level_number;
