# C2 synthetic-data model and website plan

**Implementation update, 19 October 2026:** the structured synthetic support model and topic router have now been fitted and integrated. This document preserves the original plan below. See [the model card](support-model-card.md) and `evidence/support-evaluation.json` for actual results and remaining scope.

Planning only. Prepared 19 October 2026 for D. G. A. Indeepa, IT23273412, J26-IT-345 Member 02. The additional models described here have not been generated, trained or integrated yet. Existing GoEmotions reflection analysis remains a separate trained auxiliary experiment.

## Intended outcome

Deliver a reproducible, genuinely fitted model pipeline using synthetic student check-in cases, an adaptive context-question flow, transparent professional/community matching, and a website demonstration with data and measured evidence. The work should be explainable at PP1 on 22 October.

Synthetic data can validate how the simulator, training code and application behave. It cannot establish that someone has a psychiatric disorder, estimate real-world clinical performance or demonstrate clinical benefit. Questionnaire results will describe depressive/anxiety symptom ranges separately; they are not diagnoses. Other topics such as sleep, study stress and social connection are support concerns, not newly diagnosed diseases.

This plan adopts the user's request for a new synthetic-data experiment. It does not assume that instructions inside a proposal authorize a study, sharing student records or changing staff permissions. It leaves live shared database records unchanged during development.

## What C3 actually implements

Reviewed `ml/c3/run_pipeline.py`, `src/recommender/role_profiles.py`, `synthetic_students.py`, `readiness.py`, `evaluation/evaluate.py`, the exported career model, evaluation reports, website career workflow and platform job matching.

| Stage | Evidence in C3 | C2 counterpart to implement |
| --- | --- | --- |
| Generate inputs | 600 synthetic advertisements and 3,000 synthetic student profiles | Documented synthetic questionnaire/context cases |
| Learn an artifact | Role weights and requirement levels estimated from 480 training advertisements, using TF-IDF-style aggregation and median levels | Actual scikit-learn classifier fitting, with learned coefficients or tree structures |
| Compute outputs | Weighted readiness, gap ranking and graph-based action planning | Simulated follow-up support estimate and ranked context topics |
| Evaluate | Held-out ranking/extraction results, simple baseline, sensitivity and resampling reports | Held-out classification and question-routing results, rule baseline and missing-input checks |
| Export/integrate | JSON model; Python/TypeScript reference agreement; website breakdowns and job matching | Versioned learned artifact, runtime agreement and explanation in the check-in website |

The current C3 artifact is `c3-readiness-v1-synthetic`. Its report uses 2,400 training and 600 held-out synthetic students; these student profiles assess recommendation behavior, rather than training a neural diagnostic classifier. C3 also reports 255 manually collected public job advertisements for a separate preliminary real-data analysis. Its source explicitly identifies optimistic simulator assumptions and says synthetic results are not real-world accuracy. The useful comparison is completeness of evidence and integration; wellness and career scores cannot establish which component is "better."

## Proposal reconciliation and model choice

The detailed `IT4010 Research Project – J26-IT-345 DGA.Indeepa – IT23273412.pdf` specifies regularized multinomial logistic fusion in section 3.5, with three counselor-follow-up categories in section 3.4. It explicitly warns against generating labels from PHQ thresholds and then treating reproduction of those thresholds as clinical validation.

The older `UniCare_Member02_Proposal.pdf` mentions a Random Forest/ensemble for fusion, and MobileNetV2 for facial expressions. The questionnaire template also contains older, broader multimodal wording. Keep this document-version difference visible; confirm the officially submitted wording when preparing slides rather than claiming every draft describes the same model.

Recommended primary algorithm: **L2-regularized Multinomial Logistic Regression**, implemented using the already prepared scikit-learn 1.7.2 environment. Use a preprocessing pipeline and an appropriate multinomial solver such as `lbfgs`. It matches the detailed proposal and gives a compact, explainable model for structured inputs. This is a proposed engineering choice, not a claim that it is medically valid or will outperform another algorithm.

Train a constrained **Random Forest Classifier** as a genuine comparator under the same case split and input budget. This tests the older proposal's candidate as well. Compare development results before final selection; do not choose a winner from held-out test results or promise that Random Forest is automatically better. Keep the simpler logistic model if there is no useful, stable improvement. Any algorithm change must be reflected in the exported runtime and model card.

MobileNetV2 is not the questionnaire/referral model. Camera work is a separate later branch. No facial data or synthetic face vectors will be presented as a trained/validated facial model.

## Separate the three decisions

| Decision | Implementation | Reference/meaning |
| --- | --- | --- |
| Depression-related and anxiety-related symptom ranges | Preserve complete PHQ-9/GAD-7 scoring and separate totals | Standard questionnaire scoring; not a learned diagnosis |
| Which additional topic to ask about | Trained multilabel topic router, initially one-vs-rest regularized logistic regression | Simulated relevance of low mood, worry, sleep, study and connection topics |
| Which support route to discuss after context | Trained multinomial support model | Simulated self-management with optional support / routine follow-up / prompt professional review |

