# ChefCast Live - Supabase Setup

Complete database schema and setup for ChefCast Live.

## Quick Setup

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create new project

2. **Run Schema**
   ```bash
   # Run schema.sql in SQL Editor
   ```
   This creates:
   - All tables with indexes
   - Row Level Security policies
   - Storage buckets (avatars, dish-photos)
   - Triggers for auto profile creation
   - Realtime subscriptions

3. **Seed Test Data** (Optional)
   ```bash
   # Run seed.sql for test episodes/questions
   ```

4. **Update Environment**
   ```bash
   # Copy to .env.local
   EXPO_PUBLIC_SUPABASE_URL=your_project_url
   EXPO_PUBLIC_SUPABASE_KEY=your_anon_key
   ```

## Files

- **schema.sql** - Complete schema (tables, RLS, storage, triggers)
- **seed.sql** - Test data for development

## Database Structure

### Core Tables
- `profiles` - User profiles (auto-created on signup)
- `episodes` - Live cooking episodes
- `questions` - Quiz questions per episode
- `answers` - User responses
- `episode_scores` - Leaderboard scores

### Community Tables
- `dish_photos` - User cooking photos
- `dish_photo_likes` - Photo likes
- `comments` - Episode chat/comments
- `follows` - User relationships

### Storage Buckets
- `avatars` - Profile pictures (2MB limit)
- `dish-photos` - User dish photos (5MB limit)

## Onboarding Flow

1. **Welcome Screen** → Collect cooking level, cuisines, gender
2. **Signup Screen** → Email, username, password + onboarding data
3. **Auth Trigger** → Auto-create profile with metadata
4. **Anonymous Users** → Get default guest profile

Trigger extracts metadata from `raw_user_meta_data` on signup.

## Admin Setup

Run in SQL Editor after admin user signup:

```sql
UPDATE profiles 
SET is_admin = true 
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@example.com');
```

## Realtime

Tables with realtime enabled:
- `questions` - Active question updates
- `episode_scores` - Live leaderboard
- `episodes` - Episode status changes
- `dish_photos` - Community feed
- `comments` - Live chat

## Security

All tables use Row Level Security (RLS):
- Users read all public data
- Users write/update only own records
- Admin checks via `is_admin` flag
