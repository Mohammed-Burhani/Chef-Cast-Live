# Installation Guide

## Prerequisites

- **Node.js** 18+ or **Bun** 1.0+
- **Expo Go** app on your mobile device (iOS/Android)
- **Git** for version control

## Step 1: Install Dependencies

Using Bun (recommended):
```bash
bun install
```

Or using npm:
```bash
npm install
```

## Step 2: Environment Setup

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Open `.env` and configure your Supabase credentials:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

> **Note:** You can get these from your Supabase project settings at https://app.supabase.com

## Step 3: Start Development Server

```bash
bun start
```

Or with npm:
```bash
npm start
```

## Step 4: Run on Device

### Option A: Physical Device (Recommended)
1. Install **Expo Go** from App Store (iOS) or Play Store (Android)
2. Scan the QR code shown in your terminal
3. The app will load on your device

### Option B: iOS Simulator (Mac only)
1. Press `i` in the terminal
2. Xcode and iOS Simulator must be installed

### Option C: Android Emulator
1. Press `a` in the terminal
2. Android Studio and an emulator must be set up

## Troubleshooting

### "Module not found" errors
```bash
# Clear cache and reinstall
rm -rf node_modules
bun install
```

### Expo Go connection issues
- Ensure your computer and phone are on the same WiFi network
- Try using tunnel mode: `bun start --tunnel`

### TypeScript errors
```bash
# Run type checking
bun typecheck
```

## Next Steps

- Read [README.md](./README.md) for feature overview
- Check [SETUP_GUIDE.md](./SETUP_GUIDE.md) for Supabase setup
- Review [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) for development tips

## Support

For issues or questions, refer to the documentation files or contact the development team.
