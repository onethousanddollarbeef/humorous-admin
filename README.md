# Humor Admin Area

A Next.js admin app for Supabase data with strict superadmin access.

## Features

- Google OAuth login wall for all `/admin/*` routes.
- Additional server-side gate: user must have `profiles.is_superadmin = TRUE`.
- Dashboard with interesting stats (profiles, images, captions, upload tempo, latest uploads).
- Users/Profiles read-only table.
- Images CRUD (create, read, update, delete).
- Captions read-only table.

## Security model

1. `middleware.ts` blocks unauthenticated access to `/admin/*`.
2. `app/admin/layout.tsx` enforces superadmin check server-side before any admin page renders.
3. Admin image mutations use the Supabase service-role client, but only after verifying the current user is a superadmin.
4. No RLS policies are modified by this project.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create env file:
   ```bash
   cp .env.example .env.local
   ```
3. Add Supabase project values:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (optional but recommended; enables fallback admin writes when user-session writes are blocked by RLS)
4. Ensure Google provider is enabled in Supabase auth settings.
5. Run:
   ```bash
   npm run dev
   ```

## About superadmin lockout

If the app requires `profiles.is_superadmin = TRUE`, bootstrap access by using existing infrastructure access:

- Use Supabase SQL editor (or trusted backend/service-role path) to set your own profile row to `is_superadmin = TRUE`.
- Alternatively, have an existing superadmin grant your profile superadmin rights.

This avoids changing any RLS policies.

## Deployment notes

- Deploy to Vercel and set environment variables.
- In Vercel project settings, disable Deployment Protection so Incognito can access the deployment.
