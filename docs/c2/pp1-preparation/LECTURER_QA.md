# Lecturer Q&A: C2 implementation and ML

Practise the short answer first. The detail below helps you explain the code; it is not evidence that the student has already mastered it. Use your own words and point to the actual source. These answers describe current v2 work, not every earlier experiment.

## Essential: what model did you use, and did you train it?

**Short answer:** “The main model is DistilBERT, fine-tuned locally for 15 student support topics. It starts from pretrained language weights, then trains a new task head and the last two transformer blocks on the project dataset.”

The base is `distilbert/distilbert-base-uncased`, pinned revision `12040accade4e8a0f71eabdb258fecc2e7e948be`. Embeddings and the first four blocks remain frozen. There are 14,777,871 trainable parameters out of 66,965,007 total. Audit evidence records unchanged frozen tensors and changed trainable tensors. This is actual transfer learning, not pretraining a language model from scratch and not only downloading an already finished topic classifier.

Show [build_model](../../../ml/c2/train_distilbert.py) and [v2 training](../../../ml/c2/train_concerns.py).

## Essential: why DistilBERT rather than EfficientNet or MobileNet?

“My current model takes text as input, so I use a text transformer. EfficientNet and MobileNet are image-model architectures. The transfer-learning idea is similar, but the input, preprocessing and prediction task differ.”

DistilBERT fits the proposal's candidate transformer text branch. MobileNetV2 was proposed as a possible separate facial-expression feature model. No experiment here establishes that DistilBERT is the best model for every student or language. The same-data classical text baseline supplies a concrete comparison.

## Essential: what does the model predict?

“It predicts support-topic labels such as study pressure, worry, sleep, grief and self-esteem from English wording. Several can apply at once. It does not diagnose depression, anxiety disorders or other illnesses.”

PHQ-9/GAD-7 independently calculate reported symptom ranges. The model scores are not disease probabilities. Self-harm is not one of the 15 trained labels; the explicit support route is separate.

## Essential: what data did you collect?

“For this training run, no real student records were collected. The project generated 3,000 explicitly synthetic narratives with known topic labels for development and evaluation.”

Split: 1,800 training / 600 development / 600 held-out test. A row can contain zero to four topics. The generator includes neutral statements and narrow explicit denials. No real diagnoses or independent counselor labels are available for this task. Synthetic held-out results demonstrate learning within this generated task; they do not establish clinical accuracy.

Show [generator](../../../ml/c2/generate_concern_cases_v2.py), its imported v1 definitions and `ml/c2/data/synthetic/concerns-v2/manifest.json`.

## Essential: explain the preprocessing

“The data generator assigns topic targets and partitions wording families before composing the records. The pinned tokenizer converts English text into WordPiece subword IDs and attention masks. Sequences use a maximum of 128 tokens and dynamic padding within each batch.”

- Exact-text and declared wording-family overlaps were checked across train/dev/test.
- Negation is meaningful, so it is retained. No stop-word removal or stemming step is applied to these transformer inputs.
- Training/dev token lengths were checked before training; the audit also checks held-out lengths. Recorded examples fit within the limit.
- The live main runtime rejects text over its token limit instead of silently discarding its ending.
- The classical TF-IDF vocabulary is fitted on training text, not the held-out test set.

Family separation does not eliminate all shared vocabulary or generator bias.

## Essential: what augmentation did you use?

“V2 uses generated wording variation and combinations of topics, neutral statements and explicit denials. It did not run a token-masking augmentation experiment. I do not claim an experimentally measured augmentation benefit for v2.”

Keep these distinctions clear:

- Synthetic data generation creates the invented dataset.
- Preprocessing turns text into model inputs.
- An augmentation ablation would compare training with/without a controlled transformation.

The training source supports an earlier masking configuration, but v2 ran with `--selected-rate-only` and masking probability zero. Do not relabel an old v1 masking result as a v2 experiment. Image rotation, flipping and cropping do not describe this text run.

