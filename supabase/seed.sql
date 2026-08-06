-- Seed Data for Foodilicious: Live
-- Run after migrations to populate test data

-- Store episode IDs in variables
DO $$
DECLARE
  ep_live_id UUID := gen_random_uuid();
  ep_002_id UUID := gen_random_uuid();
  ep_003_id UUID := gen_random_uuid();
  ep_004_id UUID := gen_random_uuid();
BEGIN
  -- Insert episodes
  INSERT INTO episodes (id, title, description, scheduled_at, is_live, status, youtube_url, thumbnail_url) VALUES
  (
    ep_live_id,
    'Mastering French Onion Soup',
    'Learn the secrets to perfect caramelized onions and rich beef broth in this classic French bistro dish.',
    NOW() - INTERVAL '30 minutes',
    true,
    'live',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800'
  ),
  (
    ep_002_id,
    'Pan-Seared Duck Breast',
    'Achieve restaurant-quality crispy skin and perfectly pink duck breast with Chef Sophie''s technique.',
    NOW() + INTERVAL '2 hours',
    false,
    'scheduled',
    null,
    'https://images.unsplash.com/photo-1544025162-d76694265947?w=800'
  ),
  (
    ep_003_id,
    'Homemade Pasta Carbonara',
    'Traditional Roman carbonara with guanciale, pecorino, and the perfect creamy sauce.',
    NOW() + INTERVAL '1 day',
    false,
    'scheduled',
    null,
    'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800'
  ),
  (
    ep_004_id,
    'Thai Green Curry',
    'Authentic Thai green curry paste from scratch with coconut milk and fresh herbs.',
    NOW() + INTERVAL '2 days',
    false,
    'scheduled',
    null,
    'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=800'
  );

  -- Insert questions for live episode
  INSERT INTO questions (episode_id, question_text, option_a, option_b, option_c, option_d, correct_option, timer_seconds, sequence_number) VALUES
  (
    ep_live_id,
    'What type of onions work best for French Onion Soup?',
    'Yellow onions',
    'Red onions',
    'White onions',
    'Shallots',
    'a',
    15,
    1
  ),
  (
    ep_live_id,
    'How long should you caramelize the onions?',
    '10-15 minutes',
    '30-40 minutes',
    '5 minutes',
    '1 hour',
    'b',
    15,
    2
  ),
  (
    ep_live_id,
    'What cheese is traditionally used on top?',
    'Mozzarella',
    'Cheddar',
    'Gruyère',
    'Parmesan',
    'c',
    15,
    3
  ),
  (
    ep_live_id,
    'What liquid deglazes the pan after caramelizing?',
    'Water',
    'White wine',
    'Red wine',
    'Vinegar',
    'b',
    15,
    4
  ),
  (
    ep_live_id,
    'What type of bread is best for the crouton?',
    'Sourdough',
    'White bread',
    'Baguette',
    'Rye bread',
    'c',
    15,
    5
  );
END $$;

-- Insert sample comments for live episode
-- Note: Replace user_id with actual authenticated user IDs in production
-- For testing, you can insert after creating test users

