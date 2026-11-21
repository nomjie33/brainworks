# 04: Sprint Milestones

Four sprints of two weeks (10 working days each), 8 weeks in total. Each sprint ends with a tested, production-deployed increment. Requirement IDs (FR-, BR-) refer to `02-requirements-and-business-rules.md`.

## Team and roles

| Code | Role | People | Owns |
|---|---|---|---|
| **DQ** | DevOps + QA | 1 | Environments, CI/CD, feature flags, monitoring, test infrastructure, E2E suites, manual QA, release gate, UAT |
| **BE1** | Backend 1 ("Enrollment and scheduling") | 1 | Domain layer (schedule, status, ledger), public enrollment API, email, cron jobs, student accept and schedule editing |
| **BE2** | Backend 2 ("Platform and tutor portal") | 1 | Prisma schema and seed, auth and roles, admin APIs, audit log, pool, sessions API (calendar, cancel, add) |
| **FE** | Front-end | 1 | Public enrollment wizard, login, admin screens, tutor portal (pool, My students, calendar, dialogs) |

Working agreements:

- **API contract first.** On day 1 of each sprint BE1 and BE2 publish the Zod request/response schemas (`src/schemas`) for that sprint's endpoints. FE builds against them with mock handlers (MSW) until the real endpoints land, so FE is never blocked by backend.
- **Backend leads front-end by about a week.** Backend endpoints for a feature land in the sprint before or early in the sprint in which FE finishes its screen.
- **Every PR has one reviewer from a different role.** DQ reviews test code, BE1 and BE2 review each other, FE reviews anything that changes a response shape.
- **Merge continuously, release at sprint end.** Work merges to `main` behind feature flags throughout the sprint. DQ cuts the sprint release on the last day only if the Definition of Done is met.
- **Sprint ceremonies:** planning (day 1, 1 h), a 15-minute daily stand-up, mid-sprint check (day 5: re-plan if a gate is at risk), demo + retro (day 10).

## Definition of Done (applies to every sprint and every PR)