## Essential: which parameters did you tune or configure?

| Setting | Current v2 value | Explain it simply |
| --- | --- | --- |
| Backbone learning rate | 5e-5 | Step size for the unfrozen transformer blocks |
| Head learning rate | 1e-3 | Step size for the new topic classifier |
| Batch size | 16 | Examples used in each optimization batch |
| Epochs | 4 | Full training passes allowed in this run |
| Trainable backbone blocks | Last 2 of 6 | Amount of the language representation adapted |
| Weight decay | .01 | Penalization used by AdamW |
| Gradient clip norm | 1.0 | Limits the gradient norm before an update |
| Warmup / schedule | 10%, then linear decay | Changes the learning rate over training steps |
| Maximum sequence length | 128 tokens | Limits model input length |
| Loss | BCEWithLogitsLoss | Independent binary targets for multiple topics |
| Decision threshold | .25 | Development-selected cutoff for topic suggestions |

**Important distinction:** configuring a value is not proof that alternatives were tuned. V2 reused v1's development-selected learning rate; it ran one LR configuration. Epoch and threshold selection used current development results. Do not claim a fresh three-trial search for v2.

## Essential: explain the forward pass and training update

“Token IDs and attention masks pass through DistilBERT. The classification head returns 15 logits, one per support topic. During training, BCEWithLogitsLoss compares these with the binary topic targets. Backpropagation computes gradients, and AdamW updates only parameters whose `requires_grad` is true.”

“At inference, sigmoid converts each logit to a score between zero and one. Topics at or above the selected threshold are suggested. No weight update happens during a student's check-in.”

## Why sigmoid rather than softmax?

“A student narrative can mention worry and sleep together, so this is multilabel classification. Independent sigmoid scores allow several topics. Softmax is typically used when selecting one mutually exclusive class.”

The scores do not need to sum to one. A .97 topic score is not a 97% chance of mental illness or proof of calibrated certainty.

## Why freeze part of the model?

“The project adapts pretrained language features while limiting the number of parameters updated on a small synthetic dataset. It trains the last two blocks and task head. This is a design choice; the current v2 run does not prove that this freezing pattern is optimal.”

## Essential: training/validation accuracy and loss

“At the final epoch, train loss was .00630 and validation loss .24748. At the fixed curve threshold .5, training exact-set accuracy was 99.5% and validation exact-set accuracy 28.8%. The gap shows generalization concerns.”

The final held-out metrics use the selected .25 threshold, so do not compare their exact-match number directly with the .5 curves as if the settings were identical. Development micro-F1 at the selected threshold was .6947. A low training loss alone does not establish a good real-world model.

## Essential: what are your test results?

“On 600 held-out synthetic examples: micro precision .7188, micro recall .8874, micro-F1 .7942 and macro-F1 .7974. Exact label-set accuracy was .4017.”

Label-wise accuracy was .9397. Many label decisions are negative; show F1, exact-match accuracy and per-topic support alongside that larger number. Do not say “the model diagnoses depression with 94% accuracy.”

## Explain precision, recall and F1

- **Precision:** among predicted positive topic labels, how many are correct? `TP / (TP + FP)`.
- **Recall:** among true positive topic labels, how many were found? `TP / (TP + FN)`.
- **F1:** balances precision and recall: `2PR / (P + R)`.
- **Micro:** aggregate label decisions before calculating the metric.
- **Macro:** calculate each topic's metric and average topics equally.
- **Exact-set accuracy:** the entire selected topic set must match for a row to count as correct.

False positive means suggesting a topic absent from the synthetic target; false negative means missing a topic present in that target. These are not confirmed clinical false alarms or missed diagnoses.

## Why not use one 15-by-15 confusion matrix?

“Because several topics can be present together. Each topic has a binary 2-by-2 confusion matrix containing TN, FP, FN and TP. The report stores one per label.”

