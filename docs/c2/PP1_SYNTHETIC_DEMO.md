# Anuk's new synthetic-model demonstration

This is a newly fitted questionnaire/context experiment, not a downloaded pretrained classifier. See [the full model card](support-model-card.md) for scope and measured results. AI assisted the implementation, simulator, training, tests and documentation.

Verification on 19 October: 34 Jest suites / 730 total tests passed, including 10 C2 suites / 180 C2 tests; five Python dataset/artifact audits passed; project type checking and lint for changed application files passed. The browser confirmed the full model-assisted check-in and a combined female + Sinhala + psychologist database filter returning one demonstration profile. The final report is `evidence/support-software-verification.json`; screenshots are `evidence/synthetic-support-result.png` and `evidence/synthetic-professional-match.png`. These software checks are separate from the model's synthetic-label performance.

## Show the working website

1. Open **Wellness → My check-in**. Enable **Use model-assisted follow-up questions and a research support estimate**, then begin. Enter an invented response set while demonstrating; actual answers stay in page memory and are not collected as research data.
2. Complete the full PHQ-9 and GAD-7. The first three optional context questions collect impact, duration and goal. The trained topic model chooses the next three; answers update its input before each selection. Skipping is allowed.
3. Show separate standard questionnaire symptom ranges and the clearly labelled synthetic-data support estimate. Show the context supplied, model scores and top topics. This is not a diagnosis or validated urgency decision.
4. Select **Find support**. Choose **Research demonstration · 8 synthetic profiles** as the directory source. The profiles come from the separate database collection and demonstrate topic matching plus language/gender/profession/mode filters. Select a demo match; it cannot receive real appointments. Existing university profiles remain in the university directory.
5. Open **Research & ML**, or `/wellness/research`. Load a synthetic scenario and select **Run support pipeline**. Show its six-question replay, model output and matching demonstration profiles. Filter for a female Sinhala-speaking psychologist to demonstrate the recorded profile filter; select a psychiatrist filter separately to demonstrate that profession.
6. Show the recorded comparison, confusion matrix, routing scores and actual Python source. The source panels expose `generate_support_cases.py`, `train_support.py` and the website runtime. The separate GoEmotions text experiment is collapsed below.

The case browser contains all 300 frozen test cases, ordered by ID rather than prediction success. The prompt-review scenario SYN-C2-0026 is predicted as routine follow-up in replay; show this mismatch and explain why synthetic classifier output cannot replace professional assessment.

## Explain the model

Main model: **L2-Regularized Multinomial Logistic Regression**, selected C=10. Router: **One-vs-Rest Logistic Regression**, selected C=0.1. A Random Forest was genuinely fitted and evaluated as a comparator. The new models use 73 structured features and 900 unique training cases; four partial-answer snapshots per case are grouped during validation. Development and test sets each have 300 separate cases. No pretrained support weights were used.

The simulator assigns invented service-support labels from a declared latent burden policy. That is not independent professional ground truth. The model learns relationships within that simulator. Public GoEmotions emotion labels are not used as depression, anxiety or referral targets, and no facial model is claimed.

The selected support classifier's frozen test macro-F1 is **0.8022**, compared with **0.6747** for the explicit rule comparator. These describe simulator-label agreement, not diagnostic accuracy. Standard PHQ/GAD scoring is mathematics rather than a trained classifier; both symptom dimensions are preserved.

## Show actual training if requested

From the repository root, using the prepared environment:

```powershell
& 'D:\NewReaserch\.venv-c2\Scripts\python.exe' ml/c2/train_support.py
& 'D:\NewReaserch\.venv-c2\Scripts\python.exe' ml/c2/test_support.py
npm.cmd run c2:test
```

This verifies frozen source hashes, fits the classifiers, runs grouped training CV, selects the family using development data, evaluates the test partition and replaces the learned artifact/report/reference files. Do not modify settings to chase test performance. Two identical-protocol runs produced the same learned-artifact hash. The data-generator command intentionally replaces the synthetic source files; a changed protocol or simulator needs a new version.

Database setup is already completed on this computer. For a teammate's configured database, run `npm run c2:research:seed` after reviewing the eight clearly labelled catalog definitions. It only upserts those records in `c2_research_professionals`; credentials are loaded from ignored local environment files and are never printed. Use `node scripts/c2/seed-research-professionals.cjs --verify` for a read-only database verification.

Remaining research: independent counselor labels, professional question-bank review, a suitable approved local study, optional text/camera fusion evaluation and confidential assigned-counselor permissions. The current guided chat is a response library, not a trained generative assistant.
