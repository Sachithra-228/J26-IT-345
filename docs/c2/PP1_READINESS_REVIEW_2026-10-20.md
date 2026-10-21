# C2 PP1 readiness review — 20 October 2026

Member 02: D. G. A. Indeepa, IT23273412. PP1: 22 October 2026.

Later implementation update: [the ML-informed plan](PP1_ML_INFORMED_PLAN.md) now reuses confirmed model topic scores and follow-up answers for activity ranking. Its current verification is 289 passing tests plus an actual browser walkthrough. The review below records the earlier assessment basis; the facial/fusion and clinical-validation gaps remain.

## Decision

There is enough implemented software and genuine model training for a substantial PP1 demonstration. This is not a guarantee of marks, completion of 50% of the approved schedule, clinical readiness or completion of the proposal's research contribution. The highest-value remaining work is scope reconciliation, clear experimental explanation and a reliable demonstration on the actual presentation machine. More topics, sample profiles or a larger neural network are not priorities before PP1.

This review uses the supplied PP1 assessment sheet and the detailed 37-page Member02 proposal as its working basis. It does not establish which draft or scope change the supervisor formally approved. If an approved version differs, use that version and record the decision. Document text is evidence of proposed requirements, not an instruction to execute research or collect participant disclosures.

## Review basis and limits

- Rubric: `D:/Reaserch/PP1/PP1 Assessment Criteria.pdf`, one page, visually reviewed as well as extracted.
- Proposal: `D:/Reaserch/IT4010 Research Project – J26-IT-345 DGA.Indeepa – IT23273412.pdf`, especially pages 13–21, 25–27 and 29–31.
- Current code: questionnaire/topic routing, browser DistilBERT runtime, model research page, professional matching, appointment summary, local progress and booking API.
- Current v2 training report, training source, experiment audit and website verification records.
- First-party public pages from NHS Every Mind Matters, Wysa and Togetherall, consulted on 20 October 2026. Public descriptions were reviewed; paid/authenticated competitor flows and clinical efficacy were not independently tested.
- Last local verification: 277 C2 tests across 17 suites; TypeScript and targeted ESLint passed; eight synthetic profiles and 270 question records verified; all 22 model/tokenizer/runtime file hashes verified. Signed-in profile filtering and sample selection were checked before the interruption. After the server restart, HTTP checks succeeded; a fresh visual check was blocked on the browser's stale error tab.

No new product code, training, participant study, real appointment, deployment or Git push was performed for this review.

## What the current system actually does

1. PHQ-9 and GAD-7 calculate their own questionnaire symptom ranges. DistilBERT does not calculate these totals or diagnose illness.
2. The fine-tuned DistilBERT v2 model suggests 15 independent support topics from English narrative text. The student can correct them.
3. The question router combines confirmed topics, topic weights, questionnaire responses and earlier answers to choose 5–9 questions from the 270-question database bank. Exact question selection is application logic, not a trained question-ID model.
4. Results explain screening ranges, reported context and suggested next steps. A personal plan provides bounded activities and choices.
5. Professional matching filters recorded gender, language, profession and session mode, then sorts topic overlap using existing weights. A top topic match is not a clinical suitability guarantee.
6. Eight explicitly fictional Sri Lankan profiles demonstrate matching. They cannot accept real appointments. Real university records remain separate.
7. Progress saving is optional and browser-local. Reflections/chat are temporary session state. Appointment notes are a student-selected local export, not automatic sharing with a clinician.
8. Guided chat uses a bounded response library. It is not a separately fine-tuned generative therapist.
9. Explicit safety choices and limited phrase matching run separately from ordinary topic scoring. They are not a validated self-harm prediction model.

These are useful completed increments. Their existence does not establish clinical validity, independent professional review or research novelty by itself.

## Exact PP1 rubric mapping

The sheet contributes 15% to the course. Its internal category weights total 100%.