These counts use 600 test rows per topic. Do not add them and claim that 9,000 different students were evaluated; there are 600 examples × 15 label decisions.

## What baseline did you compare with?

“TF-IDF with a one-versus-rest logistic regression classifier on the identical narrative train/dev/test rows. Its micro-F1 was .4136, compared with .7942 for DistilBERT.”

Each model's selection used development data. This supports a comparison on this synthetic topic task; it does not establish superiority on real student outcomes or against a facial model.

## Why is test F1 higher than development F1?

“These are finite generated partitions with different wording and composition. The test partition can be easier. The result needs further evaluation; a higher test score is not proof that overfitting has disappeared.”

Do not change the test cases or thresholds to make the numbers look consistent. Report split counts, distributions and limitations.

## Essential: how do the follow-up questions change?

“The model suggests topic priorities. After the student confirms topics, explicit rules combine those priorities with questionnaire items and earlier answers to select eligible bank questions. The question budget is 5–9 and repeated IDs/facets are excluded.”

Example: **help planning my workload** leads to `study-workload`; changing it to **starting tasks is difficult** leads to `study-starting`. The exact question ID is not a neural output. With the same inputs and versions, the same path is expected; relevance is not the same as random variety.

## Why do both prepared cases have six questions?

“The target depends on confirmed/resolved topic count and daily-life impact. Both prepared cases have two topics and choose somewhat difficult, producing a six-question budget. They ask different topic and conditional questions. The allowed range is 5–9, not a promise that every case has a different count.”

The formula in `followupTarget` is capped at nine and increases with additional topics and very/extremely difficult impact. More topics do not mean all 270 questions will be asked.

## Essential: does the model select the psychiatrist?

“The model helps prioritize confirmed support topics. The directory uses explicit preference filters and weighted topic overlap to rank recorded profiles. The student chooses. We have not validated a model of individual clinical suitability.”

Missing professional metadata cannot be guessed from names. Sample names/details are fictional and remain unavailable for real appointments. Do not call the matching score a diagnosis or probability of treatment success.

## Where is the model in the website, and where are its files?

“The main runtime loads the pinned local ONNX export and tokenizer, checks model identity and runs browser WASM inference. The trained ONNX file is under `public/c2/transformer/c2-concerns/onnx/model.onnx` when installed.”

Normal Git ignores the large assets. Another laptop needs matching source plus the private v2 ZIP, then `npm run c2:models:verify`. It does not need to retrain. A hosted deployment must provision the same assets. Local success does not establish that Vercel currently serves this model.

## How do you know the export matches the trained model?

“The project records checkpoint/export hashes and verifies model identity. A numerical audit compared all 600 held-out examples across 15 outputs: zero changed decisions, with maximum native/ONNX score difference about 5.6e-6. Earlier actual browser scores were also compared with saved probes.”

That establishes conversion parity for the checked inputs, not clinical validity or a fresh browser run on every device. The rehearsal scenarios were additionally checked with Python ONNX and actual routing functions.

## Essential: what happens when the model fails or misunderstands?

“The student can choose topics manually and continue to support. A prediction is a suggestion they can correct. No model output prevents access to professional support.”

Show the recorded error: an invented sentence about a brother's death/feeling alone suggested self-esteem but missed grief/connection. Discuss new independent evaluation and professional review as next work. Do not claim the phrase safety check or a negative questionnaire answer proves someone is safe.

## Is the chat trained DistilBERT or ChatGPT?

“The current support chat is a bounded prepared-response guide. DistilBERT is the separate topic classifier, not a generative conversational model. An unrestricted LLM is not part of the current claim.”

## Essential: how does this match the original proposal?

“It implements the text branch and the student support workflow. The proposal also plans an optional facial-quality branch and a fusion comparison against independent counselor referral labels. Those remain incomplete.”