The router and final support estimator are two small trained components of one C2 pipeline, with separate targets and evaluations. Do not represent the topic router, deterministic questionnaire scores, directory filters and final classifier as one algorithm doing everything.

Support classes are mutually exclusive simulated service categories. Depression and anxiety symptoms can co-occur and must not be forced into mutually exclusive disease classes. A qualified professional assesses diagnosis. The learned support estimate remains clearly identified as research output trained on synthetic cases; it cannot govern access to care, trigger staff alerts or automatically create a referral.

## Data design and size

Plan **1,500 unique synthetic base cases** so the demonstration includes **300 genuinely held-out test cases**:

| Division | Cases | Use |
| --- | ---: | --- |
| Train | 900 | Fit preprocessing and models; training-only cross-validation |
| Development | 300 | Check model selection, uncertainty thresholds and routing policy |
| Test | 300 | Frozen final evaluation after decisions are fixed |

This exceeds a request for 250–300 total examples and also supplies 300 actual test examples. Generating more artificial rows does not create clinical evidence. If only 300 total cases are desired, the split must be smaller; the same 300 cases cannot be both the training evidence and unseen test evidence.

Each case has a synthetic ID and provenance; 9 PHQ responses; 7 GAD responses; separate calculated totals; optional self-reported mood; context responses such as functional impact, duration, study/relationship concerns and support goal; and explicit missing/skip indicators. User preferences and names are not health predictors. No invented names, diagnoses or real contact details are needed in training data.

Define the generator and simulator label policy in writing before fitting. Include diverse combinations and overlaps, missing responses, differing context with similar totals, help-seeking preferences and contradictory inputs. The target fields are explicitly `simulated_followup` and topic-relevance labels. They come from a documented simulator, not from a real counselor, the model's own predictions, GoEmotions labels or a renamed PHQ cutoff. Hidden simulator variables and targets never enter the feature matrix. The fact that inputs and labels share synthetic assumptions remains a limitation even when there is no direct target-column leakage.

Generate base cases before the split. Keep all partial-answer snapshots and any text variants from the same case in the same division. Detect duplicate and near-duplicate profiles; do not inflate the row count with copies. Record split IDs, scenario counts, class distributions, seed 23273412 and data hashes. Artificial class proportions are not estimates of student prevalence. Keep a separately identified challenge set for incomplete/conflicting input and safety-path software checks, without using challenge results to tune the frozen final test.

No text/image datasets are paired by row number. The existing GoEmotions model remains an auxiliary wording-label experiment, not a clinical severity target or a validated input to referral decisions. First train the structured questionnaire-plus-context models. Any later text or facial fusion needs its own label, privacy and evaluation design.

## Adaptive questions without leaking future answers

1. Complete the standard PHQ-9 and GAD-7 without changing their wording or scoring. Skips yield incomplete scores.
2. Use the router with only answers already available. It scores relevant remaining topics from a fixed, versioned bank of ordinary context questions.
3. Ask a relevant optional question, collect the answer, update the feature mask and score remaining topics again. Never supply later answers or the final support label to the router while selecting an earlier question.
4. Limit optional questions, provisionally to 3–6, avoid repeats, allow skips and a direct path to support. Ask broad impact/help-goal context where it is needed rather than assuming an ML label is certain.
5. Fall back to the existing general context bank for insufficient input, uncertain routing, load errors or unsupported content.
6. After context is collected, run the support estimator on available questionnaire/context features. Explain the input gaps and the limited meaning of its output.

Follow-up question content is a separate content-review task. Selecting questions with ML does not validate their medical meaning. Do not generate a new diagnostic questionnaire on the fly or claim adaptive clinical validity. Safety disclosures receive the existing direct support information independently of the router/classifier, and are not treated as a learned suicide-risk target.

## Professional and community matching

Use a hybrid recommender: learned topic priorities identify relevant recorded support areas, while directory rules enforce the student's gender, language, profession and session-mode preferences. Rank eligible professionals with explicit reasons. Do not train against provider IDs, infer a psychiatrist qualification from a name, or invent successful-treatment/appointment labels.

The existing directory schema already supports `profession`, `gender`, `languages`, `supportAreas`, specialization and session mode. Availability is presently descriptive text, not a guarantee of a free calendar slot. Profiles need accurate confirmed values. The previous site review found missing optional metadata; the implementation phase must recheck actual directory coverage before demonstrating strict filters. Unknown fields do not satisfy a specific preference. If no exact match exists, show that outcome and allow the student to adjust filters explicitly. Never silently relax a gender/language/profession preference.

