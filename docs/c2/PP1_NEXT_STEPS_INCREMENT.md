# C2 personal plans and progress increment

Implemented locally on 20 October 2026 for Member 02, IT23273412. This increment connects the existing assessment to useful follow-through; it does not retrain or replace DistilBERT.

## Student workflow

Complete a check-in, review DistilBERT topics, answer adaptive context questions, then choose **Build my wellness plan**. The three plan slots use confirmed topics and explicit context answers. For example, asking for help planning study workload selects the workload-planning activity; a sleep topic selects the evening-routine activity. Students can replace any suggestion and access professional/community support at any time. A plan is also available without assessment or model inference.

Seven original, source-linked guided activities cover starting tasks, workload planning, worries, evening routines, connection, manageable activities and a brief pause. Each has three optional writing steps, back navigation, a review and optional before/after manageability ratings. Completion records contain only an identifier, activity name/ID, timestamp and optional ratings. Activity writing is never included in progress records. The prompts are informed by NHS/WHO guidance and await professional review; no treatment benefit or clinical validation is claimed.

**Progress** is an opt-in, browser-only history. Opening it requires acknowledgement that anyone using the browser profile can access saved entries. It saves only the mood rating, selected screening summary or activity completion that the student explicitly chooses. It is not an account vault or cross-device sync. History remains after refresh, sign-out or clearing the page session. Students can close the view, delete individual entries or delete all saved wellness history. Other browser storage keys are untouched. Storage failures show an error rather than claiming a save succeeded. Schema validation rejects invalid records; allowlisted reconstruction excludes arbitrary notes and raw answers. Up to 100 stored records and 14 recent mood points are displayed, with no fabricated history.

**Prepare my appointment** provides editable notes, optional score/topic inclusion and individual follow-up inclusion. All assessment fields are unchecked initially. The exact download preview determines the plain-text file contents. It sends no request to a professional, booking endpoint, AI provider or shared database. Downloaded files remain on the device until the student deletes them. Booking and fictional matching-profile restrictions are unchanged.

## Privacy and model boundaries

- Individual assessment responses, narrative text, reflections, chat, activity notes and appointment drafts remain in temporary page state. Navigating workspace tabs preserves drafts; refresh or **Clear my session** clears them.
- Selected device-history records and user-downloaded files are the explicit exceptions to session-only behavior. Header, About/privacy, chat explanations and clear-session feedback describe this distinction.
- DistilBERT still predicts the five concern topics. The plan maps confirmed/reported topics and context to authored activities through explicit rules. It is not a newly trained treatment recommender, diagnostic model or generative therapist.
- PHQ-9/GAD-7 wording, scoring and two-week recall remain unchanged. Missing screening totals stay missing. Mood and activity ratings are separate self-reports and do not establish clinical improvement.
- The existing PHQ safety route is retained. A limited phrase check in activity and appointment drafts also reveals the existing immediate-support panel. No monitoring or emergency-contact capability is added.
- Optional facial features, fusion comparisons, independent counselor labels and assigned-counselor confidential access remain incomplete proposal objectives.

## PP1 walkthrough

1. Use clearly identified synthetic software-demo answers and an English situation description. Click **Suggest topics**, confirm/correct suggestions and answer the follow-ups.
2. Show that the plan explains a concrete earlier answer. Compare a workload scenario with a sleep scenario rather than claiming universal clinical relevance.
3. Replace an action; open an activity; write an example; go back to confirm it is retained; finish and show its completion state.
4. Open **Progress**, acknowledge device storage and explicitly save a sample mood, screening summary and completion. Refresh: session drafts clear and history stays closed until opened. Reopen to verify selected records survive. Delete software-test records afterwards.
5. Before refreshing an assessment, open **Prepare my appointment**. Confirm the empty initial preview, select only wanted fields, add/edit a question and download the exact plain-text summary. No booking or message is sent.
6. Show **Research & ML** separately for the existing actual training, validation, test and failure evidence. The trained-model ZIP has not changed for this UI increment; another laptop needs the latest source code and the already-prepared trained assets.

Browser evidence uses invented software-test values, not student health records: [plan](evidence/personalised-wellness-plan.png), [progress](evidence/device-progress-history.png), [appointment preview](evidence/appointment-notes-preview.png). The browser test started with no saved device history, and all four software-test records were removed after persistence/deletion verification. The exact download is additionally checked against the preview in component tests.

## Sources and implementation

Verification: TypeScript and lint checks passed; the full Jest regression run passed 774 tests across 42 suites. The [verification record](evidence/wellness-next-steps-verification.json) distinguishes browser checks from automated checks and records the limits of this local software demonstration.

Activity principles: [NHS activity planning](https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/self-help-cbt-techniques/tackling-your-to-do-list/), [NHS worries guidance](https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/self-help-cbt-techniques/tackling-your-worries/), [NHS sleep routines](https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/how-to-fall-asleep-faster-and-sleep-better/), [WHO stress-management guide](https://www.who.int/publications/i/item/9789240003927). UniCare's original prompts are not a reproduction of those providers' validated products.

Plan/activity definitions and routing: `src/lib/c2/wellness-plan.ts`. Allowlisted history schema/storage: `src/lib/c2/progress.ts`. Student interfaces: `src/components/c2/wellness-plan.tsx`, `wellness-activity.tsx`, `wellness-progress.tsx`, `appointment-summary.tsx`. Workspace and assessment link the views together. Tests exercise topic/context routing, optional storage, incomplete scores, invalid data, limits, activity navigation, safety presentation, exact export selection, draft clearing and persisted-record survival.

AI assistance was used for implementation, wording, source research, testing and documentation. The student should review the prompts, understand the rules and storage boundaries, and disclose assistance under the institution's requirements.
