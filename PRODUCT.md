# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React Native / Expo Router (existing codebase)

## Users

Primary: Home cooks learning from live cooking shows. They watch live cooking episodes, cook along in real-time, participate in live quizzes and challenges, earn XP and badges, and share their creations with the community.

Secondary: Aspiring chefs building skills through structured recipes, leaderboard competition, and streak-based gamification.

## Product Purpose

Foodilicious Live is a live cooking entertainment platform where home cooks watch professional chefs cook in real-time, cook along simultaneously, answer live quiz questions about techniques/ingredients, and build culinary skills through gamified progression (XP, streaks, badges, leaderboards).

Success = daily active users cooking along live episodes, high quiz participation, recipe completion rates, and community engagement (posts, likes, comments).

## Positioning

The only live cooking platform that combines real-time broadcast + synchronized cook-along + live interactive quiz + skill-building gamification in one seamless experience. Neighboring products offer either video content (YouTube, MasterClass) OR recipe apps (NYT Cooking, Yummly) OR social cooking (Tasty) — not all four simultaneously with live interactivity.

## Operating Context

- Mobile-first (iOS/Android via Expo), web secondary
- Live episodes scheduled weekly, ~30-60 min each
- Real-time quiz sync via WebSocket during broadcasts
- Community feed for sharing dish photos post-episode
- Sponsor (Haier) integration as presenting partner throughout experience

## Capabilities and Constraints

- Live episode streaming with real-time state (upcoming/live/ended)
- Synchronized quiz questions pushed during live broadcast
- XP/streak/badge gamification system
- Community posts with photos, likes, comments, hashtags
- Recipe library with search/filter
- Announcements from team
- Push notifications for live reminders
- Haier sponsor assets: logo (sponsor-haier.png), "with" logo (sponsor-with.png)
- Haier product images: need dummy kitchen appliance images (ovens, refrigerators, cooktops)

## Brand Commitments

- Name: Foodilicious Live (brand gradient: #E85200 → #FFC200 → #FFE500)
- Rigel Red (#CC0000 / #E3000F) for live states and primary actions
- Gold/amber accent (#D4A017) for accents, dividers, brand gradient
- White/light theme primary (both light/dark resolve to light palette)
- Haier as Presenting Sponsor — prominent but tasteful integration
- Typography: Poppins (headlines), Inter (body) via @expo-google-fonts

## Evidence on Hand

- Existing working app with tabs: Home, Community, Achievements, Profile, Cook-Along
- Live episode system with real-time events
- Gamification stores (XP, streaks, badges)
- Community feed with PostCard component
- Announcements system
- Sponsor logos in assets/logos/
- No Haier product photos yet — will use placeholder/dummy images

## Product Principles

1. **Live-first** — The live experience is the hero; everything else supports it
2. **Cook along, don't just watch** — Interactive participation > passive consumption
3. **Progress you can feel** — Streaks, XP, badges make skill growth tangible
4. **Community amplifies learning** — Sharing dishes and seeing others' results motivates
5. **Sponsor as partner, not interruption** — Haier integration feels natural to cooking context

## Accessibility & Inclusion

- WCAG AA contrast on light theme (primary palette)
- Dynamic type support via system font scaling
- Screen reader labels on interactive elements
- Reduced motion respect for animations