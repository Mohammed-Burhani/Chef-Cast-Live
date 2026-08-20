# Design System — Foodilicious Live

<!-- impeccable:design-schema 1 -->

## Color Strategy

Committed — Rigel Red (#E3000F) and Brand Gold (#D4A017 / #FFC200) carry 35-45% of surface area. White ground (#FFFFFF) with warm neutral cards (#F7F7F8). Haier Red (#CC0000) as sponsor accent, distinct from Foodilicious neon red.

### Palette

| Token | Light | Dark | Role |
|-------|-------|------|------|
| background | #FFFFFF | #FFFFFF | Page ground |
| foreground | #1A1A1A | #1A1A1A | Primary text |
| surface | #F7F7F8 | #F7F7F8 | Card/panel background |
| border | rgba(200,150,0,0.22) | rgba(200,150,0,0.22) | Dividers, input borders |
| primary | #E3000F | #E3000F | Primary actions, live states |
| primaryForeground | #FFFFFF | #FFFFFF | Text on primary |
| accent | #D4A017 | #D4A017 | Gold accent, dividers, badges |
| accentForeground | #1A1A1A | #1A1A1A | Text on accent |
| muted | #F2F2F3 | #F2F2F3 | Secondary backgrounds |
| mutedForeground | #6B6B6B | #6B6B6B | Secondary text |
| live | #CC0000 | #CC0000 | Live badge, recording indicator |
| neonRed | #E3000F | #E3000F | Neon live accent, CTAs |
| success | #FFC200 | #FFC200 | Success states, brand gold |
| warning | #FFE500 | #FFE500 | Warning, secondary gold |
| haierRed | #CC0000 | #CC0000 | Haier sponsor primary |
| haierRedLight | rgba(204,0,0,0.1) | rgba(204,0,0,0.1) | Haier sponsor backgrounds |
| haierGold | #D4A017 | #D4A017 | Haier sponsor gold accent |

### Gradients

- **Brand Primary**: `linear-gradient(135deg, #E85200 0%, #FFC200 50%, #FFE500 100%)`
- **Brand Compact**: `linear-gradient(135deg, #E85200 0%, #FFC200 100%)`
- **Haier Sponsor**: `linear-gradient(135deg, #CC0000 0%, #D4A017 100%)`
- **Live Episode**: `linear-gradient(135deg, rgba(204,0,0,0.15) 0%, rgba(212,160,23,0.15) 100%)`
- **Surface Highlight**: `linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(247,247,248,1) 100%)`

### Radius

- **Base**: 16px (cards, buttons, inputs)
- **Large**: 24px (hero cards, banners)
- **Full**: 9999px (pills, badges, avatars)
- **Compact**: 12px (small chips, compact cards)

## Typography

### Faces

- **Display/Headlines**: Poppins (via @expo-google-fonts) — geometric, energetic, distinctive
- **Body/UI**: Inter (via @expo-google-fonts) — clean, legible, systematic

### Scale (rem, fixed — not fluid)

| Role | Size | Weight | Line Height | Tracking | Face |
|------|------|--------|-------------|----------|------|
| Display XL | 2.5rem (40px) | 800 | 1.1 | -0.02em | Poppins |
| Display LG | 2rem (32px) | 700 | 1.15 | -0.01em | Poppins |
| Display MD | 1.5rem (24px) | 700 | 1.2 | -0.01em | Poppins |
| Heading 1 | 1.25rem (20px) | 700 | 1.25 | 0 | Poppins |
| Heading 2 | 1.125rem (18px) | 600 | 1.3 | 0 | Poppins |
| Heading 3 | 1rem (16px) | 600 | 1.35 | 0 | Poppins |
| Body LG | 1rem (16px) | 400 | 1.5 | 0 | Inter |
| Body | 0.875rem (14px) | 400 | 1.5 | 0 | Inter |
| Body SM | 0.8125rem (13px) | 400 | 1.5 | 0 | Inter |
| Caption | 0.75rem (12px) | 500 | 1.4 | 0.01em | Inter |
| Label | 0.6875rem (11px) | 600 | 1.4 | 0.02em | Inter (uppercase) |
| Button | 0.875rem (14px) | 600 | 1.2 | 0 | Inter |
| Tab Label | 0.6875rem (11px) | 600 | 1.2 | 0.01em | Inter |

## Spacing System

Base unit: 4px. Scale: 1 (4px), 2 (8px), 3 (12px), 4 (16px), 5 (20px), 6 (24px), 8 (32px), 10 (40px), 12 (48px), 16 (64px).

- Section gap: 24px (6)
- Card padding: 16px (4) / 20px (5) / 24px (6)
- Component gap: 12px (3) / 16px (4)
- Horizontal page padding: 20px (5)

## Shadow & Elevation

| Level | Shadow | Use |
|-------|--------|-----|
| 0 | none | Flat cards on surface |
| 1 | 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04) | Default card |
| 2 | 0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04) | Elevated card, floating elements |
| 3 | 0 8px 24px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.06) | Modals, dropdowns, floating ad |
| 4 | 0 16px 48px rgba(204,0,0,0.15), 0 8px 16px rgba(204,0,0,0.1) | Live banner, Haier hero |

Haier sponsor elements use a red-tinted shadow (level 4) for distinction.

## Component Vocabulary

### Buttons

