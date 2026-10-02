# 04: Daily Milestones

15 working days plus 1 buffer day. Each day ends with a feature that is fully tested and deployed to production. Requirement IDs (FR-, BR-) refer to `02-requirements-and-business-rules.md`.

## Definition of Done (applies to every milestone)

A milestone is done only when all of these are true:

1. Every "Testable outcome" listed for the day has an automated test (unit, integration or E2E) that passes, unless marked *manual*.
2. CI is green: lint, type-check, unit, integration.
3. Playwright E2E passes against the Vercel preview deployment (with its own Neon database branch).
4. The manual QA checklist for the day has been walked through on the preview URL (desktop + phone width).
5. Pull request merged to `main`, production deployed, migrations applied, smoke test (`/api/health` and the day's main page) passes.
6. Anything not yet meant for real users is behind a feature flag (`FLAG_PUBLIC_ENROLLMENT`, `FLAG_TUTOR_PORTAL`, `FLAG_ADMIN_PORTAL`), so production always contains only tested code and never half-visible features.

If a milestone fails a gate at end of day, it is not deployed; it rolls into the next day and the buffer day absorbs the slip.

## Overview

| Day | Milestone | Main requirements |
|---|---|---|
| 1 | Foundation and delivery pipeline | — |
| 2 | Database schema, seed data, reference APIs | FR-S2, FR-S3, FR-A3 (data) |
| 3 | Scheduling engine (domain layer) | BR-1 – BR-8 |
| 4 | Enrollment form: details and program | FR-S1 – FR-S3 |
| 5 | Enrollment form: schedule, preview, submit | FR-S4 – FR-S7 |
| 6 | Confirmation email and form protection | FR-S7, BR-19 |
| 7 | Login, roles, admin payment confirmation | FR-A1 – FR-A3, FR-A5 |
| 8 | Tutor student pool (card view) | FR-T1 – FR-T4 |
| 9 | Student detail, Accept, My students | FR-T5 – FR-T9 |
| 10 | Weekly calendar with status colors | FR-T11, BR-10 – BR-13 |
| 11 | Cancel sessions and hours ledger | FR-T12, FR-T14, BR-14 – BR-18 |
| 12 | Add make-up / additional sessions | FR-T13, BR-17 |
| 13 | Edit a student's recurring schedule | FR-T10 |
| 14 | 3-day tutor-assigned email and admin alert | FR-S8, BR-20, BR-21 |
| 15 | Hardening, user acceptance testing, launch | Non-functional requirements |
| 16 | Buffer | — |

---

## Day 1: Foundation and delivery pipeline

Goal: an empty but real app that deploys itself safely.

Build:
- Next.js + TypeScript (strict) + Tailwind + shadcn/ui scaffold, folder structure from `01-architecture-and-stack.md`.
- ESLint rules enforcing the layer boundaries; Prettier.
- Docker Compose Postgres for local; Neon project with `main` branch; Vercel project linked to GitHub with the Neon integration (branch per preview).
- `src/lib/env.ts` validating environment variables at startup.
- `/api/health` returning app version and a `SELECT 1` database check.
- GitHub Actions `ci.yml` and `e2e.yml`; Vitest and Playwright configured with one sample test each.
- Sentry wired up.

Testable outcomes:
- [ ] `GET /api/health` returns `200 { status: "ok", db: "ok" }` locally, on the preview URL and in production.
- [ ] A pull request automatically gets a preview URL and its own Neon branch.
- [ ] A deliberately failing test blocks the merge (verified once, then reverted). *manual*
- [ ] Importing Prisma inside an API route fails lint.
- [ ] Missing `DATABASE_URL` makes the app fail at startup with a clear message.

Deploy: production shows a placeholder landing page; health check passes.

---

## Day 2: Database schema, seed data, reference APIs

Goal: the data model exists in every environment, with realistic test data.

Build:
- Prisma schema from `03-data-model-and-api.md`, first migration.
- `seed.ts`: 1 admin, 4 tutors (1 inactive), offerings grouped as Subjects / CET / HSET, settings (time zone, operating hours, payment instructions).
- Repositories + services for tutors and offerings.
- `GET /api/public/tutors`, `GET /api/public/offerings`.

Testable outcomes:
- [ ] `prisma migrate deploy` runs cleanly on an empty database and on the preview branch.
- [ ] `/api/public/tutors` returns only the 3 active tutors, sorted by name, with no email or phone fields in the response.
- [ ] `/api/public/offerings` returns offerings grouped by category (SUBJECT, CET, HSET) and excludes inactive ones.
- [ ] Integration test: inserting two `EmailLog` rows with the same `(enrollmentId, type)` fails (once-only email guarantee).

Deploy: migrations applied to production; production seeded with the center's real tutor list and subject list (provided by client; see Q22).

---

## Day 3: Scheduling engine (domain layer)

Goal: the riskiest business logic is built first, in isolation, and proven by tests.

Build:
- `domain/schedule/validate.ts` (BR-1 to BR-7) returning typed errors with user-facing messages.
- `domain/schedule/generate.ts` (BR-8), taking `now`, time zone, slots, cadence, start date, hours.
- `domain/sessions/status.ts` (BR-10 to BR-13) and `domain/hours/ledger.ts` (BR-14 to BR-17); built now because they are pure functions and cheap to test, used from Day 10.
- Zod schema for the enrollment payload in `src/schemas`.
- `POST /api/public/enrollments/preview`.

Testable outcomes:
- [ ] All 8 worked examples in `02` section 2 pass as unit tests, including: 10 h with 1 h × 5 days is valid with 10 sessions over 2 weeks; 3 h with 2 h × 5 days is rejected with error `SCHEDULE_EXCEEDS_HOURS`.
- [ ] Last-session shortening: 10 h with 1.5 h × 3 days gives 7 sessions and the 7th is 1 h.
- [ ] Biweekly cadence produces sessions only on alternating weeks.
- [ ] Start date mid-week skips earlier slots in that week.
- [ ] Generated times are correct across a daylight-saving change for a DST time zone (test uses a DST zone even if the center's doesn't observe DST).
- [ ] Session status: 1 minute before start = UPCOMING, at start = ONGOING, at end = COMPLETED (boundary tests with injected `now`).
- [ ] Ledger: purchased 10, 3 completed, 1 cancelled, 4 future → completed 3, scheduled 4, unscheduled 3.
- [ ] Domain folder has ≥ 95% line coverage.
- [ ] Preview endpoint returns the same result as the domain function for the same input.

Deploy: preview endpoint live in production (not linked from any page yet).

Blocking questions to resolve before this day: Q5 (shortened last session), Q14 (time zone and operating hours).

---

## Day 4: Enrollment form, steps 1 and 2

Goal: families can fill in their details and choose what to study.

Build:
- Wizard shell with progress indicator and Back/Next; state kept across steps.
- Step 1 Details (FR-S1), guardian fields required when "student is under 18" is ticked; consent checkbox.
- Step 2 Program (FR-S2) with grouped select; Preferred tutor dropdown with "No preference" default (FR-S3).

Testable outcomes:
- [ ] E2E: cannot leave Step 1 with empty required fields; each error appears next to its field.
- [ ] E2E: ticking "under 18" makes guardian fields required; unticking removes the requirement.
- [ ] E2E: invalid email and phone formats are rejected.
- [ ] E2E: the tutor dropdown lists the seeded active tutors plus "No preference", and the inactive tutor is absent.
- [ ] E2E: the program list shows Subjects, CET and HSET groups.
- [ ] Going Back from Step 2 to Step 1 keeps entered data.
- [ ] Axe accessibility scan of steps 1–2 reports no serious violations.

Deploy: production behind `FLAG_PUBLIC_ENROLLMENT=false`; enabled on preview only.

---

## Day 5: Enrollment form, schedule step, preview and submit

Goal: a complete enrollment can be submitted and stored.

Build:
- Step 3 Schedule (FR-S4): hours input, start date, cadence, add/remove slot rows (day, start, end in 30-minute steps).
- Live validation using the shared domain code and a preview panel (FR-S5): weekly total vs purchased, session count, first/last dates, shortened-last-session note.
- Step 4 Review + payment instructions (FR-S6).
- `POST /api/public/enrollments`: re-validates on the server, creates Student, Enrollment, RequestedSlots and RecurringSlots in one transaction, generates reference code (FR-S7).
- Success page showing the reference code.

Testable outcomes:
- [ ] E2E: entering 3 hours and 2 h on 5 days shows the BR-5 message and disables Next.
- [ ] E2E: entering 10 hours and 1 h on 5 days shows "10 sessions, ends <date>" and allows Next.
- [ ] E2E: overlapping slots show the BR-4 message.
- [ ] Integration: a POST that bypasses the UI with an invalid schedule gets `422` and nothing is written to the database.
- [ ] Integration: a valid POST creates exactly 1 enrollment with status SUBMITTED and the requested slots stored unchanged.
- [ ] Reference codes are unique across 10,000 generated codes (unit test).
- [ ] E2E full happy path on a phone-sized viewport ends on the success page with a reference code.

Deploy: production, still behind `FLAG_PUBLIC_ENROLLMENT`.

---

## Day 6: Confirmation email and form protection

Goal: families get email E1, and the public form is protected from abuse.

Build:
- Resend client wrapped by a `sendEmail()` function that writes `EmailLog` (QUEUED → SENT/FAILED).
- React Email template E1 (BR-19).
- Turnstile on submit, honeypot field, Upstash rate limit (e.g. 5 submissions per IP per hour).
- Center's sending domain verified in Resend (SPF/DKIM).

Testable outcomes:
- [ ] Integration (Resend mocked): submitting creates one SENT `EmailLog` of type ENROLLMENT_RECEIVED addressed to student and guardian.
- [ ] If Resend fails, the enrollment is still saved, the log is FAILED, and the user still sees the success page.
- [ ] Template snapshot test: E1 contains reference code, program, hours, schedule and payment instructions.
- [ ] Real email received in Gmail and Outlook test inboxes, not in spam, renders correctly on mobile. *manual*
- [ ] 6th submission from the same IP within an hour returns `429`.
- [ ] Submission with the honeypot filled or without a valid Turnstile token returns `400` and stores nothing.

Deploy: production. `FLAG_PUBLIC_ENROLLMENT` can be switched on now for a soft launch if the center wants to start collecting requests early (tutors can't act on them until Day 9).

---

## Day 7: Login, roles, admin payment confirmation

Goal: staff can log in, and payments can be recorded.

Build:
- Auth.js magic-link login; `middleware.ts` protecting `/tutor/*` and `/admin/*`; `requireRole()` helper for API handlers.
- Admin enrollments list with status filter and search (FR-A1).
- Confirm-payment dialog (FR-A2), optional E2 email (if Q12 = yes).
- Admin tutor and offering management, settings page (FR-A3, FR-A5).

Testable outcomes:
- [ ] E2E: visiting `/tutor/pool` or `/admin/enrollments` while logged out redirects to `/login`.
- [ ] E2E: a tutor account gets `403` from every `/api/admin/*` endpoint.
- [ ] E2E: only emails registered as active users can request a login link; others see a neutral message (no account enumeration).
- [ ] E2E: admin confirms payment → status becomes PAYMENT_CONFIRMED, `paymentConfirmedAt` set, audit-log row written.
- [ ] Confirming payment twice is rejected (`409`).
- [ ] Deactivating a tutor removes them from the public tutor dropdown.

Deploy: production with `FLAG_ADMIN_PORTAL=true`; admin accounts created for center staff.

---

## Day 8: Tutor student pool (card view)

Goal: tutors see the students waiting for a tutor, with their requests first.

Build:
- `GET /api/tutor/pool` (FR-T1).
- Pool page with two rows: "Requested you" and "Other students" (FR-T2, FR-T3), cards per FR-T4, empty states.
- Responsive grid (horizontal scroll rows on phone).

Testable outcomes:
- [ ] Seed: 2 paid students prefer Tutor A, 1 paid prefers Tutor B, 2 paid have no preference, 1 unpaid prefers Tutor A.
  - Tutor A sees 2 cards in "Requested you" and 3 in "Other students" (one with a "Prefers: Tutor B" badge).
  - Tutor C sees an empty "Requested you" row with the empty-state message, and 5 cards in "Other students".
  - Nobody sees the unpaid student (per Q2 default).
- [ ] Assigned and cancelled enrollments never appear.
- [ ] Each card shows name, grade, program, hours, weekly pattern and start date.
- [ ] The pool response contains no contact details (they load only in the detail view).

Deploy: production behind `FLAG_TUTOR_PORTAL=false`.

---

## Day 9: Student detail, Accept, My students

Goal: tutors can take on students, and sessions are created automatically.

Build:
- Detail dialog (FR-T5) with schedule list, mini week grid, contact details.
- `POST .../accept` with atomic update and session generation in one transaction (FR-T6, FR-T7).
- My students list with ledger summary (FR-T9).

Testable outcomes:
- [ ] E2E: Tutor A opens a card, sees guardian phone and email and the requested schedule, clicks Accept; the card disappears and the student appears in My students.
- [ ] Integration: after Accept, generated sessions match exactly what `generate.ts` produced for the enrollment (count, times, total hours = purchased).
- [ ] Race condition: two tutors accept the same student concurrently (`Promise.all` in the test) → exactly one `200` and one `409`; sessions generated exactly once.
- [ ] Tutor B no longer sees the accepted student in the pool.
- [ ] Accepting a student whose schedule overlaps an existing student's sessions succeeds (FR-T8).
- [ ] Tutor B gets `404` when requesting Tutor A's student detail.

Deploy: production; `FLAG_TUTOR_PORTAL=true` (pool, accept and My students are usable on their own).

---

## Day 10: Weekly calendar with status colors

Goal: tutors see their week, with past, live and upcoming sessions clearly marked.

Build:
- `GET /api/tutor/sessions?weekStart=` (FR-T11).
- FullCalendar week view in the center's time zone, previous/next/today navigation, legend.
- Status coloring from `status.ts` (BR-10 to BR-13), labels and icons, refresh every 60 s.
- Overlapping sessions shown side by side; phone shows a day view.

Testable outcomes (Playwright `page.clock` used to fix the time):
- [ ] With the clock set to Wednesday 16:30, Wednesday's 16:00–17:00 session shows "LIVE" in amber, Monday's sessions show "Completed" in green, Friday's show blue.
- [ ] Advancing the clock to 17:01 changes the Wednesday session to Completed within 60 s, without reloading.
- [ ] Next/previous week navigation loads the correct sessions; "Today" returns to the current week.
- [ ] Two overlapping sessions for different students are both visible.
- [ ] A tutor never sees another tutor's sessions.
- [ ] Session times display in the center's time zone even when the browser is set to a different zone.

Deploy: production.

---

## Day 11: Cancel sessions and hours ledger

Goal: tutors can cancel any session from the calendar, and hours are tracked correctly.

Build:
- Session dialog with Cancel (confirmation + optional reason) (FR-T12).
- `DELETE /api/tutor/sessions/:id` (soft cancel + audit log).
- "Show cancelled" toggle (FR-T14).
- Ledger on My students and student detail: purchased / completed / scheduled / unscheduled / over-by (BR-14 to BR-16); auto-COMPLETED status (BR-18).

Testable outcomes:
- [ ] E2E: cancelling an upcoming session removes it from the week view; with "Show cancelled" on, it appears greyed and struck through.
- [ ] E2E: a completed session (in the past) and an ongoing session can both be cancelled.
- [ ] Ledger: student with 10 h, cancel one 1 h future session → scheduled −1, unscheduled +1, completed unchanged.
- [ ] Ledger: a past session left on the calendar counts toward completed hours.
- [ ] Cancelling an already cancelled session returns `409`; another tutor's session returns `404`.
- [ ] Audit-log row records who cancelled, when, and the reason.
- [ ] An enrollment whose completed hours equal purchased hours with no future sessions shows as COMPLETED.

Deploy: production.

---

## Day 12: Add make-up / additional sessions

Goal: tutors can add sessions on the fly and cancel them again.

Build:
- "Add session" button and click-on-empty-slot to pre-fill (FR-T13).
- Form: date, start, end, student (own students only), lesson (pre-filled from the enrollment's program, editable), type Make-up or Extra.
- `POST /api/tutor/sessions`; dashed border and tag on the calendar; over-hours warning (BR-17).

Testable outcomes:
- [ ] E2E: clicking empty Thursday 15:00 opens the form pre-filled with Thursday 15:00–16:00; saving shows a dashed "Make-up" session there.
- [ ] Ledger: adding a 1 h make-up uses 1 h of unscheduled balance.
- [ ] Adding a session beyond the purchased hours is allowed, and the student shows "Over by 1 h" in My students and the admin list.
- [ ] The added session can be cancelled, which restores the balance.
- [ ] Validation: end before start, outside operating hours, or a student not assigned to this tutor are rejected (`422` / `404`).
- [ ] An added session in the past is shown immediately as Completed.

Deploy: production.

---

## Day 13: Edit a student's recurring schedule

Goal: tutors can change a student's regular schedule without disturbing history.

Build:
- Schedule editor on the student detail page (same slot editor component as the enrollment form) with an "Effective from" date (FR-T10).
- `PUT .../schedule`: cancels future GENERATED sessions from the effective date, regenerates from the new slots using remaining hours, leaves past sessions and make-ups untouched, audit log with before/after.

Testable outcomes:
- [ ] Student with 10 h, 4 completed: change Mon/Wed to Tue/Thu effective next week → remaining 6 h regenerated on Tue/Thu; the 4 completed sessions unchanged.
- [ ] A make-up session scheduled after the effective date survives the regeneration, and the regenerated sessions account for its hours.
- [ ] A new schedule whose weekly load exceeds remaining hours shows a warning but can still be saved (tutors aren't blocked by BR-5).
- [ ] The original requested slots remain unchanged in the database.
- [ ] Calendar reflects the new schedule immediately after saving.

Deploy: production.

---

## Day 14: 3-day tutor-assigned email and admin alert

Goal: families are told who their tutor is, on time and exactly once.

Build:
- Templates E3 and E4.
- `/api/cron/assignment-emails` (BR-20, BR-21) with `CRON_SECRET`; retry of FAILED emails up to 5 attempts; `vercel.json` hourly schedule.
- Admin list shows "Tutor email sent at…" and alert state.

Testable outcomes (cron service called directly with an injected `now`):
- [ ] Paid 3 days + 1 hour ago and assigned → E3 sent to student and guardian with tutor name and first session; `tutorEmailSentAt` set.
- [ ] Paid 2 days ago and assigned → nothing sent.
- [ ] Paid 4 days ago, not assigned → E4 sent to admin once; E3 not sent.
- [ ] Same student then assigned on day 5 → E3 sent on the next run.
- [ ] Running the job twice in a row never sends a duplicate.
- [ ] Calling the endpoint without the correct secret returns `401`.
- [ ] A failed send is retried on the next run and stops after 5 attempts.
- [ ] Vercel dashboard shows the cron firing hourly in production. *manual*

Deploy: production.

---

## Day 15: Hardening, user acceptance testing, launch

Goal: the center's staff and tutors confirm it works for them, then it goes live.

Build / do:
- Security pass: every tutor/admin endpoint checked for role and ownership (automated test that calls every route with each role); security headers; dependency audit.
- Accessibility pass on the enrollment form; performance check on pool and calendar.
- Neon backups / restore tested; production seed data reviewed.
- Short user guides: one page for tutors (pool, accept, calendar, cancel, add), one for admin (confirm payment, manage tutors).
- UAT session with center staff and at least two tutors, using the scripts below.

Testable outcomes:
- [ ] Authorization matrix test: every endpoint × every role (anonymous, tutor, other tutor, admin) returns the expected status.
- [ ] Lighthouse on enrollment form (mobile): Accessibility ≥ 95, Performance ≥ 85.
- [ ] Database restore to a new branch succeeds and the app runs against it. *manual*
- [ ] UAT scripts signed off by the client: (1) family enrolls and receives E1; (2) admin confirms payment; (3) preferred tutor sees the student first and accepts; (4) tutor cancels one session and adds a make-up; (5) tutor edits the schedule; (6) E3 arrives after the 3-day mark (simulated by back-dating payment on preview). *manual*
- [ ] All feature flags on in production; enrollment link shared on the center's channels.

Deploy: production launch.

## Day 16: Buffer

Reserved for slips, UAT feedback, and polish. If unused, candidates are: student self-service lookup by reference code, a printable weekly schedule for tutors, CSV export of hours for payroll.
