# EXPERT IELTS

A free, AI-powered IELTS Writing & Speaking coach. Every feature is free for every student: there are no plans, tiers, credits or payments anywhere in the code or database.

## Stack

- **Next.js 15** (App Router), React 19, TypeScript, Tailwind CSS 4
- **PostgreSQL** via Prisma (works with local Postgres or Supabase)
- **Claude API** (`@anthropic-ai/sdk`) for question analysis, model answers, assessment, the examiner and reports
- **Whisper-compatible speech-to-text** (Groq, OpenAI or self-hosted) for transcripts — Speaking stage
- **Azure Speech pronunciation assessment** (optional) — the only source of a Pronunciation band. Without it, Pronunciation shows as "not assessed" and is never guessed from text.

## Setup

```bash
cp .env.example .env        # then fill in the values
npm install
npx prisma migrate dev      # creates the tables
npm run db:seed             # owner account + practice questions
npm run dev
```

The owner account is created from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (min 12 characters) when you run the seed. The password is only stored as a bcrypt hash. The admin panel opens from the small lock icon in the bottom-left corner. Only accounts with the `ADMIN` role can open it; everyone else gets a 404.

## Security

- Sessions: a random 256-bit token in an httpOnly, SameSite=Lax cookie. Only its SHA-256 hash is stored in the database.
- Passwords are hashed with bcrypt (cost 12). Login and registration are rate-limited.
- Every `/api/admin/*` route checks the admin role on the server, and so does the `/admin` layout.
- API keys live only in server environment variables. They never reach the browser.

## AI cost control (the owner pays, students never do)

- **Preparation material is cached per question** and shared by all students, so each question costs one AI call, ever.
- Structured outputs (JSON schema) mean no retries for malformed output.
- An equal **fair-use limit** applies to every student (default 80 AI requests per 24 h, set in Admin → AI management). It protects the budget and is not a paid tier.
- A **weekly check limit** applies to every student: by default 3 Writing and 3 Speaking assessments per week (Monday–Sunday), set in Admin → AI management. Only successful assessments count; the admin is not limited. Drafts and recordings are kept, so a student can request the check after the reset.
- Admin → AI management lets you switch models. Approximate list prices per million tokens: Opus 5.5 $4 in / $20 out, Sonnet 5.5 $2 / $10 (default), Haiku 5.5 $0.10 / $0.50.
- Rough cost per action on Opus 5.5: preparation is about $0.10–0.15, paid once per question. An essay assessment is about $0.08–0.12.
- Admin → Analytics and AI management show requests, tokens and the estimated spend.

## Speaking pipeline

1. The browser records with MediaRecorder (pause/resume supported), then converts the take to 16 kHz mono WAV before upload. Audio is stored under `UPLOAD_DIR` and served only to its owner, with Range support for seeking.
2. Each saved answer is transcribed straight away by the Whisper-compatible service. The transcript and its timestamps are stored verbatim and never edited.
3. Speaking rate, pauses, fillers and self-repetitions are **calculated from the timestamps**, not estimated by the AI. They are passed to the examiner as evidence.
4. When "Analyse" is clicked, pronunciation is scored by Azure Speech from the audio itself, in 50 s chunks, if it is configured. Claude then assesses all four criteria. Without audio pronunciation analysis, Pronunciation is shown as "not assessed" and the overall band is labelled provisional (the average of three criteria).
5. Preparation unlocks only after the first attempt has been recorded. It is cached per question set.

Rough owner costs per Speaking session: Whisper on Groq is about $0.002 per audio minute. Azure pronunciation is billed at roughly standard speech-to-text rates, about $1 per audio hour, and there is a free tier. Check current provider pricing before launch. Claude assessment is about $0.08–0.15 per attempt.

## AI examiner interview

