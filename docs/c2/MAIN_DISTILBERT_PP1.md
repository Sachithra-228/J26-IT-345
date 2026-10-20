# Main DistilBERT model: PP1 explanation and demonstration

Completed training and local integration: 20 October 2026. Member 02: D. G. A. Indeepa, IT23273412.

## What is now the main model?

**DistilBERT, fine-tuned for five student concern topics**, run `c2-distilbert-concerns-v1`. It predicts low mood, worry, sleep, study pressure and connection from a short English narrative. A student can confirm, remove or add any topic before it affects follow-ups or support matching. It is a separately trained task head, not a new name for the earlier logistic router or the GoEmotions emotion classifier.

The model is active in the main student dashboard Wellness section and the standalone `/wellness` page. The Research & ML page displays this model's own actual measurements and source code; earlier experiments remain separately labelled in expandable panels.

## Explain the pipeline

1. The student completes PHQ-9 and GAD-7. Standard calculations provide the symptom scores/ranges; missing answers never count as zero.
2. The student optionally writes their situation and explicitly requests DistilBERT analysis. Text and predictions stay in temporary browser memory.
3. DistilBERT produces five independent concern-label scores. These uncalibrated scores are not illness probabilities.
4. The student confirms/corrects the topics. DistilBERT scores rank the five concern areas. The website loads a versioned bank of 100 custom support questions from MongoDB and asks 5–9 in total. Each answer can change the next choice through explicit topic, branch and screening-priority rules. DistilBERT is not trained to predict an individual question ID.
5. The summary explains the actual questionnaire ranges, confirmed topics, reported impact/duration and the student's preferred support. It records why each question was asked.
6. Confirmed/reported topics reach professional matching and community filters. Directory metadata and student preferences determine profile matches. The eight demo professionals are synthetic and cannot receive real appointment requests.

The follow-through increment adds **My plan**, seven guided activities, optional **Progress** stored on the browser and a student-selected appointment-note download. Confirmed topics/context guide authored plan rules; no new model is trained by these views. Device history saves only selected summary metadata, mood ratings and completions. Full behavior and the PP1 walkthrough are in [the next-steps increment](PP1_NEXT_STEPS_INCREMENT.md).

The model is an encoder classifier. Explanations use bounded templates filled with actual results; it is not a generative therapist or a trained prediction of professional treatment outcomes. The earlier structured logistic classifier remains an independent research replay and is no longer the main assessment's model.

The 100 questions are assistant-authored for support context, not a validated clinical scale. Fifteen cover general context and 17 cover each of the five concern areas. Conditional branches can ask about details raised by an earlier answer; repeated IDs and facets are excluded. They await professional review. The question bank does not change PHQ-9 or GAD-7 scores, and the resulting summary describes screening ranges rather than diagnoses.

## Data and preprocessing

- 1,500 explicitly synthetic narratives: 900 training, 300 development/validation, 300 held-out test.
- Concern labels describe what the first-person narrative reports. Multiple labels and empty-label cases are allowed. No patient records, participant recruitment or clinical diagnoses are involved.
- Clause/denial wording families were assigned to partitions before composition. Audits verify file hashes, exact-text separation and no declared family overlap. Shared topic vocabulary and artificial composition remain limitations.
- Seeded generation, explicit IDs and all label counts are in `ml/c2/data/synthetic/concerns/manifest.json`. All raw generated narrative rows are available as JSONL in that folder.
- WordPiece tokenization, dynamic padding, maximum 128 tokens, with negation retained. Audit maximum lengths: train 67, development 68, test 71. No generated row was truncated. The browser rejects over-length descriptions rather than silently removing their ending.
- A separately composed 20-case synthetic challenge set tests mixed concerns, irrelevant material, recovery, negation and third-person accounts. It was not used to fit/select the model or threshold. It has not received independent professional annotation review.

## What was fine-tuned?

Base: `distilbert/distilbert-base-uncased`, revision `12040accade4e8a0f71eabdb258fecc2e7e948be`. Six transformer blocks; embeddings and the first four blocks remain frozen. The last two blocks and a newly initialized five-output classification head were trained with real backpropagation.

- Total parameters: 66,957,317.
- Trainable parameters: 14,770,181.
- Saved-weight audit: all 68 frozen backbone tensors exactly match the pretrained base; all 32 trainable backbone tensors changed. The classifier has four new head tensors.
- Loss: binary cross-entropy with logits; sigmoid enables multiple concerns at once.
- Optimizer: AdamW, weight decay 0.01, gradient clipping 1.0, 10% warmup and linear learning-rate decay.
- Batch size 16; four epochs per trial; CPU training took 21.7 minutes.

Show `ml/c2/train_concerns.py` for the optimizer, `loss.backward()`, gradient clipping, checkpoint saving and development-only selection. The reusable frozen-layer setup is in `ml/c2/train_distilbert.py::build_model`.

## Tuned settings and augmentation

Three real trials were run: backbone learning rate 2e-5, rate 5e-5, and rate 5e-5 with 5% training-only token masking. The head rate was 1e-3. Masking protects special tokens and a small list of negation-related tokens, but is not guaranteed to preserve meaning. Validation/test text was not augmented.

Selected by development micro-F1: **lr-5e-5, epoch 4, threshold 0.25**. Best development micro-F1 was 0.6567. Shared thresholds were compared on development data only. Selection was written to `selection-locked.json` before test inference.

