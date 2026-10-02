# 02: Requirements and Business Rules

Requirement IDs (FR = functional requirement, BR = business rule) are referenced from the milestones and the tests.

## 1. Student / parent side (public, no login)

The enrollment form is a four-step wizard with a progress indicator. Nothing is saved until the final submit.

| ID | Requirement |
|---|---|
| FR-S1 | Step 1, Details: student name, email, phone, grade level, school (optional). Guardian name, relationship, email and phone (required if the student is a minor; see Q19). Data-privacy consent checkbox. |
| FR-S2 | Step 2, Program: choose what to be tutored in from one list grouped as Subjects, CET, HSET (managed by admin). Optional free-text "topics / notes". |
| FR-S3 | Step 2, Tutor: optional "Preferred tutor" dropdown listing active tutors' names, with "No preference" as the default. |
| FR-S4 | Step 3, Schedule: enter number of hours being paid for, a start date, a frequency (weekly or every other week), and one or more weekly time slots (day of week + start time + end time). |
| FR-S5 | The schedule step validates live against the hours (BR-1 to BR-7) and shows a preview: number of sessions, first and last session dates, and whether the final session is shortened. |
| FR-S6 | Step 4, Review: summary of everything plus manual payment instructions (text editable by admin). Submit. |
| FR-S7 | On submit the server re-validates everything, stores the request with status SUBMITTED, shows a reference code (e.g. `ENR-7K3Q9P`), and sends email E1 "Request received" to the student and guardian. |
| FR-S8 | 3 days after payment is confirmed, the student and guardian receive email E3 with the assigned tutor's name and contact details (rules in BR-20). |

## 2. Hours and schedule validation (the core rule set)

Definitions:
- **H** = purchased hours (what the student pays for in one transaction).
- **Slot** = a weekly recurring time window, e.g. Tuesday 16:00–17:30.
- **W** = weekly load = sum of all slot durations in one cycle.
- **Cycle** = one week (weekly) or two weeks (every other week).

| ID | Rule | Error message shown |
|---|---|---|
| BR-1 | H is between 1 and 200 and a multiple of 0.5 (limits configurable). | "Hours must be in half-hour steps between 1 and 200." |
| BR-2 | Each slot is 30 min to 4 h long and starts/ends on a 30-minute boundary. | "Sessions must be 30 minutes to 4 hours, in 30-minute steps." |
| BR-3 | Each slot is within the center's operating hours (configurable, default 08:00–20:00). | "Sessions must be between 8:00 AM and 8:00 PM." |
| BR-4 | Slots must not overlap each other. Two slots on the same day are allowed if they don't overlap. | "These two time slots overlap." |
| BR-5 | **W ≤ H.** A student cannot book more hours per cycle than they are paying for in total. | "Your weekly schedule adds up to 10 h but you are enrolling for 3 h. Remove sessions or increase your hours." |
| BR-6 | Start date is today or later and no more than 60 days ahead (configurable). | "Choose a start date within the next 60 days." |
| BR-7 | At least one slot is required. | "Add at least one time slot." |

### Session generation (BR-8)

Sessions are generated in time order, cycle after cycle, starting on the start date, until the purchased hours are used up:

```
remaining = H
for each cycle starting at startDate:
    for each slot in chronological order (skipping any before startDate in the first week):
        if remaining == 0: stop
        duration = min(slot.duration, remaining)      # last session may be shortened
        create session(slot.day, slot.start, slot.start + duration)
        remaining -= duration
```

Because H and slot durations are both multiples of 0.5 h (BR-1, BR-2), the remainder is always a usable whole number of half-hours, so there are never unusable scraps of time. If the final session is shortened, the preview says so (for example "Your last session on 14 Nov will be 1 h instead of 1.5 h"). Whether shortening is acceptable or the form should instead require H to be an exact multiple of W is open question Q5.

### Worked examples (these become unit tests)

| # | H | Slots | W | Result |
|---|---|---|---|---|
| 1 | 10 | Mon–Fri 1 h each, weekly | 5 | Valid. 10 sessions over 2 weeks. |
| 2 | 3 | Mon–Fri 2 h each, weekly | 10 | Invalid: BR-5 (10 h per week > 3 h purchased). |
| 3 | 3 | Mon, Wed, Fri 1 h, weekly | 3 | Valid. 3 sessions in 1 week. |
| 4 | 10 | Mon, Wed, Fri 1.5 h, weekly | 4.5 | Valid. 7 sessions: six of 1.5 h, last one shortened to 1 h. |
| 5 | 8 | Sat 2 h, every other week | 2 | Valid. 4 sessions spread over 7 weeks. |
| 6 | 4 | Tue 16:00–17:00 and Tue 16:30–18:00 | – | Invalid: BR-4 overlap. |
| 7 | 2.25 | any | – | Invalid: BR-1 (not a half-hour step). |
| 8 | 5 | Mon 1 h, start date is a Wednesday | 1 | Valid. First session is the following Monday. |

## 3. Tutor side (logged in)

