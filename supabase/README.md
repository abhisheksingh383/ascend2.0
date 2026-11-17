# Supabase setup

1. Create a Supabase project and copy its URL and anon key into `.env`.
2. Run `migrations/001_initial_schema.sql` in the SQL editor.
3. Enable Email, Google, and GitHub providers in Authentication > Providers.
4. Add the OAuth callback URL shown by Supabase to each provider.
5. Deploy the Edge Functions in `functions/` and set their secrets with `supabase secrets set`.

All browser-side data access is protected by RLS. Groq, Calendar, GitHub, reminders, and Stripe secrets belong in Edge Functions, never in `VITE_` variables.

The AI Coach uses Groq. Configure the key in Supabase, not in this repository:

```bash
supabase secrets set GROQ_API_KEY=your-key
supabase functions deploy ai-coach
```

Never paste the Groq key into `.env` values beginning with `VITE_`, `src/`, or committed files. If a key has been shared publicly, rotate it in Groq Console and use the replacement as the Supabase secret.

The repository includes `supabase/config.toml` with `verify_jwt = false` for `ai-coach`, because guest users can use the Coach. The function must still be deployed once to the configured project:

```bash
supabase login
supabase link --project-ref xxawrljpcfhinudjgims
supabase secrets set GROQ_API_KEY=your-rotated-key
supabase functions deploy ai-coach --no-verify-jwt
```

The Coach is the Groq interface in the app. It accepts free-form questions and can propose adding, completing, or deleting tasks, but every proposed change is shown for human confirmation. Profile onboarding collects name, date of birth, course, and standard/year; Academics can then ask Groq for a tailored syllabus. Deploy the updated function after changing its code, otherwise the deployed app will continue using the old behavior.

For OAuth, enable Google and GitHub under Supabase Authentication > Providers, then add
`https://ascend20.vercel.app/` to Authentication > URL Configuration > Redirect URLs.
Set these Vercel Production environment variables before deploying:
`VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY`. The provider client IDs and
secrets are configured in Supabase, not in the Vercel frontend environment.