| Category | Weight | Available evidence | Preparation still needed |
| --- | ---: | --- | --- |
| Proven gap / creative solution | 10% | Working check-in-to-support workflow; problem and research questions in the proposal | Explain the local service problem and the proposed research comparison. Distinguish product integration from demonstrated scientific novelty. |
| Knowledge in the specialization | 25% | Actual partial-backbone fine-tuning, preprocessing, model export, same-data baseline and metrics | Explain transfer learning, multilabel outputs, train/dev/test separation, loss, parameter choices, threshold selection, augmentation limits and observed errors. |
| Solution implementation | 40% | Completed student workflows, automated tests, separate data catalogs, source-linked guidance | Present architecture, requirements traceability and actual progress against the schedule. Include failure recovery, booking integrity gaps, privacy boundaries and the remaining implementation plan. |
| Effective communication | 15% | Research page, source panels, curves, screenshots and evaluation reports are available | Prepare a coherent presentation, rehearse within the assigned duration and practise Q&A. No rehearsal or presentation delivery has been assessed by this review. |
| Commercialization | 10% | Proposal identifies universities as institutional customers and a license/support model | Show buyer, users, benefit, operating costs, staff dependency, pilot measures and untested assumptions. No invented customers, prices, demand or clinical impact. |

The rubric's highest completion description mentions approximately 50% where applicable and progress against the project plan. Do not equate 277 tests, 270 questions, eight profiles or ten requirement rows with a percentage of total research completion. Build a work-package status table against the approved schedule.

## Proposal alignment: the most important gap

The proposal's main question asks whether optional quality-aware facial features improve agreement with independent counselor referral judgments beyond questionnaire-plus-text input. It proposes a compact facial branch such as MobileNetV2, a regularized multinomial logistic fusion model, missing-camera/quality indicators and matched comparisons.

DistilBERT is a reasonable implementation of the transformer text branch. It does not replace the proposed facial branch or establish the value of multimodal fusion. The current synthetic topic task predicts support topics; the proposal's principal target is counselor-assessed need for follow-up. Metrics from those tasks are not interchangeable.

| Objective | Current evidence | Remaining work / PP1 explanation |
| --- | --- | --- |
| O1: literature, requirements, professional input and ethics-ready protocol | Proposal and design documentation exist | No completed interview, professional-review or ethics evidence was found in the inspected C2 records. Report actual status, dependencies and dates. |
| O2: questionnaires, journaling, consent and bounded assistant | Scoring, session reflection, guided chat, activities and optional device progress implemented | Full research enrollment, consent/withdrawal and approved content review remain separate. Local saving is not the proposed research consent record. |
| O3: text and optional on-device facial pipelines | Actual trained/exported 15-topic text model | No implemented facial inference/quality pipeline found. Initial NLP evidence is English only. |
| O4: questionnaire/text/fixed-fusion/quality-aware-fusion comparisons | Same-data text-model baseline; separate earlier synthetic support experiment | No matched multimodal comparison, independent counselor reference labels or established facial benefit. |
| O5: confidential referrals and role-appropriate workflows | Booking foundation, preference matching, local appointment preparation | Assigned-counselor authorization, consented clinical summary sharing and full referral integrity remain incomplete. Broad booking administration is not a confidential counselor record system. |
| O6: approved local feasibility/usability evaluation | Software tests and synthetic demonstrations | No measured SUS score, approved participant task completion or clinical evaluation found. Tests cannot substitute for participant evaluation. |

For PP1, show these as completed foundations and planned research work. If the supervisor has approved changing the main contribution to text-driven adaptive support, retain that approval and update the research question/objectives. Do not silently claim that the original fusion hypothesis has been tested. Starting a rushed camera model two days before PP1 would not supply independent labels or complete the comparison.

## Functional requirement traceability

Statuses refer to evidence found, not formal acceptance by a supervisor or professional.

