# C2 first increment: 19 October 2026

Historical record of the first text-model increment. The interface and implementation status below are superseded by the [assessment increment](assessment-increment.md), also completed on 19 October. The earlier training metrics remain unchanged.

Owner: D. G. A. Indeepa, IT23273412. Prepared with AI assistance; student review and personal contribution recording are still required.

## Implemented

- Fresh wellness workspace at `/wellness` and the signed-in student Wellness section, using the current site's visual style.
- Optional mood, guided fictional English reflection, on-device emotion-label analysis, explicit temporary keep/delete/clear actions and a documented fixed-answer helper.
- Public GoEmotions training pipeline, reproducible dependency versions, source revision and hashes, duplicate/partition audit, development selection, final held-out evaluation and portable model weights.
- Model limitations and actual metrics in the interface and [model card](../model-card.md). No old local C2 source was reused.

## Verification completed

| Check | Result |
| --- | --- |
| Full repository Jest regression | 24 suites, 558 tests passed, zero failures |
| New C2 checks (included above) | 35 tests passed |
| Python/browser-runtime prediction parity | 25 probes, absolute score tolerance 1e-7 |
| TypeScript check | Passed |
| ESLint | Passed; pre-existing hook/image warnings remain outside C2 |
| Real browser | Fictional example -> acknowledgment -> actual model result; keep -> session list -> delete; refresh clears temporary state |
| Responsive browser check | 390 x 844 viewport, no horizontal document overflow; desktop viewport restored |

The C2 tests cover acknowledgment, drafts across view changes, skipping analysis, loading failure/retry, clearing pending inference, explicit support navigation without reflection transfer and Python score agreement. No real participant records were created. Browser practice used the built-in invented exam example. This verification did not include a production build, deployment, accessibility audit, clinical validation or complete dark-mode review.

Machine-readable test evidence is retained locally at `D:/NewReaserch/research_review/c2-full-regression-results.json`; browser captures are `c2-fresh-home.png` and `c2-fresh-mobile.png` in the same folder. Model evaluation is versioned in [text-evaluation.json](../evidence/text-evaluation.json).

## Measured model result

TF-IDF + regularized one-vs-rest logistic regression: test micro-F1 0.5552 and macro-F1 0.4084 on 5,313 retained public English comments. Simple label-frequency baseline micro-F1: 0.3054. Training used 42,854 comments; settings were selected on 5,308 development comments. These are emotion-label metrics, not student mental-health or referral accuracy. Rare labels have weak or zero recall; see the complete per-label report.

## Next increments

1. Implement complete PHQ-9/GAD-7 practice questionnaires and verified deterministic scoring with a separate support pathway.
2. Design clearly labeled synthetic cases for testing missing inputs, fusion plumbing and uncertainty. Generated labels cannot establish clinical performance.
3. Compare a questionnaire/text baseline with a regularized fusion approach. Optional facial features remain a separate, consent-dependent experiment whose incremental value must be measured.
4. Implement and verify confidential assigned-counselor access before any real referral workflow.
5. Prepare the PP1 demonstration, method explanation, evidence and honest completed/pending distinction. Real-domain conclusions require the approved study and independent professional reference labels.

The current text classifier is an auxiliary experiment. It does not output clinical severity, counseling need, risk or automated referrals. The workspace does not persist journals or capture a camera, and its helper is not a generative counselor chatbot.