- The **server** decides the structure: when to change topics, when to move to Part 2 or 3, and when to finish. The AI only writes the examiner's next line, based on the question bank and what the candidate actually said. This keeps tests realistic and stops them running too long or costing too much.
- The opening line and the Part 2 cue card come from the question bank and cost no AI call. A full test uses about 15 short examiner calls plus one assessment, roughly $0.15–0.25 on Opus 5.5. Admin → AI management can point the "fast" model at Haiku 5.5 to make the examiner calls cheaper.
- Students can only answer the current question, because later questions build on earlier answers. The examiner gives no feedback during the test.
- The examiner's voice uses the browser's built-in speech synthesis, which is free, and students can turn it off.

## Weekly reports

- A report is stored for every completed week. It is created automatically when the student opens the dashboard or the reports page. `/api/cron/weekly-reports` can also create reports for every active student each Monday: `vercel.json` schedules it, and the endpoint is protected by `CRON_SECRET`.
- All the figures are measured from stored results. The AI coach summary is written once per report, from those numbers only, and is left out cleanly when Claude is not configured.

## Deploying

- **Database:** any PostgreSQL works, including Supabase. Set `DATABASE_URL`, then run `npx prisma migrate deploy` and `npm run db:seed`.
- **Audio storage:** recordings are saved to local disk (`UPLOAD_DIR`). That works on a VPS or Docker host with a persistent volume. It does **not** work on serverless hosts such as Vercel, whose file system is temporary; there, `src/lib/storage.ts` needs to be switched to object storage (Supabase Storage, S3 or R2) first.
- **Practice reminders:** these are in-app banners. Email or push reminders would need an email or push service, which is not included.

## Testing AI flows without keys

`next.config.ts` reads `NEXT_DIST_DIR`, so a second dev server can run alongside the main one. It can be pointed at a mock with `ANTHROPIC_BASE_URL` and `STT_API_URL`. Stages 2–4 were checked this way, against a mock that returns schema-valid sample output.

## Honesty rules built into the code

- Questions carry a source label: `VERIFIED_REPORT` (needs a source note), `AI_GENERATED` or `PRACTICE`. The seeded questions are original practice items and are labelled `PRACTICE`.
- Any quote, error or example the AI cites is checked against the student's real text, and items it cannot find are dropped. Repetition counts are computed by the server.
- The overall band uses IELTS rounding: the mean of the four criteria, where .25 rounds up to .5 and .75 rounds up to the next band. Every score is labelled as an AI estimate.
- If a required service is not configured, the feature says so. It never shows placeholder results.

## Build stages

| Stage | Scope | Status |
|---|---|---|
| 1 | Foundation: schema, auth, i18n (EN/UZ), dark/light theme, homepage, admin panel (questions, bulk import, students, AI settings, website, analytics) | ✅ |
| 2 | Writing: question bank and random picker with history, AI question generation, preparation A–F, editor (timer, auto-save, drafts, history), assessment, learning-memory capture | ✅ |
| 3 | Speaking: recorder (pause/resume/re-record), 16 kHz WAV upload, verbatim timestamped transcripts, measured fluency metrics, preparation, second attempt and comparison, assessment (pronunciation from audio only) | ✅ |
| 4 | AI examiner interview: full test / Part 1 / Parts 2–3, server-controlled part structure (8 Part 1 questions, cue card + rounding-off, 6 Part 3), AI follow-ups from the candidate's actual answers, examiner voice via browser speech synthesis, final 4-criteria assessment | ✅ |
| 5 | Weakness tracker (frequency, severity, examples, weekly trend, AI exercises built from the student's own mistakes, personal focus panel, known weaknesses fed into every assessment) and vocabulary bank (search, filters, mark as learned, flashcard revision, usage dashboard, progress by topic) | ✅ |
| 6 | Band 6 → 7 → 8 comparison for Writing questions and for each Speaking question: tabs or side by side, highlights checked against the text, dimension table, explanations; cached per question | ✅ |
| 7 | Student dashboard (tiles, band trend, activity and criteria charts, history, bookmarks, goals), weekly reports (measured stats, AI coach summary, history, PDF), settings (profile, target band, exam date, language, reminders, password, account deletion), in-app practice reminders | ✅ |