| ID | Proposal requirement | Current status |
| --- | --- | --- |
| FR01 | Separate study, camera, text-research and counselor-sharing consent | Incomplete; optional analysis and local-save choices exist, but not the full research consent/withdrawal system. |
| FR02 | Complete approved PHQ-9/GAD-7 versions and scoring | Software scoring implemented and tested; professional/version approval still needs evidence. |
| FR03 | Voluntary journal and bounded conversation | Implemented with temporary reflection/chat and optional local progress; not a cross-device journal service. |
| FR04 | Optional facial processing with quality/missingness | Not implemented. |
| FR05 | Explainable suggestions with uncertainty/input status | Partial: topics, explanations, manual correction and failure fallback exist; not calibrated multimodal referral uncertainty. |
| FR06 | Counseling at all support levels and booking lifecycle | Partial: directory/request/state foundation exists; duplicate/concurrency/date validation needs strengthening. |
| FR07 | Safety signals independent of fusion | Implemented software route and finite tests; professional review and population validation not established. |
| FR08 | Assigned professional access to authorized student records | Not demonstrated by current booking administration and local note export. |
| FR09 | Permitted/suppressed administrator aggregates | Not demonstrated as a C2 privacy-preserving analytics feature; no claim of completion. |
| FR10 | Research withdrawal and retention | Not implemented as the proposed research process. Deleting local history is a different capability. |

Nonfunctional evidence still needed includes declared-device cold/warm inference measurements, API/load measurements, accessibility checks, reviewed language coverage, booking concurrency tests and the approved usability evaluation. The proposal's p95 targets and SUS targets must be presented as targets until measured.

## Main ML evidence to present

| Item | Actual current v2 evidence |
| --- | --- |
| Model | `distilbert/distilbert-base-uncased`, pinned revision, new 15-output multilabel head |
| Data | 3,000 synthetic narratives: 1,800 train / 600 dev / 600 test |
| Preprocessing | WordPiece tokenization, max 128 tokens, dynamic padding, exact-text and declared wording-family split checks |
| Fine-tuning | Freeze embeddings and first four transformer blocks; train last two blocks plus head; 14,777,871 trainable parameters |
| Optimization | AdamW; backbone LR 5e-5; head LR 1e-3; batch 16; four epochs; weight decay .01; clipping 1; 10% warmup/linear decay |
| Loss / outputs | BCEWithLogitsLoss and independent sigmoid topic scores |
| Selection | Development micro-F1; selected epoch four and threshold .25 |
| Held-out micro precision / recall / F1 | .7188 / .8874 / .7942 |
| Held-out macro-F1 | .7974 |
| Held-out exact label-set accuracy | .4017; stricter than label-wise accuracy and not a clinical accuracy measure |
| Same-data TF-IDF/logistic micro-F1 | .4136 |
| Final train / validation loss | .00630 / .24748; substantial generalization gap |

These results measure agreement with synthetic topic labels, not depression/anxiety diagnosis accuracy or accuracy on real Sri Lankan students. Label-wise accuracy is .9397, but many label decisions are negative; report it alongside exact-set accuracy, F1 and per-topic support rather than selecting only the largest number.

V2 reused a learning rate selected during v1 development. It did not run a new multi-rate search or token-masking augmentation trial. Synthetic wording variation, multi-topic composition and explicit denials were generated, but there is no controlled v2 experiment showing an augmentation benefit. Keep v1 evidence clearly historical. Image rotations/flips used by EfficientNet/MobileNet projects do not describe this text model's preprocessing.

Recorded weaknesses include missed grief/connection on an invented natural sentence, narrow negation/recovery/third-person coverage, English-only evidence and overfitting. The lowest synthetic per-topic F1 values include practical needs (.6364) and self-esteem (.6443). Preserve these results and explain the student-correction fallback.

