# C2 questionnaire and context support models

Owner: D. G. A. Indeepa, IT23273412. First fitted 19 October 2026 with AI assistance. Version `c2-support-synthetic-v1`. This is a new experiment, separate from the previously trained GoEmotions emotion classifier.

## Task and scope

The support classifier estimates three simulated service categories: self-management with optional support, routine professional follow-up and prompt professional review. A separate multilabel classifier ranks low mood, worry, sleep, study and connection topics to select questions. Neither target is a diagnosis or a professionally validated assessment of urgency. Depression-related and anxiety-related symptom ranges remain separate deterministic PHQ-9/GAD-7 results. No other psychiatric disorder is predicted.

All 1,500 base cases are invented by a documented simulator. No students, counselors, diagnoses, private journal records or real facial/text training pairs were collected. Increasing generated rows does not create clinical evidence. A three-level service target is consistent with the detailed proposal; independent counselor judgments and the optional quality-aware text/camera experiment remain future work.

## Data and simulated labels

Files: `ml/c2/data/synthetic/support-cases.jsonl` and a readable CSV; `support-policy.json` records exact generator assumptions; `support-manifest.json` records hashes, class counts, splits and source type. Seed 23273412.

The simulator draws overlapping burden strata and five topic intensities, latent functioning, persistence and help-seeking. Noisy ordinal responses and categorical context are generated from these latent quantities. A predefined weighted latent burden produces the simulated follow-up category. Labels are not copied from model predictions, independently supplied by professionals, or defined merely by PHQ/GAD thresholds. Inputs and targets still share the same engineering assumptions: measured performance is simulator agreement and may be optimistic.

| Division | Unique base cases | Purpose |
| --- | ---: | --- |
| Training | 900 | Fit models; grouped training-only cross-validation |
| Development | 300 | Compare candidate families before using final test |
| Held-out test | 300 | Frozen end-to-end evaluation |

There are no duplicate complete encoded profiles. This check does not establish absence of all similar questionnaire patterns. Artificial class proportions are not estimates of student prevalence. Context answers are omitted with probability 0.12. The benchmark's questionnaire answers are complete and PHQ item 9 is zero; it does not measure safety performance. Separate software tests handle incomplete items and positive safety responses.

Four partial-context snapshots per training case give 3,600 training rows, not 3,600 independent people. Every snapshot stays with its base case during three-fold StratifiedGroupKFold validation. Test/development cases never enter fitting, including scaler fitting. Hidden latent generator values, simulated targets, identity and provider preferences are excluded from model features.

## Features and fitted algorithms

Seventy-three fixed features encode eight non-safety PHQ item responses, seven GAD responses, their missing indicators, and one-hot/missing indicators for the eight context questions. PHQ item 9 is not a learned feature. Standard questionnaire scores are not changed by these models.

Support candidates were StandardScaler + L2-regularized multinomial LogisticRegression with C=0.1, 1 or 10, and RandomForestClassifier with 80 trees, max depth 3 or 5, minimum leaf size 12. The topic router compared StandardScaler + five one-vs-rest logistic classifiers with C=0.1, 1 or 10. Three-fold grouped macro-F1 chose the best configuration per family using training snapshots.

Development evaluation used context collected by the trained router. The predefined selection policy chooses Random Forest only if development macro-F1 exceeds logistic regression by more than 0.01; otherwise it retains logistic regression. This selected **L2-Regularized Multinomial Logistic Regression, C=10**, with development macro-F1 **0.8162**. The topic router selected C=0.1. The models were genuinely fitted in this project; no pretrained support weights were downloaded. Source: `ml/c2/train_support.py` and `support_common.py`.

Maximum class score below 0.55 or top-two margin below 0.10 produces an uncertain result. These thresholds were fixed before evaluation, not adjusted against test results. Scores are not calibrated clinical probabilities and thresholds do not establish safe clinical use.

## Frozen test results

Each of the 300 test cases follows the same six-question policy as the application: impact, duration and goal, followed by three distinct topics selected using currently available answers. Simulated skips are preserved. Unasked answers are excluded from inference. Candidate-family selection was fixed before test performance was calculated.

| Method | Test macro-F1 | Simulator-label accuracy |
| --- | ---: | ---: |
| Majority class | 0.2121 | 0.4667 |
| Questionnaire/context rules | 0.6747 | 0.6933 |
| Questionnaire-only learned logistic baseline | 0.5742 | 0.6700 |
| Selected questionnaire/context logistic classifier | 0.8022 | 0.8167 |
| Random Forest comparator | 0.5853 | 0.7233 |