DistilBERT's support-topic labels are a different target from counselor-assessed need for follow-up. The existing synthetic structured-support experiment is also not a completed matched-participant fusion study. Any approved scope revision must be documented rather than silently replacing the original question.

## Have students or professionals validated this?

“The records inspected for this preparation contain synthetic ML evaluation and software tests, not completed approved participant results or professional content validation. I will report actual reviews and study results when they are completed.”

The proposed approximately 30-person pilot and SUS target are plans, not achieved sample sizes/scores. Do not create interview quotes or acceptance percentages. Check current supervisor/ethics status before giving a more specific answer.

## Does ML recommend communities after the questions?

“The trained model supplies priorities for confirmed support topics. Local matching rules combine these priorities with follow-up answers and a tagged community catalog to suggest relevant circles on the summary. The model does not predict community IDs. Browsing a sample preview does not join a group or share answers.”

Study/worry and grief/self-esteem cases produce different suggestions. The thirteen circles are explicitly fictional, with authored starters and no real membership/moderation claims. The existing student forum is a separate publishing action. [Community implementation evidence](../PP1_COMMUNITY_RECOMMENDATIONS.md).

## What do 299 passing tests prove?

“They check implemented software behaviors covered by those tests, such as scoring, routing, user controls and sample-profile guards. They do not prove clinical effectiveness, universal safety, WCAG compliance or production-scale reliability.”

Performance, browser compatibility, actual-laptop loading and participant usability require their own evidence.

## How is privacy handled now?

“Assessment text, reflections and chat stay in temporary page state. Selected mood/screening/activity history can be saved locally only by the student's choice. Appointment notes are an explicit local export. Booking requests and community posts are separate server actions.”

Anyone using the same browser profile may open saved device history. A downloaded file remains until deleted. A confidential assigned-counselor record system is not complete; broad booking-staff access must not be described as private clinical access. Never show passwords/environment files in the presentation.

## Why is English DistilBERT used in a multilingual platform?

“The current text experiment supports English. Translated navigation and a professional's language skills do not validate Sinhala/Tamil ML. The proposal's reviewed translations and language evaluation remain separate work.”

## What are the next improvements?

The plan now reuses saved main-model topic scores, confirmed topics and follow-up answers to rank prepared activities, with explanations and student overrides. This is an ML-informed policy, not a new trained treatment model. See [the plan increment](../PP1_ML_INFORMED_PLAN.md).

“First, reliable actual-laptop demonstration, clear model/generalization evidence and completed requirements traceability. Then booking validation/duplicate protection and model-loading usability. The next research phase needs professional review, independent labels, approved usability work and the scope-confirmed facial/fusion comparison.”

## Who would use or pay for this?

“Students use the check-in and choose support; authorized university support staff handle operational requests. The proposed buyer is university welfare/service management. A license plus setup/support is a proposed model, not a validated sale.”

Discuss measured task completion, staff effort and failed handoffs as pilot measures. Costs include hosting, maintenance, content review and staffing. Do not invent paying customers, market size, price or reduced crises/dropout.

## If asked about AI assistance

“AI tools assisted the implementation, synthetic-data generation, testing and documentation. The training was executed locally and the actual evidence is retained. I can explain the components, choices and limitations, and I remain responsible for the submitted work.”

Follow the institution's disclosure requirements. Do not claim manual authorship of every line or understanding you have not yet developed.

## Final self-check before the presentation

Without reading, explain:

1. The input and output of DistilBERT versus questionnaire scoring.
2. Which layers were frozen and which were trained.
3. Train/development/test separation and why the test set is not used for tuning.
4. The actual v2 augmentation limitation.
5. Precision versus recall, and why exact-set accuracy is lower.
6. How one answer changes the next question.
7. Why topic matching is not a clinical diagnosis or perfect provider match.
8. What remains unfinished from the proposal.

If one answer is difficult, practise that source/explanation before adding any new website feature.
