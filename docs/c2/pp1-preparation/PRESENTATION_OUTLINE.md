# C2 presentation outline and speaking notes

D. G. A. Indeepa · IT23273412 · J26-IT-345 · PP1, 22 October 2026

Use this as the C2 segment inside the team presentation. Do not repeat the team's title, entire platform architecture or every other component. Time is unconfirmed; keep the core story and expand with backup material when time permits. Bracketed status notes describe preparation, not text to read aloud.

## 1. Student problem and C2 contribution

**On the slide**

- Student check-in → understandable summary → chosen support action.
- Complete PHQ-9/GAD-7 screening and optional English text analysis.
- Personalized follow-ups, activities and professional topic matching.

**Say**

“The practical problem is the gap between recognizing a concern and finding a manageable next step. My C2 component connects screening, a student description, follow-up questions and support choices within UniCare Connect. This implementation demonstrates that workflow. Whether it improves engagement or clinical outcomes still needs evaluation.”

**Research boundary to say explicitly**

“The proposal's main experiment asks whether optional facial information adds value beyond questionnaire and text inputs. The text branch and workflow are implemented; the facial and fusion comparison is not yet complete.”

Do not claim a worldwide first, national prevalence, proven improved wellbeing or validated diagnosis without supporting evidence.

## 2. How the current system makes decisions

**On the slide**

| Input | Processing | Output |
| --- | --- | --- |
| PHQ-9 / GAD-7 answers | Fixed questionnaire scoring | Symptom scores and ranges |
| Optional English narrative | Fine-tuned DistilBERT, 15 labels | Support-topic suggestions |
| Confirmed topics + earlier answers | Explicit branching rules | 5–9 questions from a 270-question bank |
| Topics + recorded professional metadata | Preference filters and weighted overlap | Ordered support profiles; student chooses |

**Say**

“There are different kinds of decisions. Questionnaire scores are arithmetic. DistilBERT classifies the wording into multiple possible support topics. The student reviews those suggestions. The question router and professional matcher are transparent application rules informed by those topics. The model does not diagnose a disorder or predict a professional's identity.”

Point to [browser inference](../../../src/lib/c2/concern-runtime.ts), [routing](../../../src/lib/c2/concern-routing.ts) and [matching](../../../src/lib/c2/support.ts) if asked for code.

The wellness plan also reuses saved topic scores and follow-up answers to rank prepared activities. Show its source labels, explanation, first suggested action and replacement/restore controls. [Planning details](../PP1_ML_INFORMED_PLAN.md).

## 3. Data, preprocessing and actual fine-tuning

**On the slide**

- 3,000 synthetic narratives: 1,800 train / 600 development / 600 test.
- Split wording families before composition; preserve negation.
- WordPiece tokenizer; maximum 128 tokens; dynamic padding.
- Pretrained DistilBERT; new 15-output head.
- Frozen embeddings + first four blocks; last two blocks + head trained.
- AdamW: backbone LR 5e-5; head LR 1e-3; batch 16; four epochs.

**Say**

“There are no real student records in this training dataset. The generator produces narratives containing different combinations of support topics. Wording families are separated between partitions to reduce direct template leakage. DistilBERT converts the text to subword tokens. I used transfer learning rather than pretraining a language model from scratch. The last two transformer blocks and the new classification head were fine-tuned, totaling 14,777,871 trainable parameters.”

**Augmentation sentence**

“V2 includes synthetic wording variation and multi-topic composition. It did not run token masking or a controlled augmentation-benefit experiment. Earlier experiment results are reported separately.”

**Backup settings**

Weight decay .01; gradient clip 1.0; 10% warmup followed by linear learning-rate decay; BCEWithLogitsLoss; independent sigmoid outputs; development-selected shared threshold .25. V2 reused v1's development-selected learning rate rather than conducting a new learning-rate sweep.

## 4. Results and limitations

**On the slide**

| Held-out synthetic measure | DistilBERT v2 | Same-data TF-IDF + logistic |
| --- | ---: | ---: |
| Micro precision | .7188 | .4846 |
| Micro recall | .8874 | .3607 |
| Micro-F1 | .7942 | .4136 |
| Macro-F1 | .7974 | .3944 |
| Exact label-set accuracy | .4017 | .1333 |

Include the current training/validation curves from `/wellness/research`. Label the data synthetic on the slide. Use current v2 evidence, not an old five-topic chart.

