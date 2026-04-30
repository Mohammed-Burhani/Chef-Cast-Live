# ChefCast: Live

> **Watch. Play. Compete.**

A cross-platform mobile companion app for a live cooking television series. Transform passive viewing into a real-time, competitive quiz experience with live leaderboards, XP rewards, badges, and a vibrant community.

## 🎯 Overview

ChefCast: Live is built with Expo React Native and Supabase, featuring:

- **Live Quiz Mode** - Real-time trivia during broadcasts with speed bonuses
- **Competitive Leaderboards** - Global and friends rankings updated live
- **XP & Leveling** - Progress from Prep Cook to Master Chef
- **Badge System** - 10 achievements to unlock
- **Community Feed** - Share and discover dish photos
- **Voice Commands** - Hands-free navigation during quizzes
- **Push Notifications** - Stay updated on episodes and achievements
- **AR Plating Visualizer** - Overlay plating guides on your camera

## 🚀 Quick Start

```bash
# Install dependencies
bun install

# Copy environment template
cp .env.example .env

# Configure your Supabase credentials in .env
# Then start the development server
bun start
```

For detailed setup instructions, see [SETUP_GUIDE.md](./SETUP_GUIDE.md).

## 📱 Features

### Live Quiz Mode
- Real-time question delivery synchronized with TV broadcast
- 100 base points + up to 50 speed bonus per correct answer
- Late join support (no penalty for missed questions)
- Countdown timer with haptic feedback
- Confetti celebration for correct answers
- Answer reveal with color feedback

### Gamification
- **6 Levels:** Prep Cook → Master Chef (0 to 10,000 XP)
- **7 XP Events:** Correct answers, perfect episodes, top finishes, photos, mystery box
- **10 Badges:** First Answer, Perfect Round, Speed King, Top 3, Comeback Kid, and more
- **Streak Tracking:** Daily cooking streaks with flame indicator

### Community
- Masonry grid photo feed
- Real-time updates during live episodes
- Like and comment on dishes
- Filter by episode or time period
- Ask the Chef Q&A section

### Voice Commands
- "Answer A/B/C/D" - Select answer
- "Leaderboard" - Show rankings
- "My rank" - Hear your position
- "How long" - Hear remaining time
- "Tips" - View tips
- "Home" - Go home

## 🛠 Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | Expo SDK 52+ / React Native 0.76+ |
| Routing | Expo Router v3 (file-based) |
| Styling | NativeWind v4 (Tailwind CSS) |
| State | Zustand v4 + TanStack Query v5 |
| Backend | Supabase (PostgreSQL, Realtime, Auth, Storage) |
| Animations | Reanimated v3 + Lottie |
| Storage | react-native-mmkv |
| Notifications | expo-notifications |
| Subscriptions | RevenueCat |
| Analytics | Mixpanel + Sentry |

## 📂 Project Structure

```
chefcast-live/
├── app/                    # Expo Router screens
│   ├── (auth)/            # Login, signup, welcome
│   ├── (tabs)/            # Home, community, cook-along, pantry, profile
│   └── episode/           # Episode detail
├── components/            # Reusable UI components
├── constants/             # App constants (badges, XP, colors)
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities (Supabase, voice, notifications)
├── store/                 # Zustand state management
├── types/                 # TypeScript definitions
└── assets/                # Images and fonts
```

## 📖 Documentation

- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Complete setup and development guide
- **[CHANGELOG_V2.md](./CHANGELOG_V2.md)** - Detailed v2.0 changes
- **[V2_IMPLEMENTATION_SUMMARY.md](./V2_IMPLEMENTATION_SUMMARY.md)** - Implementation overview
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Quick reference for developers
- **ChefCast-Feature-Documentation-v2.docx** - Official specification

## 🎮 Usage

### Running the App

```bash
# Start development server
bun start

# iOS Simulator
bun start
# Then press 'i'

# Android Emulator
bun start
# Then press 'a'

# Physical device
# Scan QR code with Expo Go app
```

### Testing Quiz Flow

1. Navigate to home screen
2. Tap "Join Live Quiz" on live episode banner
3. Answer questions within time limit
4. View leaderboard after each question
5. Complete all questions for final results

### Awarding XP

```typescript
import { useGamificationStore } from '@/store/useGamificationStore';

const { awardXP } = useGamificationStore();
await awardXP('CORRECT_ANSWER', 'Great job!');
```

### Unlocking Badges

```typescript
const { unlockBadge } = useGamificationStore();
await unlockBadge('first_answer');
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file with:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=your-ios-key
EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID=your-android-key
EXPO_PUBLIC_MIXPANEL_TOKEN=your-token
EXPO_PUBLIC_SENTRY_DSN=your-dsn
```

### Supabase Setup

1. Create a Supabase project
2. Run the SQL schema from [SETUP_GUIDE.md](./SETUP_GUIDE.md)
3. Create storage buckets: `dish-photos`, `plating-guides`, `episode-thumbnails`, `user-avatars`
4. Enable Realtime for: `quiz_questions`, `leaderboard`, `episodes`, `community_posts`

## 🧪 Testing

```bash
# Type checking
bun typecheck

# Run tests (when implemented)
bun test

# E2E tests (when implemented)
bun test:e2e
```

## 📦 Building

```bash
# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Build for both
eas build --platform all
```

## 🚢 Deployment

```bash
# Submit to App Store
eas submit --platform ios

# Submit to Play Store
eas submit --platform android
```

## 📊 Implementation Status

### ✅ Completed (v2.0)
- Core app structure with Expo Router
- Authentication flow UI
- Live quiz state machine
- XP and leveling system (6 levels)
- Badge system (10 badges)
- Community feed UI
- Profile and settings
- Mock data for development
- Supabase integration library
- Voice commands library
- Push notifications library
- Comprehensive documentation

### 🚧 In Progress
- Supabase backend integration
- Real-time quiz delivery
- Live leaderboard updates
- Push notification triggers

### 📋 Planned
- AR Plating Visualizer
- Voice command UI integration
- RevenueCat subscriptions
- Mixpanel analytics
- Sentry error tracking
- Confetti animations
- Advanced haptic feedback

## 🤝 Contributing

This is a confidential internal project. For questions or issues:

1. Review the documentation files
2. Check the [SETUP_GUIDE.md](./SETUP_GUIDE.md)
3. Consult the [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
4. Contact the development team

## 📄 License

Confidential - Internal Use Only

## 🙏 Acknowledgments

Built with:
- [Expo](https://expo.dev/)
- [React Native](https://reactnative.dev/)
- [Supabase](https://supabase.com/)
- [NativeWind](https://www.nativewind.dev/)
- [Zustand](https://zustand-demo.pmnd.rs/)

---

**Version:** 2.0  
**Platform:** iOS & Android  
**Theme:** Dark Mode (optimized for TV viewing)  
**Status:** Core Implementation Complete
