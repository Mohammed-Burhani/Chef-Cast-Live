# 🎬 ChefCast Live - Prototype Version

## Overview

This is **prototype branch** Supabase integration fully commented out. App use comprehensive mock data for demonstration.

## What Changed

### ✅ Supabase Integration Commented Out

All Supabase code commented but preserved for reference:

- **Authentication** (`lib/supabase.ts`, `store/authStore.ts`, `app/(auth)/login.tsx`)
  - Auto-login with mock user `prototype_chef`
  - No real OAuth/magic link
  
- **Database Queries** (All `.from()` calls)
  - Episodes → `MOCK_EPISODES`
  - Comments → `MOCK_LIVE_COMMENTS`  
  - Leaderboard → `MOCK_LEADERBOARD`
  - Quiz data → `MOCK_QUIZ_*` 

- **Realtime Subscriptions** (`lib/realtime/`, `components/live/CommentsTab.tsx`)
  - No live postgres_changes events
  - No broadcast events

- **Edge Functions** (`store/quizStore.ts`)
  - Quiz scoring mocked with random results

### ✅ Mock Data Added

Comprehensive mock data in `constants/mockData.ts`:

- **5 Episodes** (1 live, 4 upcoming)
- **Community posts** with photos, likes, timestamps
- **Live comments** from various users
- **Leaderboard** with scores and rankings
- **Quiz questions** with options and explanations
- **Live stats** (viewers, likes, comments)
- **Highlights** and featured moments
- **Top chefs** and trending recipes

All data realistic, looking like production app.

## Running Prototype

```bash
# Install dependencies
npm install

# Start Expo
npm start

# Prototype auto-logs you in as "prototype_chef"
```

## Features Working Without Supabase

✅ Browse episodes (live + upcoming)
✅ User progress dashboard with XP/badges/streak
✅ Community highlights feed
✅ Episode details page
✅ Live comments (local only, not synced)
✅ Quiz participation (mock scoring)
✅ Admin panel (mock controls)
✅ Authentication flow (auto-login)

## Restoring Supabase

To restore Supabase integration:

1. Uncomment all `/* SUPABASE CODE COMMENTED OUT */` blocks
2. Remove mock data fallbacks
3. Re-enable imports:
   - `import { supabase } from '@/lib/supabase'`
   - `import { signInWithGoogle, ... } from '@/lib/auth'`
4. Update `.env.local` with real credentials
5. Run migrations in `supabase/migrations/`

## Files Modified

### Core
- `lib/supabase.ts` - Client commented out
- `constants/mockData.ts` - Expanded with realistic data

### Auth
- `store/authStore.ts` - Mock session
- `app/(auth)/login.tsx` - Mock auth flow
- `app/(auth)/welcome.tsx` - Skip onboarding
- `lib/auth.ts` - OAuth helpers (unused)

### Data Fetching
- `app/(tabs)/index.tsx` - Home feed
- `app/admin.tsx` - Admin controls
- `app/episode/[id].tsx` - Episode detail
- `store/quizStore.ts` - Quiz scoring
- `store/commentStore.ts` - Comments
- `components/live/CommentsTab.tsx` - Live chat

### Realtime
- `lib/realtime/channelManager.ts` - (Not modified, unused)

## Notes

- All Supabase code preserved with `/* */` comments
- Search for `COMMENTED OUT FOR PROTOTYPE` to find all changes
- Mock user ID: `user-proto-001`
- Mock username: `prototype_chef`
- Live episode ID: `ep-001` (Italian Risotto Night)

---

**Branch:** `template` (prototype version)  
**Purpose:** Demo app without backend dependencies  
**Status:** ✅ Fully functional with mock data
