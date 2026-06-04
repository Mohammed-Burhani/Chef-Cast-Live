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
  INSERT INTO episodes (id, title, description, scheduled_at, is_live, youtube_stream_url, thumbnail_url) VALUES
  (
    ep_live_id,
    'Mastering French Onion Soup',
    'Learn the secrets to perfect caramelized onions and rich beef broth in this classic French bistro dish.',
    NOW() - INTERVAL '30 minutes',
    true,
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800'
  ),
  (
    ep_002_id,
    'Pan-Seared Duck Breast',
    'Achieve restaurant-quality crispy skin and perfectly pink duck breast with Chef Sophie''s technique.',
    NOW() + INTERVAL '2 hours',
    false,
    null,
    'https://images.unsplash.com/photo-1544025162-d76694265947?w=800'
  ),
  (
    ep_003_id,
    'Homemade Pasta Carbonara',
    'Traditional Roman carbonara with guanciale, pecorino, and the perfect creamy sauce.',
    NOW() + INTERVAL '1 day',
    false,
    null,
    'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800'
  ),
  (
    ep_004_id,
    'Thai Green Curry',
    'Authentic Thai green curry paste from scratch with coconut milk and fresh herbs.',
    NOW() + INTERVAL '2 days',
    false,
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

-- Insert sample dish photos
-- Note: Replace user_id with actual authenticated user IDs in production
