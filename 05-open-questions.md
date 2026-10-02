# 05: Open Questions and Assumptions

These are points the brief leaves unclear. Each has a proposed default so development isn't blocked; the plan is built on these defaults. "Needed by" is the milestone day that depends on the answer. Changing a default after that day is still possible but costs rework.

## Payments and the enrollment flow

| # | Question | Why it matters | Proposed default | Needed by |
|---|---|---|---|---|
| Q1 | Who records that a manual payment was received? | The 3-day email clock starts at payment, so the system must know when payment happened. | Add an Admin role (center staff) with a "Confirm payment" action. | Day 7 |

Answer: yes go with default decision

| Q2 | Should requests that haven't been paid yet appear in the tutors' pool? | Tutors could accept students who never pay. | No. Only payment-confirmed requests appear in the pool. | Day 8 |

Answer: only payment confirmed requests appear in the pool

| Q3 | "Email of the tutor assigned after 3 days of paying": what if no tutor has accepted by day 3? | The email would have nothing to say. | Send it as soon as a tutor accepts after day 3, and alert admin at day 3 that the student is still unassigned. | Day 14 |

Answer: Send it as soon as a tutor accepts after day 3, and alert admin at day 3 that the student is still unassigned.

| Q4 | Is it 3 calendar days or 3 business days? Could it be "within 3 days" (send as soon as assigned) instead? | Changes the cron condition. | 3 calendar days, sent no earlier than that. | Day 14 |

Answer: 3 calendar days


| Q12 | Should families also get an email when payment is confirmed? | Reassures families between paying and hearing about their tutor. | Yes, a short "Payment received" email (E2). | Day 7 |

Answer: yes short payment received email

| Q17 | When a student wants more hours, is it a new enrollment or a top-up to the existing one? | Affects the data model and the tutor relationship. | New enrollment, pre-filled from the previous one, with the current tutor as preferred tutor. Top-up flow is post-launch. | Post-launch |

Answer: proceed with the default answer

| Q20 | Should the form show the hourly rate and the amount due? | Families need to know how much to pay. | Yes, if the center provides rates per program; otherwise payment instructions only. | Day 5 |

Answer: yes the form should show the hourly rate and the amount due. this shoould be editable by the admin


## Scheduling and hours

| # | Question | Why it matters | Proposed default | Needed by |
|---|---|---|---|---|
| Q5 | If purchased hours aren't an exact multiple of the weekly schedule (e.g. 10 h with 4.5 h/week), is a shortened final session OK, or should the form reject it? | Changes the validation rule. | Allow it; shorten the last session and tell the family in the preview. | Day 3 |

Answer: Shortened is okay and notify the family

| Q9 | Does "how frequent" mean sessions per week (covered by choosing days) or also every-other-week schedules? | Adds a cadence option. | Support Weekly and Every other week. | Day 3 |

Answer: Support weekly and every other week we hould remain flexible and customizeable to the students needs. We can draw inspiration to the interface of google calendar when creating repeating/reoccuring events.

| Q7 | Do make-up and additional sessions use up the purchased hours? What if they go over? | Determines the hours ledger. | Both use purchased hours. Going over is allowed but flagged as "Over by X h" for the center to collect payment. | Day 12 |

Answer: Both use purchased hours. We do not allow going over, must notify tutor and or admin that they must pay the balance before having exceeding session.

| Q8 | When a session is cancelled, what happens to those hours? | Could be returned, auto-rescheduled, or forfeited (e.g. no-show). | Returned to the unscheduled balance; tutor adds a make-up when agreed. A future "forfeit" option can be added if the center charges for late cancellations. | Day 11 |

Answer: can be returned rescheduled or forfeited. but NOOT auto-resched, this should be manually done. the hours are returned to the unscheduled balance. late cancellation is added onto the purchased hours of the student i.e. if the student enrolls 10hrs, cancels 30mins into a session then 30 minutes is taken up from their purchased time, now 9.5hrs consumable are left. note that this charge only applies 30minutes into the session.

| Q21 | Should there be any limit on cancelling sessions that are already completed (e.g. weeks later)? | Retroactive cancellation changes billed hours. | Allowed at any time (as the brief says), but every cancellation is audit-logged with who and when. | Day 11 |

