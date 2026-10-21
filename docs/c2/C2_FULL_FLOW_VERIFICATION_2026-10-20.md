# C2 production-flow verification — 20 October 2026

The tested core C2 flow passed in a local **production** build. This is evidence of the paths below, not a guarantee that every input, device or deployment is error-free. A Vercel deployment with model assets has not yet been verified, and the booking limitations below remain.

## Environment

- Commit `3e64425` plus the uncommitted ONNX production-build fix in `next.config.mjs`.
- Fresh source export; full `npm run build` succeeded with Next.js 14.2.35, lint, TypeScript, page generation and route output. Existing lint warnings remain.
- `next start --hostname 127.0.0.1 --port 3001` served the completed build. The development site on port 3000 was not replaced.
- Browser tests used synthetic input and the user-provided student test account. No credentials or real booking details are included here.
- `npx jest --runInBand --silent --cacheDirectory D:/NewReaserch/.jest-cache-c2 tests/unit/c2`: **299 tests / 20 suites passed**. These automated tests include mocks and do not replace the browser/database checks below.

## Actual production browser checks

| Area | Result and observed evidence |
| --- | --- |
| PHQ-9 and GAD-7 | Scenario A produced 13/27 moderate and 13/21 moderate. Scenario B produced 8/27 mild and 4/21 minimal. Each scale remained separate from model scores. |
| Main DistilBERT integration | Both narratives ran through **Suggest topics** in the main check-in, not just the research inspector. A selected study/worry; B selected self-esteem/grief. |
| Adaptive questions | Both completed six context questions. Changing A's answer from workload planning to difficulty starting tasks changed the next question; restoring the answer restored the workload branch. |
| Student control without inference | A separate complete 0/0 screening used a manually selected practical-support topic without pressing Suggest topics. Housing selected an accommodation-specific next question. Its final community was Everyday Support LK without a DistilBERT-informed match claim. |
| Incomplete screening | All 16 screening items were skipped in a separate run. Two standard context items followed; both scales showed incomplete with no calculated total/range. Unanswered PHQ-9 item 9 did not imply safety. |
| Immediate support | Opened without an assessment. A synthetic chat safety phrase displayed the support panel. A direct safety checkbox also displayed and retained the panel with 0/0 questionnaire scores and without requesting model inference. No notification was sent. |
| Wellness plan | A suggested workload planning, worry support and pause. B suggested balanced perspective, grief support and pause. Explanations reflected confirmed topics and earlier answers. |
| Guided activities | The workload activity opened, accepted synthetic writing, advanced through its steps and recorded completion. Replacing an activity with a sleep activity and restoring the suggested plan worked. |
| Community recommendations | A recommended Study Balance LK / Campus Calm Circle. B recommended Confidence & Kindness / Space for Grief. Reasons reflected different topics and answers. |
| Community browsing | Preview showed original authored starters. Eating + Sinhala showed no matching circle. Show all displayed all 13. No group join/post/message action was performed. |
| Sample professionals | All eight loaded from the protected database API. A ranked Nethmi Perera first; B ranked Tharushi Senanayake first. Female + Sinhala + psychologist returned one profile, Tharushi. Selection showed that sample profiles cannot receive real appointments. |
| University directory | Loaded three actual directory records and the separate booking UI under the signed-in account. No appointment was requested, changed or cancelled. |
| Student forum | The authenticated forum loaded its recent-discussions section and explicit publishing controls without a retry/sign-in error. No post or reply was published. |
| Support chat | An exam-worry message received relevant prepared support text; a contextual next-step control worked. Clear chat removed the synthetic conversation. This is prepared guided support, not a generative DistilBERT chatbot. |
| Reflections | Synthetic writing with optional on-device analysis produced emotion-label results; Keep in this session worked. |
| Appointment notes | Default preview was empty and download disabled. Selecting scores/topics and writing synthetic notes updated the exact preview. The download control reported that a download was requested; the downloaded file's bytes were not independently inspected. Nothing was sent to a professional. |
| Device progress | Explicit opt-in was required. Saved one synthetic mood entry, one screening summary and one activity completion. A fresh page required opt-in again and loaded all three while private check-in drafts were absent. |
| Session clearing | Reset the overview/check-in; reflection, chat and appointment draft cleared. Device-history opening required opt-in again. Saved history remained separate, as described by the UI. |
| Browser console | No captured warning/error entries in the main, second-scenario or edge-case browser tabs at the inspection point. No server exceptions were observed in the captured production-server output. |

Three synthetic progress records were created only in the **port 3001 browser origin**, initially empty. They were left available to inspect; no pre-existing user history was deleted. Port 3000 history was not changed.

## Database and HTTP checks

- Read-only verification matched **270 questions**, **13 sample circles covering all 15 topics**, and **8 synthetic professional profiles** to their checked-in definitions.
- The model verifier checked all **22 model/tokenizer/runtime files** using SHA-256.
- Production wellness/research pages, model manifest, external WASM JavaScript and public sample-community API returned HTTP 200.
- Unsigned requests to the sample-professional, university-professional, booking and student-forum APIs returned HTTP 401. Public sample circles remained HTTP 200.
- These checks did not create real bookings, posts, memberships or notifications.

## Remaining limits and work

1. **Hosted model delivery:** `public/c2/transformer/` remains ignored by Git. This local test used installed private model assets. Vercel needs those assets provisioned separately; fixing compilation does not provision them. No new Vercel build/deployment was exercised during this verification; remote deployment status must be checked separately after the approved push.
2. **Booking validation:** source review of `src/app/api/counselor-bookings/route.ts` found only non-empty checks for date/time before insertion. The browser rejects past dates, but the server lacks strict calendar/time and past-time validation. Duplicate requests also lack an atomic/idempotency guard. These were not changed in the ONNX build fix.
3. **Live write delivery:** real booking submission/cancellation, notification receipt, forum publishing/replies and their full multi-role review cycle were not exercised against shared data. They must not be represented as verified by this browser session. Sample-booking blocking and selected request fields are covered by automated mocked tests.
4. **Scope:** the model's known synthetic-data/English-only/clinical-validation limits still apply. Historical research experiments, all browsers/devices, accessibility certification and load testing were not comprehensively retested here.

## Evidence

- [Production build fix](PRODUCTION_BUILD_FIX.md)
- [Scenario A screening summary](evidence/production-c2-summary.png)
- [Scenario B screening summary](evidence/production-c2-scenario-b.png)
- [Different community recommendations](evidence/production-c2-personalised-communities.png)
- [Actual production model inference](evidence/production-ml-build-fix.png)
- [Structured verification record](evidence/production-c2-full-flow-verification.json)

No changes were committed or pushed during this verification. This report and the JSON evidence record the state at verification time, before the user's subsequent push approval.
