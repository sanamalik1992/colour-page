-- ============================================
-- SEED: Print Pages (metadata only – no copyrighted content)
-- Run after supabase-upgrade-migration.sql
-- These are safe, original topic descriptions for library pages.
-- Actual image assets must be uploaded via admin panel.
-- ============================================

-- Categories seed (standalone table if needed, otherwise inline)
-- The categories are defined in the app code (PRINT_PAGE_CATEGORIES)

-- Animals
INSERT INTO print_pages (title, slug, description, category, tags, season, featured, is_published, sort_order) VALUES
  ('Cute Kittens Playing', 'cute-kittens-playing', 'Adorable kittens playing with yarn and toys', 'Animals', ARRAY['cats', 'kittens', 'cute'], NULL, true, true, 1),
  ('Playful Puppies', 'playful-puppies', 'Happy puppies playing in a garden', 'Animals', ARRAY['dogs', 'puppies', 'pets'], NULL, true, true, 2),
  ('Jungle Safari Animals', 'jungle-safari-animals', 'Lions, elephants, giraffes and zebras in the wild', 'Animals', ARRAY['jungle', 'safari', 'wild'], NULL, false, true, 3),
  ('Farm Animal Friends', 'farm-animal-friends', 'Cows, chickens, pigs and horses on the farm', 'Animals', ARRAY['farm', 'rural', 'barnyard'], NULL, false, true, 4),
  ('Ocean Dolphins', 'ocean-dolphins', 'Dolphins jumping through ocean waves', 'Animals', ARRAY['ocean', 'dolphins', 'sea'], NULL, false, true, 5),
  ('Tropical Birds', 'tropical-birds', 'Colourful parrots and toucans in the rainforest', 'Animals', ARRAY['birds', 'tropical', 'parrot'], NULL, false, true, 6),
  ('Butterfly Garden', 'butterfly-garden', 'Beautiful butterflies among flowers', 'Animals', ARRAY['butterflies', 'garden', 'insects'], NULL, true, true, 7)
ON CONFLICT (slug) DO NOTHING;

-- Dinosaurs
INSERT INTO print_pages (title, slug, description, category, tags, season, featured, is_published, sort_order) VALUES
  ('T-Rex Adventure', 'trex-adventure', 'Mighty T-Rex roaring in a prehistoric landscape', 'Dinosaurs', ARRAY['trex', 'carnivore', 'prehistoric'], NULL, true, true, 1),
  ('Friendly Triceratops', 'friendly-triceratops', 'A gentle triceratops munching on plants', 'Dinosaurs', ARRAY['triceratops', 'herbivore', 'horns'], NULL, false, true, 2),
  ('Flying Pterodactyl', 'flying-pterodactyl', 'A pterodactyl soaring over a volcanic island', 'Dinosaurs', ARRAY['pterodactyl', 'flying', 'prehistoric'], NULL, false, true, 3),
  ('Baby Dinosaurs Hatching', 'baby-dinos-hatching', 'Cute baby dinosaurs breaking out of their eggs', 'Dinosaurs', ARRAY['baby', 'eggs', 'cute'], NULL, true, true, 4),
  ('Dinosaur World', 'dinosaur-world', 'Multiple dinosaur species in a lush prehistoric forest', 'Dinosaurs', ARRAY['forest', 'multiple', 'scene'], NULL, false, true, 5)
ON CONFLICT (slug) DO NOTHING;

-- Fantasy
INSERT INTO print_pages (title, slug, description, category, tags, season, featured, is_published, sort_order) VALUES
  ('Enchanted Unicorn', 'enchanted-unicorn', 'A magical unicorn in a starlit meadow', 'Fantasy', ARRAY['unicorn', 'magic', 'stars'], NULL, true, true, 1),
  ('Brave Dragon', 'brave-dragon', 'A friendly dragon breathing colourful fire', 'Fantasy', ARRAY['dragon', 'fire', 'brave'], NULL, true, true, 2),
  ('Mermaid Kingdom', 'mermaid-kingdom', 'Beautiful mermaids swimming in a coral reef', 'Fantasy', ARRAY['mermaid', 'ocean', 'coral'], NULL, true, true, 3),
  ('Fairy Treehouse', 'fairy-treehouse', 'Tiny fairies living in a magical treehouse', 'Fantasy', ARRAY['fairy', 'treehouse', 'tiny'], NULL, false, true, 4),
  ('Knight and Castle', 'knight-and-castle', 'A brave knight guarding a grand castle', 'Fantasy', ARRAY['knight', 'castle', 'medieval'], NULL, false, true, 5),
  ('Wizard Tower', 'wizard-tower', 'A wizard casting spells from a tall tower', 'Fantasy', ARRAY['wizard', 'magic', 'tower'], NULL, false, true, 6)
ON CONFLICT (slug) DO NOTHING;