Answer: yes, go with your default decision.


| Q14 | What time zone, opening hours and opening days does the center use? | Validation and calendar display. | Single center time zone, configurable; default hours 08:00–20:00, Monday–Sunday. | Day 3 |

Answer: time zone is UTC/GMT +8 hour in the philippines. we are open everyday of the week from 6am-12am. 

| Q15 | Are sessions online, in person, or both? Is there room booking? | May need a location/link field. | Add an optional "location / meeting link" text field per student; no room booking. | Day 9 |

Answer: sessions can be either online or in person. there is no room booking, just selection of branch: Bell Mansion #62 Road 13, Bagong Pag-asa, Quezon City, Philippines, 1105 OR H4W8+8VX, Lot 8 Block 6 Main street V.V. Country Homes, Countryside Dr, Cainta, 1900 Rizal but the branches should be editable or can be added onti by the admin. the admin must also be able to set a capacity for the center (if tooo many students are booked at a certain time, system should mark location as full). 

## Tutors and students

| # | Question | Why it matters | Proposed default | Needed by |
|---|---|---|---|---|
| Q6 | Can other tutors accept a student who chose a specific preferred tutor? Should the preferred tutor get a head start? | Fairness to the requested tutor vs speed for the family. | Visible to all tutors with a "Prefers: name" badge; no exclusive window. Optional later: 24-hour exclusive window for the preferred tutor. | Day 8 |

Answer: oother tutors can accept a student regardless of their preferred tutor. first come first serve basis.

| Q16 | Can a tutor give a student back after accepting? Who reassigns? | Mistaken accepts happen. | Only admin can release a student back to the pool; future sessions are cancelled when released. | Day 7 |

Answer: Only admin can release a student back to the pool. Tutors can also request to admin to give a student back after completing some sessions, can be reassigned to a different tutor.

| Q11 | Should families get an automatic email when the tutor cancels, adds or reschedules sessions? | The brief says these are communicated directly. | No automatic emails for these in v1. | Day 11 |

Answer: no emails.

| Q24 | Which tutor contact details may be shared in the "Your tutor" email? | Tutors' personal numbers. | Tutor name plus the center's contact details; tutor phone/email only if the tutor opts in. | Day 14 |

Answer: proceed with default answer with additional but optional contact for tutors to place their facebook.

| Q10 | Do students need accounts to view their schedule? | Extra scope. | No accounts in v1. Reference code only. A read-only schedule link is a post-launch option. | Post-launch |

Answer: no accounts. v1 shall assume that schedules are agreed upon manually through the communication channels

| Q13 | Can one enrollment cover several subjects? | Form and data model. | One program per enrollment; a second subject is a second enrollment. | Day 4 |

Answer: yes one enrollment can cover several. some tutors can simply be homework/regular school work help.

| Q19 | Up to what age is a guardian's contact required? | Form validation. | Guardian details required when the student is under 18. | Day 4 |

Answer: continue with default answer.


## Content, data and launch

| # | Question | Why it matters | Proposed default | Needed by |
|---|---|---|---|---|
| Q22 | Final list of tutors (names, emails), subjects, and the exact CET and HSET offerings (and what HSET stands for, so it's labelled correctly). | Seed data for production. | Client supplies a spreadsheet. | Day 2 |

Answer: admin should be able to make more tutors. cet is college entrance exam preparation, high school entrance exam preparation (there are many more other types, should also be editable by admin)

| Q18 | Which data-privacy law applies, and how long should records of former students be kept? | Consent wording and data retention. | Consent checkbox with privacy notice; keep records for 2 years after the last session, then anonymise. Center to confirm against local law. | Day 4 |

Answer: continue with default answer.

| Q23 | Domain name and sending email address (e.g. `enroll@center.com`), logo and colors. | Email deliverability needs DNS access early. | Client provides DNS access in week 1. | Day 6 |

Answer: to be provided when needed

| Q25 | Who will be the admin users, and who supports the system after launch? | Accounts and handover. | 1–2 center staff as admins; a maintenance arrangement agreed separately. | Day 15 |

Answer: continue with default answer.

