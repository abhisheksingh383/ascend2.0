# Supabase setup

1. Create a Supabase project and copy its URL and anon key into `.env`.
2. Run `migrations/001_initial_schema.sql` in the SQL editor.
3. Enable Email, Google, and GitHub providers in Authentication > Providers.
4. Add the OAuth callback URL shown by Supabase to each provider.
5. Deploy the Edge Functions in `functions/` and set their secrets with `supabase secrets set`.

All browser-side data access is protected by RLS. AI, Calendar, GitHub, reminders, and Stripe secrets belong in Edge Functions, never in `VITE_` variables.

For OAuth, enable Google and GitHub under Supabase Authentication > Providers, then add
`https://ascend20.vercel.app/` to Authentication > URL Configuration > Redirect URLs.
Set these Vercel Production environment variables before deploying:
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_GOOGLE_ENABLED=true`,
and `VITE_SUPABASE_GITHUB_ENABLED=true`. The provider client IDs and secrets are
configured in Supabase, not in the Vercel frontend environment.