The JSON evaluation report is authoritative for full precision. Counts for the selected model are below, with reference categories in rows and predicted categories in columns:

| Reference / predicted | Optional support | Routine follow-up | Prompt review |
| --- | ---: | ---: | ---: |
| Optional support | 38 | 12 | 0 |
| Routine follow-up | 17 | 113 | 10 |
| Prompt review | 0 | 16 | 94 |

All 300 cases are included in these metrics, including those the interface marks uncertain. Fixed-threshold accepted-estimate coverage is 288/300 (96%). Initial-state topic ranking NDCG@3 is 0.8726 versus 0.8474 for questionnaire topic rules; precision@3 is 0.6256 versus 0.5733. No repeated questions occurred in the 300 replays. These are descriptive simulation results; no real-world improvement, clinical validation, significance or diagnostic accuracy is claimed.

The research case browser exposes all 300 held-out cases ordered by ID, without filtering for prediction success. For example, prompt-review case SYN-C2-0026 is predicted as routine follow-up in the browser replay. Keep this visible as a limitation; do not present only successful cases as evidence.

## Runtime and application

Python exports all learned coefficients, intercepts, scaler parameters, feature order, labels and thresholds to `src/lib/c2/model/support-model.json` (approximately 14 KB). The website loads it only on an explicit model-assisted check-in or research prediction. `support-runtime.ts` mirrors encoding, softmax and logistic arithmetic. Python-reference tests cover 48 partial/full probes and 24 complete adaptive replays, including simulated missing context.

Ordinary check-in users can opt into model-assisted follow-ups and a clearly identified synthetic-data research estimate. Without opt-in, the original fixed-bank rule path remains available. Load failure uses standard context; incomplete questionnaires withhold a model estimate; a reported safety item bypasses learned categories and shows the separate support path. The model cannot dismiss that pathway. Context edits invalidate later adaptive questions and their answers. Input is held only in page memory, is not added to training data and is not uploaded to a prediction API.

Professional matching combines topic priorities with recorded directory expertise and hard gender/language/profession/mode filters. Explicit structured support areas take precedence over free-text specialization matching; legacy specialization text is considered only when structured areas are absent. This is a hybrid matcher, not a trained provider-outcome predictor. Unknown profile values cannot satisfy specific preferences. No questionnaires or model scores are attached automatically to bookings or forum posts. Student choice remains available at every score. Existing booking staff access remains broader than the proposed confidential assigned-counselor design.

At the user's explicit request, eight synthetic professional profiles are also stored in the separate MongoDB collection `c2_research_professionals`: three counselors, three psychologists and two psychiatrists, with varied recorded languages, genders, modes and support areas. They have no real credentials or contact details and are clearly marked as invented. The signed-in read-only research directory and normal workspace's source selector use that collection; the three pre-existing university profiles are unchanged. The research view hides real booking forms, and the booking API rejects research-profile IDs. Seeding sends no notifications and creates no appointments. The catalog is for database/matching demonstrations only, not actual care.

`/wellness/research` shows synthetic scenarios, live six-question replay, classifier comparisons, confusion matrix, coverage, routing metrics and actual source code. The page checks that the current learned artifact hash matches the evaluation report. It never starts training from a public web endpoint.

## Reproduction and limitations

Use the pinned Python 3.12 / scikit-learn 1.7.2 environment in `ml/c2/requirements.txt`:

```powershell
& 'D:\NewReaserch\.venv-c2\Scripts\python.exe' ml/c2/generate_support_cases.py
& 'D:\NewReaserch\.venv-c2\Scripts\python.exe' ml/c2/train_support.py
& 'D:\NewReaserch\.venv-c2\Scripts\python.exe' ml/c2/test_support.py
npm.cmd run c2:test
```

Generation intentionally replaces synthetic source artifacts. Training verifies their hashes, repeats the frozen procedure and replaces model/report/reference artifacts. Two identical-protocol training runs produced identical learned-artifact SHA-256 values. Repeated evaluation demonstrates reproducibility; it is not permission to tune against the frozen test. A changed simulator/protocol requires a new recorded version and separately archived evidence.

No trained generative chat, facial model, clinical disease model or learned treatment-outcome matching is supplied. Independent labels, professional review of context content, a suitable local study and confidential assigned-counselor access are unresolved. The student must understand the generator, targets, splitting, classifiers, metrics and failures, and disclose AI assistance in accordance with institutional requirements.