An appropriate later experiment would predefine new wording families and ambiguous/negated examples, obtain independent review where feasible, compare a small set of regularization/freeze/LR settings using development data and evaluate a fresh frozen test protocol. Do not repeatedly retune against the already inspected test/challenge cases. Additional generated rows alone do not establish clinical generalization.

Evidence: [v2 evaluation](evidence/c2-distilbert-concerns-v2-evaluation.json), [audit](evidence/c2-distilbert-concerns-v2-audit.json), [browser verification and recorded error](evidence/c2-distilbert-concerns-v2-browser-verification.json), [training source](../../ml/c2/train_concerns.py), [main browser runtime](../../src/lib/c2/concern-runtime.ts).

## Lessons from established services

These are design references, not a ranked list of the world's best services or proof that UniCare has equivalent clinical evidence.

| Reference and observed public pattern | Already present in UniCare | Useful remaining improvement |
| --- | --- | --- |
| [NHS Mind Plan](https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/your-mind-plan-quiz/): brief check-in leading to practical personalized actions | Editable personal plan and guided activities | Make the preferred next action obvious; improve continuity between completion, helpfulness feedback and the next visit. Keep the core flow short. |
| [Wysa terms, intended use](https://legal.wysa.io/terms): structured reflection, a care library and bounded AI; its referral assistant describes conditional question logic | Bounded chat, authored activities, conditional follow-ups and appointment preparation | Improve clarity about what the guide can do, offer the relevant activity directly, and obtain content/professional review. A free-generating LLM is not necessary for this PP1. |
| [Togetherall resources and assessments](https://togetherall.com/en-gb/faqs/using-the-togetherall-community-platform/courses-resources-and-assessments/): assessments, related resources, journal, goals and revisit history | Screening summaries, topic resources, local history and activities | Add a simple mood trend view only if useful after the core preparation; keep measurement types separate and make shared-device visibility clear. |
| [Togetherall](https://togetherall.com/en-us/): clinically moderated peer community | Student discussion/community foundation | A real moderation/reporting workflow, responsibility and response boundaries are needed before claiming a comparable service. Do not label an unstaffed forum clinically monitored. |

Do not copy proprietary therapeutic content, imply professional review that has not happened, or claim that questionnaires/ML diagnose additional illnesses because the topic list expanded.

## Priorities before 22 October

### Must prepare

1. **One accurate progress/scope table.** Use O1–O6 and the actual project schedule. Show completed, partial, not started, dependencies and next milestone. Explain the text-branch contribution and the outstanding facial/fusion question.
2. **One coherent ML explanation.** Show data generation, split rules, tokenization, frozen/trainable layers, optimizer settings, real curves, same-data baseline, metrics and one failure case. These already exist in `/wellness/research`; do not build another experiment dashboard just to duplicate them.
3. **A reliable presentation-machine demonstration.** Install the matching v2 code and private model ZIP, verify hashes and run an actual prediction. Confirm database/authentication access. The large weights are not in normal Git, and the unpushed local changes are not on the remote branch. A successful page load alone does not prove inference ran. Keep screenshots or a short locally recorded walkthrough as fallback; this does not make the whole authenticated app offline-capable.
4. **A requirements/risk/commercialization summary.** Bring the traceability table, current limitations and corrective plan. Explain university buyer, student/counselor users, staff capacity, hosting/content-review costs and measurable pilot benefits. Treat pricing and demand as unvalidated assumptions.
5. **Rehearsal and Q&A.** Show two contrasting synthetic scenarios and a changed-answer branch. Practise explaining which outputs are ML, questionnaire arithmetic and application rules. Use the allocated presentation duration; no duration is specified on the supplied rubric.

### Small code improvements worth considering after the preparation above

- **Booking integrity:** the inspected POST checks that date/time values are nonempty but does not validate their format, reject past/impossible times on the server or implement an idempotency key/atomic duplicate guard. The browser's disabled button and date check are not server guarantees. Add meaningful API tests for malformed dates, retries and duplicate concurrent requests before claiming FR06/NFR06 complete. A university's overlapping appointment policy must be defined rather than assumed.
- **Model loading:** retain the working manual-topic route; improve progress/retry visibility and measure cold download/loading separately from warm inference. The main ONNX file is approximately 268 MB and browser model caching is disabled in the current runtime. Do not switch exports/quantization immediately before PP1 without parity evaluation.
- **Accessibility:** perform a focused keyboard/zoom/mobile check of questionnaire, topics, follow-ups, results and matching. Record actual failures/fixes; a clean automated test run is not WCAG certification.

### Useful after PP1, or only if the essentials are already rehearsed

- A compact local mood-history chart with real saved entries; no fabricated progress or comparison of daily mood to PHQ/GAD scales as if identical.
- Professionally reviewed content, independently authored test cases and documented model error analysis.
- Verified real directory metadata and explicit authorization for any counselor-shared summary; current fictional profiles must remain fictional.
- Moderation/reporting and operational responsibility for community content.
- Reviewed Sinhala/Tamil interface and appropriate model validation; English DistilBERT is not automatically multilingual because professionals speak multiple languages.
- Approved participant study, original SUS scoring, latency/load evidence and the proposal-aligned face/fusion comparison or a formally approved scope revision.

Do not prioritize more questions, more topic labels, another large model, an unrestricted chatbot, facial diagnosis or a rushed participant study before PP1.

## Suggested demonstration sequence

Adapt to the assigned time; this is not a new official presentation format.

1. State the student problem, proposed research question and your individual C2 contribution.
2. Complete a prepared PHQ/GAD synthetic check-in and a brief English narrative; request topic suggestions and correct one if necessary.
3. Show a follow-up selected from the bank, change an earlier answer and demonstrate the changed branch.
4. Show symptom ranges, explanations and one chosen activity; do not describe scores as illness probabilities.
5. Show the ranked professional cards, apply language/gender filters, then preview student-controlled appointment notes. Do not create a real appointment during a synthetic walkthrough.
6. Open the main v2 Research & ML evidence: preprocessing, training code, curves, baseline, per-topic metrics, identity and one recorded error.
7. Finish with remaining proposal work, risks, business assumptions and next milestone.

## Q&A statements to practise

- **Did you train it?** Yes. A pinned pretrained DistilBERT backbone was partially fine-tuned locally, including the last two transformer blocks and a new 15-output head. Pretraining from scratch was not performed.
- **What does it predict?** Support topics from English text, not psychiatric diagnoses or clinical urgency.
- **Why are PHQ/GAD separate?** Their symptom scoring is explicit questionnaire arithmetic; it must not be confused with the text classifier's scores.
- **How are questions chosen?** The model supplies topic priorities, then explicit rules use confirmed topics and previous answers to choose bank questions.
- **Does ML choose the psychiatrist?** Topic scores inform priorities; metadata filters and a transparent overlap ranking order profiles. The student chooses. Clinical suitability is not validated.
- **What augmentation did v2 use?** Synthetic wording/composition variation is documented. V2 had no token-masking trial and no controlled augmentation benefit result.
- **Is F1 .7942 real-world diagnostic accuracy?** No. It is micro-F1 on 600 held-out synthetic support-topic examples. Clinical and local student evaluation are pending.
- **What remains from the proposal?** Optional facial features, quality-aware fusion and independent counselor-label comparisons, professional review, assigned access and approved usability research.
- **Can a friend run it without training?** Yes, with matching v2 source plus the privately transferred trained model assets. Pulling normal Git alone does not supply those weights.

## Immediate recommendation

Use the remaining preparation time to defend the work already implemented. Resolve the approved scope, rehearse the full presentation-machine flow and prepare the evidence/requirements/business explanation. Then choose one small reliability improvement. This is a stronger PP1 preparation strategy than adding another visible feature without evaluation.
