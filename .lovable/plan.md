# Spot the Difference AI — Build Plan

Full vertical slice: playable game + Cloud backend + admin CMS + AI-generated level art + ad/subscription placeholders. This is large; I'll ship it in one pass but expect a follow-up polish turn.

## Tech
- TanStack Start (React 19, TS, Vite) — already scaffolded
- Tailwind v4 + Material Design 3 tokens, light/dark
- Lovable Cloud (Supabase) — auth, DB, storage, RLS
- Lovable AI Gateway (`google/gemini-3.1-flash-image`) — generate paired level images with 5 differences
- TanStack Query for data
- PWA: manifest + icons (installable, no offline SW to keep preview safe)

## Data model (migrations)
- `profiles` (id → auth.users, username, avatar_url, coins, xp, level, created_at)
- `app_role` enum (`admin`,`user`) + `user_roles` + `has_role()` security-definer
- `levels` (id, world, level_number, title, image_a_url, image_b_url, difficulty, is_daily, daily_date, published, created_by, created_at)
- `differences` (id, level_id, x, y, radius) — normalized 0–1 coords
- `level_completions` (id, user_id, level_id, time_ms, hints_used, mistakes, stars, coins_earned, completed_at)
- `achievements` (id, code, title, description, icon, coin_reward) + `user_achievements`
- `daily_rewards` (user_id, last_claim_date, streak)
- Storage bucket `level-images` (public read)
- RLS + GRANTs for every table; leaderboard = public read of aggregate view

## Server functions / routes
- `src/routes/api/generate-level-images.ts` — streaming image gen (admin-only, SSE)
- `src/lib/levels.functions.ts` — `getLevel`, `getDailyLevel`, `listLevels`, `submitCompletion`, `getLeaderboard`
- `src/lib/admin.functions.ts` — `createLevel`, `publishLevel`, `deleteLevel` (has_role admin)
- `src/lib/profile.functions.ts` — `getProfile`, `claimDailyReward`, `listAchievements`

## Routes
- `/` — home / mode picker (Daily, Infinite, Timed, Relax) + login CTA
- `/auth` — email/password + Google
- `/play/$mode/$levelId?` — the game screen (two images, diff detection, timer, lives, hints, pause)
- `/leaderboard`
- `/profile` — stats, achievements, coins, XP
- `/_authenticated/admin` — list + create levels
- `/_authenticated/admin/levels/$id` — visual diff coordinate picker (click on image A to place circles)
- Standard `_authenticated/route.tsx` managed layout

## Game UX
- Side-by-side on landscape/tablet, stacked on mobile portrait
- Tap radius tolerance ~7% of image width
- Correct → green ripple + sound + score +100
- Wrong → shake + red X + −1 life (3 lives)
- Hint → highlight one remaining diff (costs 50 coins after first free hint)
- Timer, pause modal, win/lose sheets, star rating (3★ = no hints/mistakes)
- Material Design 3 tokens (primary purple #6750A4), dark mode toggle in header
- Framer-motion micro-animations

## Monetization placeholders
- `<AdBanner slot="..."/>` and `<RewardedAdButton onReward={..}/>` stub components
- "Premium" toggle on profile (no billing yet)

## PWA
- `public/manifest.webmanifest` + 192/512 icons (generated), theme color, standalone
- Meta tags in `__root.tsx`
- No service worker (per preview-safety default)

## Notes on scope
- Levels seeded lazily: admin generates 6 starter levels via AI in the dashboard; no bulk pre-seed of 180 levels
- Achievements seeded via migration (10 starter achievements)
- Sound via Tone.js (already in demo)
- Ad SDK integrations deferred — placeholder components only
- Real Stripe/subscription deferred — UI stub only

Ready to implement.