**Say**

“On 600 held-out synthetic examples the model achieved micro-F1 of .7942, compared with .4136 for the same-data classical baseline. Exact match is stricter: every topic must be correct for the entire example. It was .4017. These are support-topic label results, not disease-diagnosis accuracy.”

**Explain the curves**

“Final train loss was .00630 and validation loss .24748. Training exact-match accuracy at threshold .5 was 99.5%, while validation exact match was 28.8%. That gap indicates substantial generalization concern. The curve threshold is .5; the final reported test results use the development-selected .25 threshold.”

**One error to acknowledge**

An earlier invented browser example about a brother's death, loneliness and self-criticism suggested self-esteem but missed grief and connection. The student-correction option matters because unfamiliar wording can be missed. Do not silently replace this recorded error with a claim that every natural sentence is understood.

## 5. Website demonstration

**On the slide**

“Check-in → confirm topics → adaptive questions → summary and activity → professional preferences.”

Use [DEMO_SCRIPT.md](DEMO_SCRIPT.md). Prepare the questionnaire inputs before the talk if the slot is short; tell the audience they are invented walkthrough inputs. Run a real model prediction rather than presenting an animation as inference.

Show one case in the core presentation. Keep the second case and answer-change comparison ready for Q&A. If prediction differs, show the result and correction honestly. Do not promise exact professional order unless using the same confirmed topics, preferences and current catalog.

## 6. Progress, requirements and remaining research

**On the slide**

| Implemented at PP1 | Remaining work |
| --- | --- |
| Screening and explainable support summaries | Professional review of authored content |
| Fine-tuned/exported text model | Optional facial feature/quality pipeline |
| Adaptive questions, plan and activities | Matched fusion comparisons and independent counselor labels |
| Preference matching and appointment preparation | Assigned-counselor access and complete referral integrity |
| Optional local progress and software tests | Approved participant evaluation, SUS and language review |

**Say**

“This is implemented foundation work toward the proposal. I am not claiming the multimodal hypothesis or clinical effectiveness has been established. The next research milestone is scope-confirmed branch/fusion development with appropriate reference labels and professional involvement.”

For the project plan, use actual approved work-package statuses. Do not invent a completion percentage. The detailed [requirements/risk review](../PP1_READINESS_REVIEW_2026-10-20.md) maps O1–O6 and FR01–FR10.

**Risk examples**

- Synthetic generalization: independent review and additional controlled evaluation.
- Large model startup: actual-laptop check, manual-topic fallback and measured cold/warm times.
- Late data/professional input: report synthetic feasibility results while keeping research claims limited.
- Booking integrity/privacy: server validation, duplicate protection and authorized sharing before expanding the clinical workflow.

## 7. User value and business feasibility

**On the slide**

- Buyer: university student-welfare/service management.
- Users: students and authorized support staff.
- Proposed benefit: a clearer path from check-in to available support.
- Proposed revenue: institutional license plus setup/support.
- Pilot measures: task completion, failed handoffs, staff time and support cost.

**Say**

“The proposed customer is a university with a functioning support service. We would test whether the workflow is usable and manageable for staff before making commercial claims. Costs include hosting, content review, maintenance and professional support. Prices, demand and clinical outcomes are not yet validated.”

## Backup material for questions

Keep available, rather than crowding the core slides:

1. All fine-tuning parameters, dataset splits, tokenizer behavior and trained-layer code.
2. Per-topic metrics, binary confusion matrices, exact/label-wise accuracy and the failure case.
3. Model/rules distinction, question budget, preference filters and synthetic-profile booking guard.
4. Requirements traceability, permissions, scope changes and the next evaluation protocol.

## Replacement C2 text for the old shared progress deck

**For the overall progress table**

“C2: student check-in and support workflow implemented locally. Fine-tuned 15-topic DistilBERT, 270-question adaptive bank, plans/activities, progress and professional matching. Synthetic evaluation and 289 C2 tests recorded. Current changes await push approval; no production deployment claim.”

**For C2 remaining work**

“Professional review and approved data/participant work; optional facial-quality pipeline and fusion comparison; independent counselor labels; assigned access and referral integrity; performance, accessibility and language evaluation.”

The shared deck's other components and old checklist claims require their owners' confirmation. Do not change those statuses based on C2 progress.
