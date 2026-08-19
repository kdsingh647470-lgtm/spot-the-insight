
DO $$
DECLARE l1 uuid := gen_random_uuid(); l2 uuid := gen_random_uuid(); l3 uuid := gen_random_uuid();
BEGIN
INSERT INTO public.levels (id, world, level_number, title, image_a_url, image_b_url, difficulty, published, time_limit_seconds)
VALUES
 (l1, 3, 1, 'Jungle Temple', 'storage://adventure-quest/jungle-temple-a.webp', 'storage://adventure-quest/jungle-temple-b.webp', 1, true, 120),
 (l2, 3, 2, 'Pirate Cove', 'storage://adventure-quest/pirate-cove-a.webp', 'storage://adventure-quest/pirate-cove-b.webp', 1, true, 120),
 (l3, 3, 3, 'Desert Canyon', 'storage://adventure-quest/desert-canyon-a.webp', 'storage://adventure-quest/desert-canyon-b.webp', 1, true, 120);

INSERT INTO public.differences (level_id, x, y, radius, label) VALUES
 (l1, 0.181, 0.335, 0.06, 'Lantern glass color'),
 (l1, 0.262, 0.790, 0.06, 'Backpack color'),
 (l1, 0.925, 0.330, 0.06, 'Temple banner color'),
 (l1, 0.752, 0.300, 0.06, 'Parrot feathers'),
 (l1, 0.815, 0.760, 0.06, 'Treasure chest coins'),
 (l2, 0.247, 0.085, 0.06, 'Pirate flag color'),
 (l2, 0.800, 0.500, 0.07, 'Tent stripes color'),
 (l2, 0.888, 0.800, 0.06, 'Barrel color'),
 (l2, 0.617, 0.845, 0.06, 'Campfire flame color'),
 (l2, 0.205, 0.820, 0.07, 'Treasure chest color'),
 (l3, 0.355, 0.560, 0.07, 'Jeep body color'),
 (l3, 0.525, 0.715, 0.06, 'Cooler box color'),
 (l3, 0.737, 0.735, 0.06, 'Fuel can color'),
 (l3, 0.565, 0.150, 0.06, 'Hot air balloon color'),
 (l3, 0.835, 0.420, 0.07, 'Cactus color');
END $$;