-- Space
INSERT INTO print_pages (title, slug, description, category, tags, season, featured, is_published, sort_order) VALUES
  ('Rocket to the Moon', 'rocket-to-the-moon', 'A rocket ship blasting off towards the moon', 'Space', ARRAY['rocket', 'moon', 'launch'], NULL, true, true, 1),
  ('Astronaut Explorer', 'astronaut-explorer', 'An astronaut floating in outer space with planets', 'Space', ARRAY['astronaut', 'planets', 'floating'], NULL, true, true, 2),
  ('Solar System', 'solar-system', 'All the planets of our solar system', 'Space', ARRAY['planets', 'sun', 'solar'], NULL, false, true, 3),
  ('Space Station', 'space-station', 'A space station orbiting Earth', 'Space', ARRAY['station', 'orbit', 'earth'], NULL, false, true, 4),
  ('Alien Friends', 'alien-friends', 'Friendly aliens on a colourful planet', 'Space', ARRAY['aliens', 'planet', 'friendly'], NULL, false, true, 5)
ON CONFLICT (slug) DO NOTHING;

-- Vehicles
INSERT INTO print_pages (title, slug, description, category, tags, season, featured, is_published, sort_order) VALUES
  ('Racing Cars', 'racing-cars', 'Fast racing cars on a track', 'Vehicles', ARRAY['cars', 'racing', 'speed'], NULL, true, true, 1),
  ('Fire Engine Rescue', 'fire-engine-rescue', 'A bright red fire engine with firefighters', 'Vehicles', ARRAY['fire engine', 'rescue', 'emergency'], NULL, false, true, 2),
  ('Pirate Ship', 'pirate-ship', 'A pirate ship sailing on the open seas', 'Vehicles', ARRAY['pirate', 'ship', 'sailing'], NULL, true, true, 3),
  ('Construction Site', 'construction-site', 'Bulldozers, cranes and diggers at work', 'Vehicles', ARRAY['construction', 'digger', 'crane'], NULL, false, true, 4),
  ('Hot Air Balloons', 'hot-air-balloons', 'Colourful hot air balloons floating in the sky', 'Vehicles', ARRAY['balloon', 'sky', 'floating'], NULL, false, true, 5)
ON CONFLICT (slug) DO NOTHING;

-- Nature
INSERT INTO print_pages (title, slug, description, category, tags, season, featured, is_published, sort_order) VALUES
  ('Sunflower Field', 'sunflower-field', 'Tall sunflowers in a sunny field', 'Nature', ARRAY['sunflower', 'field', 'flowers'], NULL, true, true, 1),
  ('Mountain Adventure', 'mountain-adventure', 'Majestic mountains with a winding trail', 'Nature', ARRAY['mountain', 'hiking', 'trail'], NULL, false, true, 2),
  ('Waterfall Paradise', 'waterfall-paradise', 'A beautiful waterfall in a tropical setting', 'Nature', ARRAY['waterfall', 'tropical', 'water'], NULL, false, true, 3),
  ('Garden of Flowers', 'garden-of-flowers', 'A lush garden with roses, tulips and daisies', 'Nature', ARRAY['garden', 'roses', 'tulips'], NULL, true, true, 4)
ON CONFLICT (slug) DO NOTHING;

-- Ocean
INSERT INTO print_pages (title, slug, description, category, tags, season, featured, is_published, sort_order) VALUES
  ('Coral Reef World', 'coral-reef-world', 'Tropical fish swimming through a coral reef', 'Ocean', ARRAY['coral', 'fish', 'tropical'], NULL, true, true, 1),
  ('Octopus Garden', 'octopus-garden', 'A friendly octopus surrounded by sea creatures', 'Ocean', ARRAY['octopus', 'underwater', 'creatures'], NULL, false, true, 2),
  ('Whale Adventure', 'whale-adventure', 'A blue whale swimming with its baby', 'Ocean', ARRAY['whale', 'baby', 'swimming'], NULL, false, true, 3),
  ('Turtle Beach', 'turtle-beach', 'Sea turtles on a sandy beach', 'Ocean', ARRAY['turtle', 'beach', 'sand'], NULL, false, true, 4)
ON CONFLICT (slug) DO NOTHING;

-- Food
INSERT INTO print_pages (title, slug, description, category, tags, season, featured, is_published, sort_order) VALUES
  ('Ice Cream Treats', 'ice-cream-treats', 'Colourful ice cream sundaes and cones', 'Food', ARRAY['ice cream', 'dessert', 'sweet'], NULL, true, true, 1),
  ('Fruit Basket', 'fruit-basket', 'A basket overflowing with fresh fruits', 'Food', ARRAY['fruit', 'basket', 'healthy'], NULL, false, true, 2),
  ('Pizza Party', 'pizza-party', 'A delicious pizza with toppings', 'Food', ARRAY['pizza', 'party', 'food'], NULL, false, true, 3),
  ('Cupcake Bakery', 'cupcake-bakery', 'Decorated cupcakes with frosting and sprinkles', 'Food', ARRAY['cupcake', 'bakery', 'frosting'], NULL, true, true, 4)
