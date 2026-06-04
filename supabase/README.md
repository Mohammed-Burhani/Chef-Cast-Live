# Supabase Backend Setup

Complete backend configuration for Foodilicious: Live.

## Setup Steps

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Wait for database provisioning

### 2. Run Migrations
Copy contents of `migrations/001_initial_schema.sql` and run in Supabase SQL Editor.

This creates:
- 11 tables (profiles, episodes, questions, answers, episode_scores, badges, user_badges, dish_photos, dish_photo_likes, follows, push_tokens)
- All RLS policies
- Indexes for performance
- Realtime configuration
- 10 badge seed records

### 3. Configure Storage
Copy contents of `storage-buckets.sql` and run in Supabase SQL Editor.

Creates two buckets:
- `dish-photos` (5MB limit, public read)
- `avatars` (2MB limit, public read)

### 4. Update Environment Variables
1. Get your project URL and anon key from Supabase project settings
2. Update `.env.local` with real values:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   ```

### 5. Verify Setup
Run these queries in SQL Editor to verify:

```sql
-- Check tables created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check badges seeded
SELECT count(*) FROM badges; -- Should return 10

-- Check RLS enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public';

-- Check Realtime enabled
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

## Database Schema Overview

### Core Tables
- **profiles**: User data linked to auth.users
- **episodes**: Live quiz episodes
- **questions**: Quiz questions per episode
- **answers**: User responses with scoring
- **episode_scores**: Aggregate scores per user/episode

### Gamification
- **badges**: Achievement definitions (10 pre-seeded)
- **user_badges**: Badges earned by users

### Social Features
- **dish_photos**: User cooking photos
- **dish_photo_likes**: Photo likes
- **follows**: User follow relationships

### Infrastructure
- **push_tokens**: Device notification tokens

## RLS Security Model

- **Public read**: episodes, questions (filtered), episode_scores, badges, user_badges, dish_photos, likes, follows
- **Own data only**: profiles (update), answers, push_tokens
- **Service role only**: episode_scores (write), user_badges (write)

## Realtime Configuration

Enabled on:
- `questions` - Live question updates
- `episode_scores` - Live leaderboard
- `episodes` - Episode status changes
- `dish_photos` - New photo uploads

## Next Steps

1. Create Edge Functions for:
   - Score calculation and ranking
   - Badge awarding logic
   - Push notification triggers

2. Set up Supabase Auth providers (email, social)

3. Configure Storage CORS if needed for web

4. Add database functions for complex queries (leaderboards, stats)
