# Ascend 2.0

Ascend 2.0 is a student productivity and academic planning workspace built with React, TypeScript, Vite, Supabase, and Groq. It combines tasks, habits, focus sessions, streaks, course-aware syllabus planning, assignments, productivity insights, and an AI Coach in one responsive interface.

## Features

### Productivity

- Add, complete, reopen, and organize daily tasks.
- Assign task priorities and categories.
- Create and complete daily habits.
- Automatically reset daily habit completion at the local midnight boundary.
- Run an intentional Start/Stop focus timer.
- Count focus time only while a focus session is active.
- Maintain a streak from real completed work.
- View a zero-state dashboard when no data has been created.

### Academics

- Start with zero subjects and zero syllabus progress.
- Add subjects manually with a name, optional code, and syllabus topics.
- Delete subjects and their linked assignments with confirmation.
- Complete syllabus topics to increase subject and overall progress.
- Add assignments with subject, due date/timeframe, and priority.
- Let the AI Coach draft subject review blocks.
- Replace old subjects and assignments when the profile course or semester/class changes.

### Profile and academic setup

- Full name is required.
- Date of birth is optional and restricted from `1925-01-01` to today.
- Gender is optional.
- Course and standard/semester are optional.
- Degree and professional programmes use relevant semester counts.
- School class selections use Class 1 through Class 12.
- Profile details provide context for course-specific syllabus generation.

### AI Coach

- Groq-powered conversational AI Coach.
- Ask general productivity or academic questions.
- Receive structured proposals for adding, completing, or deleting tasks.
- Generate course-specific subjects and syllabus topics.
- Require human confirmation before task mutations are applied.
- Open in a large right-side split panel.
- Send a message with Enter; use Shift+Enter for a new line.

### Insights

- Dynamic weekly productivity score based on tasks and habits.
- Task and habit completion percentages.
- XP and average focus-time metrics.
- Focus-time activity overview.
- Month-by-month streak activity calendar.
- Per-day work intensity based on completed tasks, habits, focus sessions, and academic topics.
- Current streak and longest streak summaries.

## Removed or not included

The current product intentionally excludes:

- Coding tab and coding task category.
- Achievements tab.
- Notification system and notification bell.
- Ascend Pro purchase or upgrade promotion.
- Seeded demo tasks, habits, streak coins, freezes, XP, and weekly scores.
- Automatic app-presence or mouse/keyboard active-time counting.

## Tech stack

- React 18
- TypeScript
- Vite 6
- Supabase Auth and PostgreSQL
- Supabase Edge Functions
- Groq OpenAI-compatible Chat Completions API
- Lucide React
- Vercel

## Repository layout

```text
src/
  App.tsx              Main application UI and state
  lib/supabase.ts      Supabase client and AI invocation helpers
  styles.css           Application styles and responsive behavior

supabase/
  config.toml          Supabase function configuration
  migrations/          Database schema and RLS migration
  functions/           Supabase Edge Functions
  README.md            Supabase deployment details
```

## Local setup

### Prerequisites

- Node.js 18 or newer
- npm
- A Supabase project
- A Groq API key for AI features

### Install

```bash
npm install
```

### Configure frontend environment

Copy the example environment file:

```bash
cp .env.example .env
```

Set:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Do not expose provider secrets with `VITE_` prefixes.

### Run the app

```bash
npm run dev
```

The Vite development server is normally available at `http://localhost:5173`.

### Production build

```bash
npm run build
```

The build output is written to `dist/`.

## Supabase setup

1. Create or select a Supabase project.
2. Open **SQL Editor**.
3. Run `supabase/migrations/001_initial_schema.sql`.
4. Enable Email, Google, and GitHub authentication providers if needed.
5. Configure redirect URLs for OAuth.
6. Add `GROQ_API_KEY` as a Supabase Edge Function secret.
7. Deploy the Edge Functions.

### AI Coach secret

```bash
supabase login
supabase link --project-ref xxawrljpcfhinudjgims
supabase secrets set GROQ_API_KEY=your-rotated-key
supabase functions deploy ai-coach --no-verify-jwt
```

Never commit a provider API key or place it in a `VITE_` environment variable.

If a Groq key was shared publicly, revoke or rotate it in Groq Console before configuring the replacement secret.

## Database migration

The schema creates:

- `user_workspaces`
- `integration_connections`
- Row Level Security policies
- Automatic workspace creation for new authenticated users
- Focus-session, activity-date, and daily-work-count fields

In particular, daily heatmap counts use:

```sql
activity_counts_by_date jsonb not null default '{}'::jsonb;
```

The complete migration is at:

```text
supabase/migrations/001_initial_schema.sql
```

## Edge Functions

The repository includes functions for:

- AI Coach.
- Integration status.
- GitHub sync.
- Google Calendar sync.
- Reminder sending.
- Stripe checkout.

Not every optional integration is required for the core local or Supabase product flow.

## Vercel deployment

Set these variables in Vercel Production:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

After changing frontend code:

1. Commit and push to GitHub.
2. Trigger or verify a fresh Vercel deployment.
3. Redeploy the Supabase AI Coach function after changing Edge Function code.

## Data behavior

- Signed-in data is synchronized to the authenticated user's Supabase workspace.
- Guest data is stored locally.
- Task completion and habit completion mark the local day active.
- Completing a syllabus topic also marks the local day active.
- Completed focus sessions mark the local day active.
- Daily habits reset when the local calendar date changes.
- Activity count maps record work intensity by local date.

## Security

- API keys belong in Supabase secrets or local ignored `.env` files.
- `.env` and secret files should never be committed.
- Supabase workspace rows are protected by Row Level Security.
- AI task changes are proposals and require explicit confirmation.
- Provider keys should be rotated if exposed outside Supabase.

## Development validation

Run:

```bash
npm run build
```

This executes the TypeScript project build and Vite production build.

## License

License terms should be added before public third-party redistribution.
