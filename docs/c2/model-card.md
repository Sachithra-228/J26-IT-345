# C2 English text emotion baseline

Owner: D. G. A. Indeepa, IT23273412, J26-IT-345. Version: `c2-text-tfidf-ovr-v1`. First trained on 19 October 2026 with AI assistance. This is new C2 work in the current shared repository; the earlier local C2 implementation was not reused.

## Task and boundaries

This model predicts possible emotion labels expressed in one piece of English text. It supplies an auxiliary text experiment and optional on-device reflection analysis. It does not estimate an individual's actual emotional state, mental health, clinical severity, counseling need or safety. It is not a referral model. The later questionnaire workflow is documented in [the assessment increment report](reports/assessment-increment.md).

The official GoEmotions model card explicitly says that this class of model is unsuitable for higher-level mental-health understanding and that aggregating local emotion predictions does not establish meaningful wellbeing interpretation. This implementation therefore makes no longitudinal wellbeing score, clinical classification, automatic referral or notification from its predictions. The selected mood is a separate self-report and never overwritten by a model label.

## Data and permission

Source: [Google Research GoEmotions](https://github.com/google-research/google-research/tree/master/goemotions), Demszky et al., *GoEmotions A Dataset of Fine Grained Emotions*, ACL 2020, [paper](https://aclanthology.org/2020.acl-main.372/).

The release contains English Reddit comments annotated with 27 emotions plus neutral, and permits multiple labels per comment. The source model card identifies Apache 2.0 as the data license. A copy is retained in `docs/c2/GOEMOTIONS_LICENSE.txt`. The source README, model card, exact Git revision, file hashes and raw splits are stored under git-ignored `ml/c2/data/raw/goemotions/`. The evaluation JSON publishes the revision and source URLs without copying the complete dataset.

No local student records, shared MongoDB records, private journals, webcam captures or unrelated datasets were used for training. The model parity probes include invented software fixtures and public held-out examples, not participant evidence. The current interface contains no fictional-student prompt or prefilled reflection example.

## Preparation and partitions

The official train/development/test divisions are retained. Before model fitting, text is normalized using NFKC, apostrophes standardized and ASCII word tokens extracted. Negation remains. Within each division, normalized duplicate text is merged with the union of that division's labels. Overlap with earlier divisions is removed in training, development, test order. This procedure never imports held-out labels into training.

| Split | Official rows | Merged duplicate rows | Empty rows removed | Prior-split overlap removed | Used rows |
| --- | ---: | ---: | ---: | ---: | ---: |
| Training | 43,410 | 553 | 3 | 0 | 42,854 |
| Development | 5,426 | 20 | 0 | 98 | 5,308 |
| Test | 5,427 | 19 | 0 | 95 | 5,313 |

This token-normalized duplicate check does not establish author-level separation, cultural representativeness or absence of every semantic duplicate.

## Training

TF-IDF uses unigrams and bigrams, 5,000 maximum features, minimum document frequency three, sublinear term frequency and L2 normalization. Vocabulary and IDF fit on training text only. Each of 28 labels has a regularized logistic classifier, using one-vs-rest with the liblinear solver. Random seed: 23273412.

Two regularization settings, C=1 and C=4, and six shared decision thresholds, 0.15, 0.20, 0.25, 0.30, 0.40 and 0.50, were compared on development micro-F1. C=4 and threshold 0.25 were selected before evaluating the retained test set. Development micro-F1 was 0.5435. No parameters were chosen from test performance.

The comparison baseline predicts every label whose training frequency reaches the selected shared threshold; in this experiment it predicts neutral. It is a simple frequency comparator, not a competitive modern language model. The experiment does not establish superiority over transformers or other trained baselines.

## Measured results

| Method | Test micro precision | Test micro recall | Test micro F1 | Test macro F1 |
| --- | ---: | ---: | ---: | ---: |
| Label frequency | 0.3311 | 0.2834 | 0.3054 | 0.0178 |
| TF-IDF and logistic regression | 0.5459 | 0.5649 | 0.5552 | 0.4084 |

These are public-comment emotion-label metrics, not clinical or student-referral accuracy. Macro-F1 exposes unequal performance across emotion classes; individual precision, recall, F1 and support are in `docs/c2/evidence/text-evaluation.json`. The difference is descriptive; no statistical significance claim or interval was computed in this first experiment.

The initial training/evaluation took 12.672 seconds on the recorded Windows environment after dependencies/data were ready. This is a measured run duration, not a general hardware guarantee or inference benchmark. The report records Python 3.12.14, numpy 2.3.4, scipy 1.16.2 and scikit-learn 1.7.2.

## Application integration and abstention

Python exports the vocabulary, IDF, all classifier weights, intercepts, label order and threshold into `src/lib/c2/model/text-model.json`. The browser imports this approximately 1.74 MB JSON artifact only when analysis is requested. It does not call an inference API. Tokenization, TF-IDF normalization and logistic calculations are mirrored in TypeScript and compared with Python fixtures, with score tolerance 1e-7.

The screen withholds scores for more than 1,200 characters, fewer than three tokens, unsupported scripts or fewer than 25% known word tokens. Script checking is not complete language detection: other Latin-script languages can contain English-looking words and remain outside the evaluated task. The interface explicitly requests English. If no label crosses the learned threshold, that fact is shown rather than forcing a label. The strongest three marginal scores are displayed; they are not calibrated clinical probabilities and need not sum to one.

Benchmark metrics cover all retained public test rows. The separate interface gates were not used to inflate the benchmark score; no gated-coverage performance or real-domain validation is claimed.

## Application privacy and support

The current interface offers normal user-facing check-ins without fictional-use acknowledgment. Questionnaire answers, reflections and chat remain in React component memory, with explicit temporary keep, delete and clear actions. Refresh or leaving the workspace erases that state. Text analysis is optional and requires an explicit opt-in. There is no journal persistence, research enrollment, trained-model update or camera capture. Model outputs do not trigger staff notifications or health-log writes. A polished interface does not establish clinical readiness.

The guided support chat uses a limited local response library and is clearly identified as such. No generative AI service is connected. The existing booking and peer services remain separate. Matching uses local topics and preferences; fetching the directory does not transmit those topics. Booking submission includes only the selected professional, requested date/time and an explicitly entered note. No questionnaire, reflection or emotion score is attached. The interface explains existing staff access; this does not establish the proposal's confidential assigned-counselor access model.

## Remaining research

Complete PHQ-9/GAD-7 software scoring and context follow-ups are now implemented and tested; local clinical validation and professional content review remain pending. The new structured synthetic experiment is documented in [its separate model card](support-model-card.md). Proposed text/camera fusion, optional authorized facial features, confidential assigned-counselor access, multilingual validation and the approved local study remain separate work. Synthetic experiments may test implementation but cannot supply independent clinical reference labels. No GoEmotions prediction is automatically treated as a referral label.

The student must review the source, model choices, limitations and actual outputs, record personal contributions, and disclose AI assistance. AI assisted the pipeline, runtime, interface, tests and documentation; it did not supply local participant evidence or professional validation.
