# C2 questionnaire and support increment — 19 October 2026

Owner: D. G. A. Indeepa, IT23273412. Implemented with AI assistance, following the user's requested journey. This increment replaces fictional-student prompts with normal service wording while preserving truthful screening, privacy and availability information. It does not establish clinical readiness or completion of the full research proposal.

## Working journey

Overview -> introduction/privacy -> complete PHQ-9 -> complete GAD-7 -> relevant optional context questions -> separate screening scores -> professional or community choices. Support chat and reflections can also be used without completing a check-in. Drafts survive view changes and are cleared on refresh, leaving the workspace or explicit Clear my session.

The complete English item sets, four frequency responses and two-week recall are retained. PHQ-9 is scored 0–27 with bands 0–4, 5–9, 10–14, 15–19 and 20–27. GAD-7 is scored 0–21 with bands 0–4, 5–9, 10–14 and 15–21. An unanswered item prevents a total and band for its scale; it is never assumed zero. No disease is diagnosed. Both symptom dimensions can be elevated together.

PHQ-9 question 9 has an independent support path. A positive response displays human-support information immediately and asks about the person's ability to stay safe. The result is not gated by a total, a facial expression, an emotion score or the answer to that additional question. The service does not claim to detect every concerning disclosure, quantify safety or arrange emergency help. A limited precautionary English phrase check offers the same pathway in reflection and chat. Its scenario checks are not evidence of clinical sensitivity.

## Question bank and chat

`src/lib/c2/assessment.ts` contains the fixed context bank:

| ID | Selection | Purpose |
| --- | --- | --- |
| impact | Any nonzero core response | Standard unscored daily-function context |
| sleep | PHQ-9 sleep item nonzero | Preferred sleep discussion topic |
| worry | Any of the first four GAD-7 items nonzero | Relevant area of worry |
| mood | Either first two PHQ-9 items nonzero | Context around low mood / interest |
| duration | Always offered | Optional duration context |
| goal | Always offered | User's preferred support action |

All can be skipped. None contributes to either questionnaire score or a new diagnostic score. Custom wording, thresholds for support suggestions and the additional bank have not received professional review. The result reports this limitation in About & privacy; the context flow also identifies the additional bank's review status.

`src/lib/c2/assistant.ts` selects guided replies about privacy, screening interpretation, professional contact, sleep, connection, worry, mood and study pressure. The interface explicitly describes its limited library, unknown-message fallback and absence of a generative chat service. It does not claim to be a therapist. Messages remain local, are not logged to the server and are not used for training. A generative assistant remains a future integration requiring a configured provider and evaluated data handling and behavior.

## Professional and community services

Actual directory profiles can record gender, professional type, confirmed languages and support areas. Existing admin creation fields and the API accept and validate these optional details. Legacy profiles remain usable without fabricated metadata. Specific filters exclude missing details; names/titles are not used to infer them. Topic matches show reasons and do not exclude alternative choices. These are transparent software matching rules, not a trained or clinically validated assignment model.

The existing booking API receives only the chosen profile ID, preferred date/time and an explicitly written note. No questionnaire answers, totals, text features, reflection or conversation are transmitted. Booking notes retain the shared service's existing administration/faculty access; the UI explains that access. This does not implement the proposal's assigned-counselor confidentiality requirement. No live booking or provider was created during verification.

Community suggestions are topic filters over actual forum posts, not invented therapy groups. No membership, moderation or professional facilitation is falsely claimed. Public post visibility and the limits of displayed anonymity are explained. No assessment is attached to a post. No live post was submitted during verification.

## Verification

| Check | Result |
| --- | --- |
| Full Jest regression | 28 suites / 612 tests passed |
| C2 suite (included above) | 6 suites / 89 tests passed |
| TypeScript | Passed |
| ESLint | Passed; existing warnings outside C2 remain |
| Real-browser complete flow | PHQ-9 11/27, GAD-7 7/21 for explicit software-check inputs; six relevant context questions; correct separate bands and support pathway |
| Directory browser | Existing authenticated service loaded; female filter produced an honest no-match state where metadata was absent |
| Chat browser | Topic -> bounded response -> source link |
| Mobile browser | 390 x 844 check-in, selectable radios, no horizontal document overflow; desktop viewport restored |
| Integrated dashboard | Updated Wellness section rendered under the existing signed-in student dashboard |

The unit/component/API tests cover score boundaries, malformed vectors including sparse arrays, missingness, item-9 independence, back navigation, conditional bank selection, skipping a previously answered final follow-up, provider metadata validation and staff-only creation, unknown metadata filters, appointment payload isolation, forum filtering, draft preservation, opt-in inference, failed inference, clearing pending work and local chat.

Before publishing the C2 branch, the latest remote C2 and main histories were integrated without conflicts. The subsequent regression passed **30 suites / 639 tests**, including the same **89 C2 tests**; TypeScript and lint also passed, with existing lint warnings outside C2. See [branch verification](../evidence/branch-verification.json) for the tested revision and upstream references. The 612-test figure above records the earlier assessment-increment run, before those shared C3 updates.

Versioned evidence: [software verification](../evidence/software-verification.json), [screening summary screenshot](../evidence/screening-summary.png) and [mobile questionnaire screenshot](../evidence/questionnaire-mobile.png). Full local regression output is retained at `D:/NewReaserch/research_review/c2-assessment-regression-results.json`; additional captures are in that folder. These captures use software-check inputs, not participant evidence. No production deployment or clinical validation was performed. The browser check does not certify accessibility or full multilingual/dark-mode coverage. Development hot reload briefly reported a missing reflection source during its replacement; the source was recreated and the subsequent model run and dashboard rendering succeeded.

## Sources and boundaries

- [PHQ / GAD-7 instruction manual](https://www.phqscreeners.com/images/sites/g/files/g10016261/f/201412/instructions.pdf): scoring, additional clinical assessment and public-domain reproduction permission. Developed by Robert L. Spitzer, Janet B. W. Williams, Kurt Kroenke and colleagues, with an educational grant from Pfizer Inc.
- [PHQ-9 item reference](https://www.hiv.uw.edu/page/mental-health-screening/phq-9) and [GAD-7 item reference](https://www.hiv.uw.edu/page/mental-health-screening/gad-7), University of Washington National HIV Curriculum. Screening band policy follows the instrument manual and detailed proposal; no independent local validation is claimed.
- [WHO Doing What Matters in Times of Stress](https://www.who.int/publications/i/item/9789240003927): general coping resource, not professional endorsement of the custom chat library.

Public GoEmotions text training and its metrics are unchanged; see the [model card](../model-card.md). Synthetic fusion, optional facial features, professional review, assigned-counselor access and an approved local study remain pending. A polished service interface must not be presented as evidence that those research tasks are complete.