ON CONFLICT (slug) DO NOTHING;

-- Sports
INSERT INTO print_pages (title, slug, description, category, tags, season, featured, is_published, sort_order) VALUES
  ('Football Stars', 'football-stars', 'Football players in action on the pitch', 'Sports', ARRAY['football', 'soccer', 'sports'], NULL, true, true, 1),
  ('Basketball Slam Dunk', 'basketball-slam-dunk', 'A basketball player mid-air slam dunk', 'Sports', ARRAY['basketball', 'slam dunk', 'sports'], NULL, false, true, 2),
  ('Swimming Champions', 'swimming-champions', 'Swimmers racing in a pool', 'Sports', ARRAY['swimming', 'pool', 'race'], NULL, false, true, 3)
ON CONFLICT (slug) DO NOTHING;

-- Patterns
INSERT INTO print_pages (title, slug, description, category, tags, season, featured, is_published, sort_order) VALUES
  ('Mandala Patterns', 'mandala-patterns', 'Intricate mandala designs for relaxation', 'Patterns', ARRAY['mandala', 'relaxation', 'geometric'], NULL, true, true, 1),
  ('Geometric Shapes', 'geometric-shapes', 'Fun geometric patterns and tessellations', 'Patterns', ARRAY['geometric', 'tessellation', 'shapes'], NULL, false, true, 2),
  ('Floral Doodles', 'floral-doodles', 'Flowing floral doodle patterns', 'Patterns', ARRAY['floral', 'doodle', 'flowing'], NULL, false, true, 3)
ON CONFLICT (slug) DO NOTHING;

-- Seasonal: Ramadan / Eid
INSERT INTO print_pages (title, slug, description, category, tags, season, featured, is_published, sort_order) VALUES
  ('Ramadan Lanterns', 'ramadan-lanterns', 'Beautiful lanterns and crescent moon for Ramadan', 'Buildings', ARRAY['ramadan', 'lanterns', 'crescent'], 'ramadan', true, true, 1),
  ('Eid Mubarak Celebration', 'eid-mubarak-celebration', 'Mosque silhouette with crescent moon and stars', 'Buildings', ARRAY['eid', 'mosque', 'celebration'], 'eid', true, true, 2),
  ('Mosque Architecture', 'mosque-architecture', 'Beautiful mosque with detailed architecture', 'Buildings', ARRAY['mosque', 'architecture', 'islamic'], 'ramadan', false, true, 3)
ON CONFLICT (slug) DO NOTHING;

-- Seasonal: Christmas
INSERT INTO print_pages (title, slug, description, category, tags, season, featured, is_published, sort_order) VALUES
  ('Christmas Tree Decorations', 'christmas-tree-decorations', 'A Christmas tree decorated with ornaments and a star', 'Nature', ARRAY['christmas', 'tree', 'decorations'], 'christmas', true, true, 1),
  ('Santa Workshop', 'santa-workshop', 'Elves preparing presents in Santa workshop', 'Fantasy', ARRAY['santa', 'elves', 'workshop'], 'christmas', false, true, 2),
  ('Winter Snowman', 'winter-snowman', 'A jolly snowman with a carrot nose and top hat', 'Nature', ARRAY['snowman', 'winter', 'snow'], 'winter', true, true, 3)
ON CONFLICT (slug) DO NOTHING;

-- Seasonal: Halloween
INSERT INTO print_pages (title, slug, description, category, tags, season, featured, is_published, sort_order) VALUES
  ('Friendly Jack-o-Lantern', 'friendly-jack-o-lantern', 'A smiling pumpkin with bats and a harvest moon', 'Nature', ARRAY['halloween', 'pumpkin', 'bats'], 'halloween', true, true, 1),
  ('Haunted House', 'haunted-house', 'A spooky haunted house on a hill', 'Buildings', ARRAY['halloween', 'haunted', 'house'], 'halloween', false, true, 2)
ON CONFLICT (slug) DO NOTHING;

-- Seasonal: Diwali
INSERT INTO print_pages (title, slug, description, category, tags, season, featured, is_published, sort_order) VALUES
  ('Diwali Diya Lamps', 'diwali-diya-lamps', 'Beautiful diya lamps with rangoli patterns', 'Patterns', ARRAY['diwali', 'diya', 'rangoli'], 'diwali', true, true, 1)
ON CONFLICT (slug) DO NOTHING;

DO $$ BEGIN RAISE NOTICE 'Print pages seed data inserted!'; END $$;