Psychiatrist, psychologist and counselor remain distinct types. Show a psychiatrist option only for a record actually marked as such. The student chooses from the matching directory and explicitly requests any booking. Keep questionnaire/reflection/model results out of booking notes unless the student deliberately shares an approved summary. Confidential assigned-counselor permissions remain a separate unfinished feature; existing wider staff access must not be described as confidential assignment.

Community suggestions link to the existing forum's relevant topic filters. They do not automatically post health details or promise a moderated clinical support group. Provider ranking is not claimed as a separately trained recommender until suitable independent relevance/outcome data exist.

## Training and evaluation protocol

Before evaluating, freeze targets, features, allowed hyperparameter search and split IDs. Fit encoders/scalers/imputers within training folds only. Use explicit missing indicators; missing is not a healthy/zero response. Use training-only cross-validation for hyperparameter search, development cases for the declared final choice/uncertainty decisions, and one frozen final test for the selected pipeline. Do not tune on test results.

Comparators: majority-class baseline, the existing explicit questionnaire/context rule policy, regularized logistic regression, and a constrained Random Forest. A model trained to reproduce simulator rules may not beat the corresponding rule policy; a negative result is acceptable. Report this rather than modifying the simulator until the proposed method wins.

For support classification: macro-F1, per-class precision/recall/F1/support, confusion matrix, class distribution, and descriptive uncertainty/calibration checks within the simulator. For routing: topic precision/recall or NDCG at a fixed question budget against simulated relevance, repeated-question count, unknown-input behavior and fallback coverage. For the directory: preference-constraint violations, metadata coverage, known topic matches and explicit no-match behavior; not clinical provider-quality accuracy. Where reported, interval methods resample whole base cases rather than correlated snapshots.

Export the selected learned parameters, feature order, transformations, missing-value policy, classes, threshold/version metadata and source hashes. Compare Python and website inference on independent reference cases, including boundary cases. Metrics from unit tests and Python/runtime agreement measure software correctness, not predictive clinical validity.

## Website deliverables

The ordinary check-in flow becomes: standard screening → model-assisted context questions → separate questionnaire summary and labelled research support estimate → professional/community suggestions → explicit student choice. Keep the existing site styling and no forced fictional-student gate. A clear short disclosure beside synthetic-model outputs remains necessary; a polished interface does not convert simulation into clinical validation.

Expand **Research & ML** to show the new model's name/version, synthetic case count/splits/provenance, feature definitions, classifier comparison, confusion matrix, routing evidence, model-source code and live scenario inference. Use a research-only synthetic case selector to demonstrate contrasting scenarios and missing inputs without collecting participant data. Show recorded training evidence honestly; inference is not animated or presented as new training. Do not add a public endpoint capable of spawning arbitrary Python commands or overwriting production artifacts.

Proposed files (not yet created): `ml/c2/generate_support_cases.py`, `ml/c2/train_support.py`, `ml/c2/evaluate_support.py`; synthetic data/schema/manifest under `ml/c2/data/synthetic/`; export under `src/lib/c2/model/`; runtime/router under `src/lib/c2/`; evidence and model card under `docs/c2/`. Keep the existing text model and its results separate.

## Order of work before PP1

1. **19 October: freeze the design.** Confirm this scope, write the scenario schema/generator label policy and split plan. No claim that a new model is trained yet.
2. **20 October: fit and evaluate.** Generate/audit cases, train both candidate families, evaluate the declared comparators, export the selected artifact and record limitations.
3. **21 October: integrate and rehearse.** Connect routing/results/directory ranking, verify actual metadata coverage, test the full flow, update the ML page and practise explaining successful and uncertain cases.
4. **Before 22 October presentation:** freeze a working branch and evidence, prepare an offline fallback demonstration and identify unfinished scope accurately. Adjust scope if time requires; do not exchange validation quality for an invented accuracy claim.

PP1 evidence should demonstrate a reproducible fitted model, adaptive-question behavior, end-to-end website use and honest evaluation. It does not complete the proposal's independent counselor-labelled, quality-aware camera-fusion study. That main research question remains future work, including professional review and the approved local pilot.

## Sources consulted

- Local detailed proposal, sections 3.4–3.5 and evaluation plan; older Member 02 proposal model section.
- C3 source and reports cited above, particularly `docs/c3/evidence/recommendation-eval.json` and `real-ads-import.json`.
- [scikit-learn 1.7 LogisticRegression](https://scikit-learn.org/1.7/modules/generated/sklearn.linear_model.LogisticRegression.html): regularization and multinomial support.
- [scikit-learn common pitfalls](https://scikit-learn.org/stable/common_pitfalls.html): split data before fitting preprocessing; do not fit or select models using test data.
- [NICE NG222 recommendations](https://www.nice.org.uk/guidance/NG222/chapter/recommendations): depression assessment considers history, duration and functioning rather than symptom count alone.
- [NIMH: Depression](https://www.nimh.nih.gov/health/publications/depression): diagnosis requires professional assessment; medical conditions can resemble depressive symptoms.