- **Primary**: Neon red background, white text, radius 16, padding 14px 24px, shadow level 1
- **Secondary**: White background, red border (2px), red text, radius 16
- **Ghost**: Transparent, red text, radius 12, padding 10px 16px
- **Haier Primary**: Haier red background, white text, radius 16, Haier red-tinted shadow
- **Haier Outline**: White background, Haier red border, Haier red text
- **Icon-only**: 40x40 or 48x48, radius full, surface background

States: hover (opacity 0.9), active (scale 0.98), disabled (opacity 0.4), loading (spinner)

### Cards

- **Default**: Surface background, radius 16, shadow level 1, padding 16
- **Elevated**: Surface background, radius 20, shadow level 2, padding 20
- **Haier Sponsor**: Surface background, radius 20, 2px Haier red border, Haier gradient top accent bar (4px), shadow level 2 with red tint
- **Episode**: Radius 16, overflow hidden, image cover, gradient overlay bottom
- **Recipe**: Width 160, radius 14, overflow hidden
- **Community**: Width 140, height 180, radius 14, gradient overlay

### Badges/Chips

- **Live**: Neon red background, white text, radius full, padding 4px 10px, label 10px weight 800
- **Haier**: Haier red background, white text, radius full
- **Status**: Accent gold background, foreground text
- **Count**: Radius full, min-width 16, height 16, centered

### Form Controls

- Input: Surface background, border 1px border token, radius 12, padding 12px 16px, placeholder mutedForeground
- Focus: Border primary, shadow 0 0 0 3px rgba(227,0,15,0.15)
- Error: Border destructive, shadow 0 0 0 3px rgba(227,0,15,0.15)

### Navigation

- **Tab Bar**: Custom animated (AnimatedTabBar) — capsule glides, icons pop, labels animate
- **Header**: Logo row + greeting + streak flame + notification bell with badge

## Motion Grammar

- **Entrance**: Staggered fade + slide up (100ms delay per item, 300ms duration, ease-out)
- **Tab Switch**: Capsule glide 300ms spring, icon scale pop 150ms
- **Card Press**: Scale 0.96, 100ms ease-out
- **Floating Ad**: Slide up from bottom 400ms spring, dismiss slide down 300ms ease-in
- **Live Badge Pulse**: 1.5s infinite, scale 1 ↔ 1.05, opacity 1 ↔ 0.7
- **Countdown**: Minute tick — no animation, just text update
- **Pull to Refresh**: Native refresh control

Reduced motion: All animations disabled except essential state changes (press feedback, loading).

## Layout Rules

- **Horizontal padding**: 20px constant (mobile), 24px (tablet), 32px (desktop web)
- **Section rhythm**: More space above heading (24px) than below (12px)
- **Horizontal scroll rails**: Content container padding-right 20px for scroll hint
- **Floating ad safe area**: Bottom padding + 120px minimum for tab bar clearance
- **Content width**: Full-width on mobile, max 720px centered on wide screens

## Haier Sponsor Integration Rules

1. **Splash Screen**: "PRESENTED BY Haier" top zone — existing, keep
2. **Home Hero**: Live episode banner includes Haier oven timer when live
3. **Sponsor Hub Section**: Dedicated section between Live/Upcoming and Progress — Haier logo, tagline, 3 appliance highlights with dummy images
4. **Recipe Cards**: Subtle "Haier [Appliance]" tag on recipes using oven/cooktop/fridge
5. **Floating Product Card**: Bottom-right, dismissible, horizontal carousel of 3-4 Haier kitchen appliance images (dummy), "Explore Haier Kitchen" CTA
6. **Color Distinction**: Haier red (#CC0000) vs Foodilicious neon red (#E3000F) — visibly different
7. **Tone**: "Your kitchen partner" not "Buy our appliances"

## Icon System

- Feather icons (existing) — consistent stroke weight 2px
- Custom Haier appliance icons: oven, refrigerator, cooktop, dishwasher (SVG, same stroke weight)
- Live: zap, radio, eye
- Gamification: flame, trophy, award, star

## Responsive Breakpoints

- **Mobile**: < 480px — single column, horizontal rails, compact cards
- **Tablet**: 480px - 768px — two-column where beneficial, wider rails
- **Desktop Web**: > 768px — centered max-width 720px, sidebar potential

## Surface Brief: Home Page

### Mode

Operate — users complete tasks (join live, set reminders, browse recipes, check progress, read announcements)

### Audience & Job

Home cooks opening app to: join live episode, see upcoming schedule, track progress, discover recipes, check community, read announcements

### Primary Action

Join Live Quiz (when live) / Set Reminder (upcoming) / Browse Recipes

### Proof/Content

- Live episode with real-time state
- Upcoming episodes with countdowns
- User XP/streak/badges
- Top recipes with images
- Community dish photos
- Team announcements
- Haier sponsor integration (oven timer, appliance tags, product showcase)

### Constraints

- Must preserve existing data hooks (useLiveEpisode, useEpisodes, useRecipes, etc.)
- Must preserve AnimatedTabBar and navigation structure
- Haier assets: sponsor-haier.png, sponsor-with.png logos
- Haier product images: need dummy placeholders (oven, fridge, cooktop, dishwasher)
- White theme enforced (both light/dark resolve to light)

### Memorable Moment

Live episode hero with Haier oven preheat countdown syncing to episode start — sponsor feels like cooking partner

### Unresolved

- Real Haier product photography (currently dummy)
- Animation polish for floating ad entrance/exit
- Desktop web layout refinement