1. Every "Testable outcome" for the item has an automated test (unit, integration or E2E) that passes, unless marked *manual*.
2. CI is green: lint, type-check, unit, integration.
3. Playwright E2E passes against the Vercel preview deployment (with its own Neon database branch).
4. DQ has walked the manual QA checklist on the preview URL (desktop and phone width) for every user-facing change.
5. Pull request reviewed and merged to `main`; production deployed, migrations applied, smoke test (`/api/health` plus the sprint's main page) passes.
6. Anything not yet meant for real users stays behind a feature flag (`FLAG_PUBLIC_ENROLLMENT`, `FLAG_TUTOR_PORTAL`, `FLAG_ADMIN_PORTAL`), so production only ever contains tested code and no half-visible features.

Sprint-level rule: an item that fails a gate at sprint end is not released. It rolls into the next sprint, and the slack in Sprint 4 absorbs the slip (see "Risks and contingency").

## Overview

| Sprint | Weeks | Goal | Released increment | Main requirements |
|---|---|---|---|---|
| 1 | 1–2 | Foundation, data model, scheduling engine, form steps 1–2 | Pipeline, health check, seeded database, public tutor/offering APIs, schedule preview API. Enrollment form (steps 1–2) on preview only | BR-1 – BR-8, BR-10 – BR-17 (domain), FR-S1 – FR-S3, FR-A3 (data) |
| 2 | 3–4 | A family can enroll and get an email; staff can log in and confirm payment; tutors can accept students (API) | Full public enrollment (soft launch possible), admin portal, accept API | FR-S4 – FR-S7, BR-19, FR-A1, FR-A2, FR-A3, FR-A5, FR-T1, FR-T6, FR-T7 |
| 3 | 5–6 | Tutor portal: pool, accept, My students, calendar, cancel, hours ledger; backend for add and edit schedule | Tutor portal live | FR-T1 – FR-T9, FR-T11, FR-T12, FR-T14, BR-10 – BR-18 |
| 4 | 7–8 | Add sessions, edit schedule, 3-day email, admin tools, hardening, UAT, launch | Production launch | FR-T10, FR-T13, FR-S8, FR-A3, FR-A4, BR-20, BR-21, non-functional requirements |

### Workload at a glance

| Role | Sprint 1 | Sprint 2 | Sprint 3 | Sprint 4 |
|---|---|---|---|---|
| DQ | Pipeline, environments, test infrastructure | E2E for enrollment and admin, email deliverability, abuse protection checks | Clock-controlled E2E, race tests, regression suite | Authorization matrix, Lighthouse, restore drill, UAT, launch |
| BE1 | Scheduling engine, preview API | Enrollment API, email E1, form protection, accept API | My students + ledger API, edit-schedule API | 3-day email cron, retries, admin alert, support for UAT |
| BE2 | Schema, seed, reference APIs, auth skeleton | Auth, roles, admin APIs, audit log, pool API | Sessions API: week view, cancel, add; auto-COMPLETED | Admin cancel/release, security hardening, performance |
| FE | Wizard shell, steps 1–2, slot editor component | Steps 3–4, success page, login, admin list + payment | Pool, detail + Accept, My students, calendar, cancel dialog | Add-session form, schedule editor, admin management pages, a11y, guides |

---

## Sprint 1 (Weeks 1–2): Foundation, data model, scheduling engine, form steps 1–2

Goal: an empty but real app that deploys itself safely, with the riskiest business logic built first and proven by tests, and the first half of the enrollment form on screen.

Blocking questions to resolve in week 1: Q5 (shortened last session), Q14 (time zone and operating hours), Q22 (tutor and subject list), Q23 (domain name and DNS access for email, needed in Sprint 2).

### DQ: DevOps + QA

Build:
- Next.js + TypeScript (strict) + Tailwind + shadcn/ui scaffold and folder structure from `01-architecture-and-stack.md` (days 1–2, so everyone can branch from it).
- ESLint rules enforcing layer boundaries; Prettier; pre-commit hooks.
- Docker Compose Postgres for local; Neon project with `main` branch; Vercel project linked to GitHub with the Neon integration (branch per preview).
- `src/lib/env.ts` validating environment variables at startup; feature-flag helper reading the three `FLAG_*` variables.
- `/api/health` with app version and a `SELECT 1` database check.
- GitHub Actions `ci.yml` and `e2e.yml`; Vitest and Playwright configured with sample tests; branch protection requiring green CI.
- Sentry wired up. Playwright helpers: `page.clock` wrapper, login-as-role fixture, database reset per test, axe accessibility helper. Test data factories.
- QA test plan and the reusable manual QA checklist (desktop and phone width).

Testable outcomes:
- [ ] `GET /api/health` returns `200 { status: "ok", db: "ok" }` locally, on the preview URL and in production.
- [ ] A pull request automatically gets a preview URL and its own Neon branch.
- [ ] A deliberately failing test blocks the merge (verified once, then reverted). *manual*
- [ ] Importing Prisma inside an API route fails lint.
- [ ] Missing `DATABASE_URL` makes the app fail at startup with a clear message.
- [ ] A feature behind a flag returns 404 in an environment where the flag is off.

### BE1: Enrollment and scheduling

Build:
- `domain/schedule/validate.ts` (BR-1 to BR-7) returning typed errors with user-facing messages.
- `domain/schedule/generate.ts` (BR-8), taking `now`, time zone, slots, cadence, start date, hours.
- `domain/sessions/status.ts` (BR-10 to BR-13) and `domain/hours/ledger.ts` (BR-14 to BR-17); built now because they are pure functions and cheap to test, used from Sprint 3.
- Zod schema for the enrollment payload in `src/schemas`; shared by browser and server.
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

### BE2: Platform and tutor portal

Build:
- Prisma schema from `03-data-model-and-api.md` and first migration (days 1–3, since everyone depends on it).
- `seed.ts`: 1 admin, 4 tutors (1 inactive), offerings grouped as Subjects / CET / HSET, settings (time zone, operating hours, payment instructions).
- Repositories + services for tutors and offerings.
- `GET /api/public/tutors`, `GET /api/public/offerings`.
- Auth.js magic-link skeleton: user table, session handling, `requireRole()` helper (full login flow completes in Sprint 2).

Testable outcomes:
- [ ] `prisma migrate deploy` runs cleanly on an empty database and on the preview branch.
- [ ] `/api/public/tutors` returns only the 3 active tutors, sorted by name, with no email or phone fields.
- [ ] `/api/public/offerings` returns offerings grouped by category (SUBJECT, CET, HSET) and excludes inactive ones.
- [ ] Integration test: inserting two `EmailLog` rows with the same `(enrollmentId, type)` fails (once-only email guarantee).
- [ ] `requireRole()` unit tests: anonymous → 401, wrong role → 403, correct role passes.

### FE: Front-end

Build (against MSW mocks until BE2's endpoints are on `main`):
- App shell: layout, design tokens, responsive navigation for public / tutor / admin areas.
- Wizard shell with progress indicator and Back/Next; state kept across steps.
- Step 1 Details (FR-S1): guardian fields required when "student is under 18" is ticked; consent checkbox.
- Step 2 Program (FR-S2) with grouped select; Preferred tutor dropdown with "No preference" default (FR-S3).
- Reusable **slot editor** component (day, start, end in 30-minute steps; add/remove rows), with Storybook or a test page. It is reused in Sprint 2 (enrollment form) and Sprint 4 (tutor schedule editor).

Testable outcomes (E2E written with DQ):
- [ ] Cannot leave Step 1 with empty required fields; each error appears next to its field.
- [ ] Ticking "under 18" makes guardian fields required; unticking removes the requirement.
- [ ] Invalid email and phone formats are rejected.
- [ ] The tutor dropdown lists the seeded active tutors plus "No preference"; the inactive tutor is absent.
- [ ] The program list shows Subjects, CET and HSET groups.
- [ ] Going Back from Step 2 to Step 1 keeps entered data.
- [ ] Axe accessibility scan of steps 1–2 reports no serious violations.
- [ ] Slot editor component tests: 30-minute steps only, add/remove rows, end must be after start.

### Sprint 1 release

Production contains: health check, placeholder landing page, migrated and seeded database (production seeded with the center's real tutor and subject list, Q22), public tutor/offering APIs and the preview endpoint (not linked from any page). The enrollment form ships behind `FLAG_PUBLIC_ENROLLMENT=false`, enabled on preview only.

---

## Sprint 2 (Weeks 3–4): Enrollment, email, login, admin payment, accept API

Goal: a family can submit a complete enrollment and receive email E1; center staff can log in and confirm payment; the backend for tutors to see and accept students exists.

Needs resolved: Q23 (sending domain verified in week 3), Q12 (payment-confirmed email E2), Q2 (pool shows only paid students), Q20 (show rate and amount due).

### DQ: DevOps + QA

Build:
- Resend sending-domain verification (SPF/DKIM) with the client; Upstash Redis and Turnstile keys per environment.
- E2E suites: enrollment happy path (desktop and phone viewport), validation errors, admin login and payment, role redirects.
- Email deliverability checks in Gmail and Outlook.
- Seed scenarios for the pool tests (see Sprint 3), prepared early.

Testable outcomes:
- [ ] Real email received in Gmail and Outlook test inboxes, not in spam, renders correctly on mobile. *manual*
- [ ] E2E full happy path on a phone-sized viewport ends on the success page with a reference code.
- [ ] E2E: visiting `/tutor/pool` or `/admin/enrollments` while logged out redirects to `/login`.
- [ ] 6th submission from the same IP within an hour returns `429` (verified against the preview deployment).
- [ ] Production smoke test after release includes a real enrollment submitted with the flag on, then cleaned up. *manual*

### BE1: Enrollment and scheduling

Build:
- `POST /api/public/enrollments`: re-validates on the server, creates Student, Enrollment, RequestedSlots and RecurringSlots in one transaction, generates the reference code (FR-S7).
- Resend client wrapped by `sendEmail()` writing `EmailLog` (QUEUED → SENT/FAILED); React Email template E1 (BR-19); optional E2 template.
- Turnstile on submit, honeypot field, Upstash rate limit (e.g. 5 submissions per IP per hour).
- `POST /api/tutor/students/:enrollmentId/accept`: atomic assignment plus session generation in one transaction, using `generate.ts` (FR-T6, FR-T7).

Testable outcomes:
- [ ] Integration: a POST that bypasses the UI with an invalid schedule gets `422` and nothing is written to the database.
- [ ] Integration: a valid POST creates exactly 1 enrollment with status SUBMITTED and the requested slots stored unchanged.
- [ ] Reference codes are unique across 10,000 generated codes (unit test).
- [ ] Integration (Resend mocked): submitting creates one SENT `EmailLog` of type ENROLLMENT_RECEIVED addressed to student and guardian.
- [ ] If Resend fails, the enrollment is still saved, the log is FAILED, and the user still sees the success page.
- [ ] Template snapshot test: E1 contains reference code, program, hours, schedule and payment instructions.
- [ ] Submission with the honeypot filled or without a valid Turnstile token returns `400` and stores nothing.
- [ ] Integration: after Accept, generated sessions match exactly what `generate.ts` produced (count, times, total hours = purchased).
- [ ] Race condition: two tutors accept the same student concurrently (`Promise.all` in the test) → exactly one `200` and one `409`; sessions generated exactly once.

### BE2: Platform and tutor portal

Build:
- Auth.js magic-link login completed; `middleware.ts` protecting `/tutor/*` and `/admin/*`.
- Audit-log service (who, when, what, before/after) used by all later write actions.
- Admin APIs: enrollments list with status filter and search (FR-A1); confirm payment with optional E2 (FR-A2); tutor and offering CRUD with deactivate (FR-A3); settings and payment instructions (FR-A5).
- `GET /api/tutor/pool` returning "requested you" and "other" lists (FR-T1 to FR-T3), with no contact details.

Testable outcomes:
- [ ] A tutor account gets `403` from every `/api/admin/*` endpoint.
- [ ] Only emails registered as active users can request a login link; others see a neutral message (no account enumeration).
- [ ] Admin confirms payment → status PAYMENT_CONFIRMED, `paymentConfirmedAt` set, audit-log row written.
- [ ] Confirming payment twice is rejected (`409`).
- [ ] Deactivating a tutor removes them from the public tutor dropdown.
- [ ] Pool seed: 2 paid students prefer Tutor A, 1 paid prefers Tutor B, 2 paid have no preference, 1 unpaid prefers Tutor A.
  - Tutor A gets 2 in "requested" and 3 in "other" (one flagged as preferring Tutor B).
  - Tutor C gets an empty "requested" list and 5 in "other".
  - Nobody receives the unpaid student (Q2 default).
- [ ] Assigned and cancelled enrollments never appear in the pool.
- [ ] The pool response contains no contact details.

### FE: Front-end

Build:
- Step 3 Schedule (FR-S4): hours input, start date, cadence, slot editor from Sprint 1.
- Live validation using the shared domain code, plus the preview panel (FR-S5): weekly total vs purchased, session count, first/last dates, shortened-last-session note.
- Step 4 Review + payment instructions (FR-S6); Turnstile widget and honeypot; success page with reference code; error and rate-limit states.
- Login page (magic link request and "check your email" state).
- Admin: enrollments list with filter and search, confirm-payment dialog.

Testable outcomes (E2E written with DQ):
- [ ] Entering 3 hours and 2 h on 5 days shows the BR-5 message and disables Next.
- [ ] Entering 10 hours and 1 h on 5 days shows "10 sessions, ends <date>" and allows Next.
- [ ] Overlapping slots show the BR-4 message.
- [ ] Preview note appears when the last session is shortened.
- [ ] Admin confirms payment from the list; status badge updates without a page reload.
- [ ] Axe scan of the full enrollment form reports no serious violations.

### Sprint 2 release

Production: public enrollment complete and tested end to end. `FLAG_PUBLIC_ENROLLMENT` can be switched on for a **soft launch** if the center wants to start collecting requests early (tutors can't act on them from the UI until Sprint 3, but admin can already confirm payments). `FLAG_ADMIN_PORTAL=true` with accounts created for center staff. Accept and pool APIs are deployed but unreachable from any page.

---

## Sprint 3 (Weeks 5–6): Tutor portal: pool, accept, My students, calendar, cancel, ledger

Goal: tutors can see waiting students, accept them, see their week with live status colors, and cancel sessions with hours tracked correctly. Backend for add-session and schedule editing lands for Sprint 4's UI.

### DQ: DevOps + QA

Build:
- Clock-controlled E2E suites (`page.clock`): calendar status colors, live refresh, time-zone display.
- Concurrency test harness for accept and cancel.
- Regression suite combining Sprints 1–3 flows; performance baseline for pool and calendar (seeded with ~200 students, ~2,000 sessions).

Testable outcomes (the E2E halves of the outcomes below), plus:
- [ ] Session times display in the center's time zone even when the browser is set to a different zone.
- [ ] Pool and calendar pages load in under 2 s on the performance seed (baseline recorded).
- [ ] Manual QA pass of the tutor portal on tablet, desktop and phone (day view). *manual*

### BE1: Enrollment and scheduling

Build:
- `GET /api/tutor/students` (My students, FR-T9) with ledger summary per student (purchased / completed / scheduled / unscheduled / over-by) and next session.
- `GET /api/tutor/students/:id` detail, restricted to the tutor's own students (and to pool students for the detail dialog, returning contact details only in the detail response).
- `PUT /api/tutor/students/:id/schedule` (FR-T10): cancels future GENERATED sessions from the effective date, regenerates using remaining hours, leaves past sessions and make-ups untouched, audit log with before/after.
- Auto-COMPLETED enrollment status (BR-18).

Testable outcomes:
- [ ] Student with 10 h, 4 completed: change Mon/Wed to Tue/Thu effective next week → remaining 6 h regenerated on Tue/Thu; the 4 completed sessions unchanged.
- [ ] A make-up session scheduled after the effective date survives the regeneration, and regenerated sessions account for its hours.
- [ ] A new schedule whose weekly load exceeds remaining hours returns a warning but can still be saved (tutors aren't blocked by BR-5).
- [ ] The original requested slots remain unchanged in the database.
- [ ] Tutor B gets `404` when requesting Tutor A's student detail.
- [ ] An enrollment whose completed hours equal purchased hours with no future sessions shows as COMPLETED.

### BE2: Platform and tutor portal

Build:
- `GET /api/tutor/sessions?weekStart=` (FR-T11), scoped to the logged-in tutor.
- `DELETE /api/tutor/sessions/:id`: soft cancel with reason and audit log (FR-T12); `includeCancelled` option (FR-T14).
- `POST /api/tutor/sessions`: add make-up / extra session with validation and over-hours flag (FR-T13, BR-17). Built now; its UI ships in Sprint 4.
- Ledger integration so cancel and add update balances (BR-14 to BR-16).

Testable outcomes:
- [ ] A tutor never receives another tutor's sessions.
- [ ] A completed (past) session and an ongoing session can both be cancelled.
- [ ] Ledger: student with 10 h, cancel one 1 h future session → scheduled −1, unscheduled +1, completed unchanged.
- [ ] Ledger: a past session left on the calendar counts toward completed hours.
- [ ] Cancelling an already cancelled session returns `409`; another tutor's session returns `404`.
- [ ] Audit-log row records who cancelled, when, and the reason.
- [ ] Add session: end before start, outside operating hours, or a student not assigned to this tutor are rejected (`422` / `404`).
- [ ] Adding a 1 h make-up uses 1 h of unscheduled balance; adding beyond purchased hours is allowed and returns "over by 1 h".
- [ ] An added session in the past is returned as Completed.

### FE: Front-end

Build:
- Pool page with "Requested you" and "Other students" rows, cards per FR-T4, "Prefers: name" badge, empty states, responsive grid (horizontal scroll rows on phone).
- Student detail dialog (FR-T5): schedule list, mini week grid, contact details, Accept button, "just accepted by another tutor" handling (FR-T6).
- My students list with ledger summary (FR-T9) and "Over by X h" warning.
- Weekly calendar (FR-T11): FullCalendar week view in the center's time zone, previous/next/today, legend, status colors with labels and icons, 60 s refresh, overlapping sessions side by side, phone day view.
- Session dialog with Cancel (confirmation + optional reason) and "Show cancelled" toggle (FR-T12, FR-T14).

Testable outcomes (E2E with DQ, clock fixed with `page.clock`):
- [ ] Tutor A opens a card, sees guardian phone and email and the requested schedule, clicks Accept; the card disappears and the student appears in My students.
- [ ] Tutor B no longer sees the accepted student in the pool; accepting a just-taken student shows the "accepted by another tutor" message.
- [ ] Each card shows name, grade, program, hours, weekly pattern and start date.
- [ ] Accepting a student whose schedule overlaps an existing student's sessions succeeds and both are visible side by side (FR-T8).
- [ ] With the clock set to Wednesday 16:30, Wednesday's 16:00–17:00 session shows "LIVE" in amber, Monday's sessions show "Completed" in green, Friday's show blue.
- [ ] Advancing the clock to 17:01 changes the Wednesday session to Completed within 60 s, without reloading.
- [ ] Next/previous week navigation loads the correct sessions; "Today" returns to the current week.
- [ ] Cancelling an upcoming session removes it from the week view; with "Show cancelled" on, it appears greyed and struck through.
- [ ] Status is never conveyed by color alone (labels and icons present); axe scan has no serious violations.

### Sprint 3 release

Production with `FLAG_TUTOR_PORTAL=true`: pool, accept, My students, calendar and cancel are live. The add-session and edit-schedule APIs are deployed but have no UI yet.

---

## Sprint 4 (Weeks 7–8): Add sessions, edit schedule, 3-day email, admin tools, hardening, UAT, launch

Goal: feature complete by the middle of week 8's first half (day 6 of the sprint); the remaining days go to hardening, UAT with the client and launch.

Needs resolved: Q24 (tutor contact details in E3), Q25 (admin users and support), Q16 (release a student back to the pool).

### DQ: DevOps + QA

Build / do:
- Authorization matrix test: every endpoint × every role (anonymous, tutor, other tutor, admin).
- Lighthouse runs, dependency audit, security headers check.
- Neon backup and restore drill on a new branch; production seed data reviewed; alerts and Sentry release tracking configured.
- UAT script preparation and facilitation; back-dating helper for the 3-day email on preview.
- Launch: enable all flags, smoke test, monitor the first 48 hours.

Testable outcomes:
- [ ] Authorization matrix test passes for every endpoint and role.
- [ ] Lighthouse on enrollment form (mobile): Accessibility ≥ 95, Performance ≥ 85.
- [ ] Database restore to a new branch succeeds and the app runs against it. *manual*
- [ ] Vercel dashboard shows the cron firing hourly in production. *manual*
- [ ] UAT scripts signed off by the client: (1) family enrolls and receives E1; (2) admin confirms payment; (3) preferred tutor sees the student first and accepts; (4) tutor cancels one session and adds a make-up; (5) tutor edits the schedule; (6) E3 arrives after the 3-day mark (simulated by back-dating payment on preview). *manual*
- [ ] All feature flags on in production; enrollment link shared on the center's channels.

### BE1: Enrollment and scheduling

Build:
- Templates E3 and E4.
- `/api/cron/assignment-emails` (BR-20, BR-21) with `CRON_SECRET`; retry of FAILED emails up to 5 attempts; `vercel.json` hourly schedule.
- Admin list fields for "Tutor email sent at…" and alert state.
- Support UAT: bug fixes on scheduling and email.

Testable outcomes (cron service called directly with an injected `now`):
- [ ] Paid 3 days + 1 hour ago and assigned → E3 sent to student and guardian with tutor name and first session; `tutorEmailSentAt` set.
- [ ] Paid 2 days ago and assigned → nothing sent.
- [ ] Paid 4 days ago, not assigned → E4 sent to admin once; E3 not sent.
- [ ] Same student then assigned on day 5 → E3 sent on the next run.
- [ ] Running the job twice in a row never sends a duplicate.
- [ ] Calling the endpoint without the correct secret returns `401`.
- [ ] A failed send is retried on the next run and stops after 5 attempts.

### BE2: Platform and tutor portal

Build:
- Admin cancel enrollment and release student back to the pool, cancelling future sessions (FR-A4, Q16), with audit log.
- Security pass: role and ownership checks on every tutor/admin endpoint, security headers, rate limits on login.
- Performance work on pool, calendar and list queries (indexes, pagination).
- Data-retention job design (Q18) documented; production configuration review.

Testable outcomes:
- [ ] Admin releases an assigned student: future sessions are cancelled, past sessions kept, enrollment returns to the pool.
- [ ] Admin cancels an unpaid enrollment; it disappears from the pool and public lists.
- [ ] Pool, calendar and admin list queries stay under 300 ms server time on the performance seed.
- [ ] Login link requests are rate limited.

### FE: Front-end

Build:
- "Add session" button and click-on-empty-slot to pre-fill (FR-T13): form with date, start, end, student, lesson (pre-filled, editable), type Make-up or Extra; dashed border and tag; over-hours warning.
- Schedule editor on the student detail page (FR-T10) reusing the slot editor, with "Effective from" date and warning when needed hours exceed remaining.
- Admin management pages: tutors, offerings, settings and payment instructions (FR-A3, FR-A5); "Release student" and "Cancel enrollment" actions (FR-A4); "Tutor email sent at…" display.
- Past students tab; accessibility and responsive polish from UAT feedback.
- One-page user guides: tutors (pool, accept, calendar, cancel, add) and admin (confirm payment, manage tutors).

Testable outcomes (E2E with DQ):
- [ ] Clicking empty Thursday 15:00 opens the form pre-filled with Thursday 15:00–16:00; saving shows a dashed "Make-up" session there.
- [ ] The added session can be cancelled, which restores the balance.
- [ ] A student shows "Over by 1 h" in My students and the admin list after an over-hours add.
- [ ] The calendar reflects the new schedule immediately after saving a schedule edit.
- [ ] Admin deactivates a tutor from the UI; the tutor disappears from the public dropdown.
- [ ] Completed enrollments appear in "Past students".

### Sprint 4 release

Production launch on the last day. Sprint days 7–10 are reserved for hardening, UAT, fixes and launch; no new features start after sprint day 6.

---

## Dependencies between roles

| Needed by | From | Item | Latest date (sprint day) |
|---|---|---|---|
| Everyone | DQ | Scaffold on `main` | S1 day 2 |
| BE2, FE, DQ | BE2 | First migration and seed | S1 day 3 |
| FE | BE2 | `/api/public/tutors` and `/offerings` | S1 day 5 (FE mocks until then) |
| FE | BE1 | Preview endpoint and shared domain package | S1 day 6 (FE uses domain code directly from day 4) |
| FE | BE1 | `POST /api/public/enrollments` | S2 day 4 |
| FE | BE2 | Auth + admin enrollments and payment endpoints | S2 day 5 |
| FE | BE2 | Pool endpoint | S2 day 10 (before FE starts pool UI) |
| FE | BE1 | Accept endpoint | S2 day 10 |
| FE | BE2 | Sessions week, cancel endpoints | S3 day 3 |
| FE | BE1 | My students and detail endpoints | S3 day 3 |
| FE | BE2, BE1 | Add-session and edit-schedule endpoints | S3 day 10 |
| DQ | All | Seed scenarios per feature | start of that feature's sprint |

## Risks and contingency

| Risk | Impact | Response |
|---|---|---|
| FE is a single person and carries the most screens (about 14 screens/dialogs over 4 sprints) | A slipped FE item delays the sprint release | Backend leads by a sprint so FE is never waiting; BE1/BE2 pick up simple pages if free (admin management pages first); DQ builds Storybook states and E2E page objects to keep FE focused on UI. |
| Sprint 3 is the heaviest for FE (pool, detail, My students, calendar, cancel) | Calendar quality suffers | Cut order if needed: "Show cancelled" toggle, then phone day view move to Sprint 4; the pool, accept and calendar core stay. |
| Single DevOps/QA person is also the release gate | Bottleneck on sprint last day | BE1 and BE2 write their own unit and integration tests; DQ owns E2E and the manual checklist. Dry-run the release on sprint day 8. |
| Client answers late (Q22, Q23, Q24) | Seed data or email domain missing | Use the defaults in `05-open-questions.md`; production seeding and DNS are scheduled for Sprint 2 to leave buffer. |
| Sprint 4 feature work overruns | UAT and launch squeezed | Hard stop on new features at sprint day 6. Anything unfinished is moved to a post-launch backlog (or a 1-week Sprint 5 if the client prefers to delay launch). Candidates for that backlog: student self-service lookup by reference code, printable weekly schedule, CSV export of hours for payroll. |