-- Insert sample recipes (blog-style, full recipe structure)
INSERT INTO recipes (title, description, image_url, author_name, difficulty, prep_time_minutes, cook_time_minutes, servings, ingredients, steps) VALUES
(
  'Saffron Risotto',
  'A creamy, luxurious Italian risotto infused with saffron and finished with Parmigiano-Reggiano.',
  'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=400',
  'Chef Marco',
  'medium',
  15,
  30,
  4,
  '[
    {"name": "Arborio rice", "amount": "1.5 cups", "isOptional": false},
    {"name": "Chicken or vegetable stock", "amount": "6 cups", "isOptional": false},
    {"name": "Saffron threads", "amount": "1 pinch", "isOptional": false},
    {"name": "White wine", "amount": "1/2 cup", "isOptional": false},
    {"name": "Parmesan cheese", "amount": "1 cup grated", "isOptional": false},
    {"name": "Butter", "amount": "3 tbsp", "isOptional": false},
    {"name": "Shallots", "amount": "2 minced", "isOptional": false},
    {"name": "Fresh parsley", "amount": "2 tbsp", "isOptional": true}
  ]'::jsonb,
  '[
    {"stepNumber": 1, "instruction": "Heat stock in a saucepan and keep warm. Steep saffron in 1/4 cup hot stock.", "durationSeconds": 300},
    {"stepNumber": 2, "instruction": "In a large pan, sauté shallots in butter until translucent.", "durationSeconds": 180},
    {"stepNumber": 3, "instruction": "Add rice and toast for 2 minutes, stirring constantly.", "durationSeconds": 120},
    {"stepNumber": 4, "instruction": "Pour in wine and stir until absorbed.", "durationSeconds": 180},
    {"stepNumber": 5, "instruction": "Add stock one ladle at a time, stirring frequently until absorbed before adding more.", "durationSeconds": 1200},
    {"stepNumber": 6, "instruction": "Stir in saffron stock and Parmesan, season, and serve with parsley.", "durationSeconds": 300}
  ]'::jsonb
),
(
  'Duck Breast with Cherry Glaze',
  'Crispy-skin duck breast with a glossy tart-cherry reduction, ideal for a special dinner.',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400',
  'Chef Sophie',
  'hard',
  20,
  25,
  2,
  '[
    {"name": "Duck breast", "amount": "2", "isOptional": false},
    {"name": "Cherries (fresh or frozen)", "amount": "1.5 cups", "isOptional": false},
    {"name": "Red wine", "amount": "1/2 cup", "isOptional": false},
    {"name": "Balsamic vinegar", "amount": "1 tbsp", "isOptional": false},
    {"name": "Honey", "amount": "1 tbsp", "isOptional": false},
    {"name": "Butter", "amount": "1 tbsp", "isOptional": false},
    {"name": "Salt and pepper", "amount": "to taste", "isOptional": false}
  ]'::jsonb,
  '[
    {"stepNumber": 1, "instruction": "Score duck skin in a crosshatch pattern and season both sides.", "durationSeconds": 300},
    {"stepNumber": 2, "instruction": "Sear skin-side down in a cold pan over medium heat until golden and crisp.", "durationSeconds": 600},
    {"stepNumber": 3, "instruction": "Flip and cook to medium-rare (135°F), then rest 5 minutes.", "durationSeconds": 600},
    {"stepNumber": 4, "instruction": "Deglaze pan with wine, add cherries, balsamic, and honey; reduce to a glaze.", "durationSeconds": 420},
    {"stepNumber": 5, "instruction": "Slice duck, spoon glaze over, and serve.", "durationSeconds": 300}
  ]'::jsonb
),
(
  'French Onion Soup',
  'Slow-caramelized onions in rich beef broth topped with a Gruyère crouton — the bistro classic.',
  'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400',
  'Chef Jean-Pierre',
  'easy',
  20,
  45,
  4,
  '[
    {"name": "Yellow onions", "amount": "6 large", "isOptional": false},
    {"name": "Beef stock", "amount": "8 cups", "isOptional": false},
    {"name": "Butter", "amount": "4 tbsp", "isOptional": false},
    {"name": "White wine", "amount": "1/2 cup", "isOptional": false},
    {"name": "Baguette", "amount": "1/2 loaf", "isOptional": false},
    {"name": "Gruyère cheese", "amount": "2 cups grated", "isOptional": false},
    {"name": "Thyme sprigs", "amount": "3", "isOptional": true}
  ]'::jsonb,
  '[
    {"stepNumber": 1, "instruction": "Melt butter and caramelize onions slowly over medium-low heat until deep golden.", "durationSeconds": 1800},
    {"stepNumber": 2, "instruction": "Deglaze with wine, scraping up the fond.", "durationSeconds": 180},
    {"stepNumber": 3, "instruction": "Add stock and thyme, simmer 20 minutes, and season.", "durationSeconds": 1200},
    {"stepNumber": 4, "instruction": "Toast baguette slices, top with Gruyère, and melt under broiler on the soup.", "durationSeconds": 420}
  ]'::jsonb
);

-- Insert sample dish photos
-- Note: Replace user_id with actual authenticated user IDs in production