| ID | Requirement |
|---|---|
| FR-T1 | **Student pool** page shows a card for every enrollment that is payment-confirmed and has no tutor (see Q2 for whether unpaid requests should also appear). |
| FR-T2 | The first row, "Requested you", contains students whose preferred tutor is the logged-in tutor. If there are none, the row stays visible with an empty-state message ("No students have requested you yet"). |
| FR-T3 | The second row, "Other students", contains the remaining unassigned students. Students who preferred a different tutor show a small "Prefers: name" badge (see Q6). |
| FR-T4 | A card shows: student first name, grade, program (subject/CET/HSET), hours purchased, weekly pattern summary (e.g. "Mon/Wed/Fri 4–5 PM"), start date. |
| FR-T5 | Clicking a card opens a detail dialog: full preferred schedule (list + mini week grid), student and guardian contact details, notes, and an **Accept** button. |
| FR-T6 | Accept assigns the student to that tutor atomically. If another tutor accepted a moment earlier, the tutor sees "This student has just been accepted by another tutor" and the card disappears. |
| FR-T7 | After Accept, the card disappears from every tutor's pool, the student appears in the tutor's **My students** list, and sessions are generated into the tutor's calendar (BR-8, using the student's requested slots as the starting recurring schedule). |
| FR-T8 | Schedule collisions with the tutor's existing students are allowed. The calendar shows overlapping sessions side by side; no blocking or conflict-resolution feature. |
| FR-T9 | **My students** list: name, program, hours purchased / completed / scheduled / unscheduled, next session, contact details. |
| FR-T10 | The tutor can freely edit a student's recurring schedule (add, remove or change slots, choose an "effective from" date). Future generated sessions from that date are regenerated to fit the student's remaining hours. Past sessions and manually added sessions are not touched. BR-5 does not block tutors, but the editor warns if the new schedule needs more hours than remain. |
| FR-T11 | **Weekly schedule** page: a week calendar (Mon–Sun, operating hours) with previous/next/today navigation, showing all of the tutor's sessions for that week. |
| FR-T12 | Clicking a session opens a dialog with student, lesson, time, status and a **Cancel session** button (with optional reason and a confirmation). Cancelling removes it from that week's view. This works for upcoming, ongoing and completed sessions alike. |
| FR-T13 | An **Add session** button (or clicking an empty time cell) opens a form: day/date, start time, end time, student (from the tutor's students), lesson, and type (make-up or additional). The session appears immediately. Added sessions can be cancelled the same way. |
| FR-T14 | A "Show cancelled" toggle reveals cancelled sessions greyed out with strike-through, for reference. Off by default. |

## 4. Session status and colors (BR-10 to BR-13)

Status is computed from the current time, not stored, so it is always correct without a background job. The calendar re-evaluates it every 60 seconds.

| ID | Status | Condition | Display |
|---|---|---|---|
| BR-10 | Upcoming | now < start | Blue block |
| BR-11 | Ongoing | start ≤ now < end | Amber block with a "LIVE" badge and pulsing dot |
| BR-12 | Completed | now ≥ end, not cancelled | Green block with a check icon and the word "Completed" |
| BR-13 | Cancelled | cancelled by tutor | Hidden by default; grey strike-through when "Show cancelled" is on |

Make-up and additional sessions use the same colors plus a dashed border and a "Make-up" or "Extra" tag. Status is never shown by color alone (icons and text labels are included) for accessibility. A legend sits above the calendar.

## 5. Hours accounting (BR-14 to BR-18)

| ID | Rule |
|---|---|
| BR-14 | Completed hours = sum of durations of non-cancelled sessions whose end time has passed. Any session left on the calendar counts as completed once its time passes, exactly as the brief describes. |
| BR-15 | Scheduled hours = sum of durations of non-cancelled sessions that haven't ended yet. |
| BR-16 | Unscheduled balance = purchased − completed − scheduled. Cancelling a session returns its hours to this balance. The system does not automatically re-book them; the tutor adds a make-up session when agreed with the family (see Q8). |
| BR-17 | Make-up and additional sessions draw from the same purchased hours. If the balance goes negative, the student shows an "Over by X h" warning to the tutor and in the admin list so the center can collect payment for extra hours (see Q7). Adding the session is still allowed. |
| BR-18 | When completed hours reach purchased hours and no future sessions remain, the enrollment becomes COMPLETED and moves to a "Past students" tab. |

Every cancel, add and schedule edit writes an audit-log entry (who, when, what, before/after), because these actions directly change what the family has paid for.

## 6. Emails (BR-19 to BR-21)

| ID | Rule |
|---|---|
| BR-19 | E1 "Request received" is sent immediately on submit, to the student and guardian emails. Contains reference code, summary, and payment instructions. |
| BR-20 | E3 "Your tutor" is sent when **both** of these are true: 3 days have passed since payment was confirmed, and a tutor has accepted. If a tutor accepts after day 3, it goes out within the next hour after acceptance. It is sent exactly once. |
| BR-21 | If no tutor has accepted by day 3 after payment, admin receives E4 "Unassigned student" so the center can follow up. |

## 7. Admin side (added, minimal)

| ID | Requirement |
|---|---|
| FR-A1 | List of enrollments filterable by status, searchable by name or reference code. |
| FR-A2 | **Confirm payment**: amount, payment reference/method, payment date. Moves the enrollment to PAYMENT_CONFIRMED, which starts the 3-day clock and puts the student in the tutor pool. |
| FR-A3 | Manage tutors (add, deactivate; deactivated tutors disappear from the dropdown) and offerings (subjects, CET, HSET). |
| FR-A4 | Cancel an enrollment, or release a student from a tutor back to the pool (see Q16). |
| FR-A5 | Edit the payment instructions text and center settings (time zone, operating hours, limits). |

## 8. Non-functional requirements

| Area | Target |
|---|---|
| Devices | Enrollment form fully usable on a phone; tutor calendar usable on tablet and desktop (phone shows a day view) |
| Accessibility | WCAG 2.1 AA for the public form |
| Security | Role checks on every tutor/admin endpoint; a tutor can only read and change their own students' sessions; public endpoints rate-limited and protected by Turnstile |
| Time zones | All times stored in UTC, shown in the center's time zone |
| Performance | Pool and calendar pages load in under 2 s on a typical connection |
| Reliability | Email sends logged with status; failed sends retried by the hourly cron |