The matched-rate masking trial did not improve its best validation micro-F1 over original text. This is a single-seed ablation and does not establish a general conclusion about augmentation.

## Actual measured results

| Held-out synthetic metric | DistilBERT | Same-data TF-IDF + logistic |
|---|---:|---:|
| Micro precision | 0.7213 | 0.4865 |
| Micro recall | 0.8942 | 0.6998 |
| Micro-F1 | 0.7985 | 0.5740 |
| Macro-F1 | 0.8082 | 0.5679 |
| Exact label-set match | 0.4767 | 0.1700 |

At the selected epoch, fixed-threshold-0.5 train loss is 0.00218, validation loss 1.07749, train exact match 1.0000, and validation exact match 0.2567. Curves on the website show all four epochs of that trial. This exposes substantial overfitting; do not hide it behind the training accuracy or confuse it with final threshold-0.25 test evaluation.

Connection precision is only 0.555 and sleep precision 0.597. The 20-case illustrative challenge micro-F1 is 0.8182, exact set match 0.6000. False positives occur for recovery, third-person and irrelevant text; a negated mood statement can still trigger a mood topic. These are recorded failures, not corrected scores. Student confirmation is essential.

Synthetic test performance is not a measure of clinical accuracy, local language/cultural validity or real student outcomes. Different synthetic wording families also produce different validation/test difficulty. New independent data and professional review are future work.

## Browser and website evidence

The selected weights are exported without retraining to FP32 ONNX, 267.9 MB. Native exported test decisions/metrics match Python. Ten actual predictions in the student dashboard match reference token IDs and scores within 0.00001; observed maximum browser score error is 0.0000009954. These ten probes verify implementation parity, not predictive accuracy.

The browser downloads model/runtime files from this site only when requested. No description is sent to a prediction API or added to training data. Long model downloads, browser memory requirements and model errors remain practical limitations. Manual topics, standard screening and access to support remain available if the model cannot run.

## PP1 demonstration

Open the student dashboard's **Wellness** section. Select **Start my check-in**, complete the questionnaires with clearly identified demonstration values, enter an English description and select **Suggest topics**. Review the suggested topics, correct one where appropriate and select **Use these topics**. Complete the context questions, show the explanation and select **Find support**. Show the sample directory's preference filters and match reasons. Sample profiles remain clearly labelled and cannot receive bookings; **View university professionals** opens the appointment directory. Show relevant community topic filters without publishing a post. Return to **Overview** to show the actual questionnaire ranges and confirmed support topics from this session.

An invented example used for software verification has PHQ-9 12/27 and GAD-7 11/21. Its text mentions a project, sleep and worry. DistilBERT suggested study/sleep but missed worry; the demonstration explicitly adds worry before continuing. This illustrates a real correction rather than presenting the model as infallible.

Then open **About & privacy → Research & ML** to show the training/validation curves, all trial epochs, per-topic precision/recall/F1 and training source. Model internals and numeric prediction inspection belong in that research page, separate from the student check-in. Explain the distinction between learned predictions and application rules.

## Files to show and reproduce

Website screenshots: [main topic confirmation](evidence/main-distilbert-topics.png), [personalised explanation](evidence/main-distilbert-summary.png), [filtered professional match](evidence/main-distilbert-professional-match.png), [training evidence page](evidence/main-distilbert-research.png).

- [Training](../../ml/c2/train_concerns.py), [synthetic generation](../../ml/c2/generate_concern_cases.py), [saved-weight/data audit](../../ml/c2/audit_concerns.py), [browser export](../../ml/c2/export_concerns.py).
- [Completed evaluation](evidence/c2-distilbert-concerns-v1-evaluation.json), [audit](evidence/c2-distilbert-concerns-v1-audit.json), [challenge including failures](evidence/c2-distilbert-concerns-v1-challenge.json), [export](evidence/c2-distilbert-concerns-v1-browser-export.json), [actual dashboard prediction comparison](evidence/c2-distilbert-concerns-v1-browser-verification.json).
- [Main browser inference](../../src/lib/c2/concern-runtime.ts), [question routing and explanation](../../src/lib/c2/concern-routing.ts), [main assessment](../../src/components/c2/wellness-assessment.tsx).
- [Versioned 100-question bank](../../src/lib/c2/followup-bank.json), [database read route](../../src/app/api/c2/follow-up-questions/route.ts), [idempotent seed script](../../scripts/c2/seed-followup-questions.cjs). Run `npm run c2:followups:seed` with the project database configured, then `npm run c2:followups:verify`; the latter confirmed 100 records in `c2_followup_questions` on 20 October 2026. The website uses the identical bundled revision if the database is temporarily unavailable and labels the source in each assessment.

Use the prepared `D:/NewReaserch/.venv-c2-distilbert/Scripts/python.exe` environment for the training commands in `ml/c2/README.md`. An existing run ID is protected against overwrite. Large checkpoints and browser model assets are ignored by Git: a source push alone does not install them on another host. The branch includes source, synthetic data and measured evaluation evidence. To run the exact trained browser exports on another laptop without retraining, use `npm run c2:models:download`, then `npm run c2:models:verify`; [transfer/setup instructions](RUN_ON_ANOTHER_LAPTOP.md) cover the Release and offline ZIP. Acknowledge AI assistance in code/data preparation in accordance with your institution's requirements.
