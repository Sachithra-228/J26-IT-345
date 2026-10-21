# Expanded C2 support topics: DistilBERT v2

Member 02: D. G. A. Indeepa, IT23273412. Trained locally on 20 October 2026. This increment remains local until the owner explicitly approves a GitHub push. Public publication of model weights is separately unapproved.

## What the website does

The main model is **DistilBERT, fine-tuned for 15 non-diagnostic student support topics**, run `c2-distilbert-concerns-v2`. These are low mood, worry, sleep, study, connection, stress/burnout, panic/sudden fear, relationships/family, grief/loss, self-esteem, anger/difficult emotions, eating/body image, alcohol/substance use, difficult experiences/trauma, and money/housing/practical needs.

The student describes their situation and explicitly requests topic suggestions. The model returns independent topic scores; the student can add, remove or confirm suggestions. Only confirmed and explicitly reported topics guide support matching. These are support needs, not diagnoses of panic disorder, PTSD, an eating disorder or any other illness. PHQ-9 and GAD-7 continue to calculate their own symptom ranges from complete questionnaire answers.

Self-harm is **not** a sixteenth trained label or a risk probability. A separate “I would like support with self-harm or staying safe” choice opens existing immediate-support information without loading ML. The limited English concerning-phrase check can also show that panel; it is not a validated detector and cannot establish safety when it finds nothing. Direct support requests remain visible through follow-ups and results even with low scores, and remain separate from saved device summaries. PHQ-9 item-9 support remains independent. No actions, injuries, methods or event details are requested by the new bank.

## How follow-up questions change

The versioned bank is `c2-adaptive-followups-v2`: **270 original authored questions**, with 15 general questions and 17 per support topic. Ten new topics add 170 questions, including 40 branches tied to specific earlier answers. The previous v1 bank definition is preserved at `ml/c2/data/definitions/followup-bank-v1.json`; database records are isolated by bank version.

DistilBERT ranks topic priorities. Explicit application rules combine confirmed topics, questionnaire responses, prior answers, branch conditions and a 5–9-question budget to choose exact bank questions. The model does not generate questions or predict question IDs. The flow prioritises a subset; selecting many topics does not mean every topic or every bank question is asked. Question IDs/facets cannot repeat, and explicitly dismissed topics are removed.

Example: practical needs → “Housing or accommodation” → an accommodation-support question. Going back and changing the answer to “Money or essential expenses” replaces that branch with a money-support question. A money-related worry answer can introduce practical support even if it was not initially selected.

The new topics also have their own activity options. Eating/substance/trauma activities prepare respectful professional-support conversations; they do not provide diet plans, withdrawal instructions or trauma exposure exercises. The eight fictional profiles have explicitly recorded demonstration support areas for matching. They remain separate from real providers and cannot accept real bookings. Professional review of the authored questions, activities and support guidance is pending.

## Dataset and preprocessing

- 3,000 explicitly synthetic first-person narratives: 1,800 training / 600 development / 600 test.
- 15 independent topic targets; no participant records, clinical outcomes or self-harm target.
- Wording families partitioned before composing examples; no declared family or exact-text overlap between splits.
- Synthetic variation combines zero to four topics, neutral statements and explicit denials of absent topics. This is artificial text variation, not evidence of real-world coverage.
- WordPiece tokenisation using the pinned DistilBERT tokenizer; maximum 128 tokens, dynamic batch padding. Audit maxima: 80 train / 83 development / 81 test; no rows truncated.
- No vocabulary/scaler fitting on test text. The same train/dev/test inputs are used for the TF-IDF logistic baseline.

Generator: `ml/c2/generate_concern_cases_v2.py`. Data: `ml/c2/data/synthetic/concerns-v2/`. The old five-label dataset and checkpoints are preserved separately.

## Actual fine-tuning

Base: `distilbert/distilbert-base-uncased`, revision `12040accade4e8a0f71eabdb258fecc2e7e948be`.

- New 15-output head with sigmoid scores and BCEWithLogitsLoss.
- Six transformer blocks: embeddings and first four blocks frozen; last two blocks plus task head trained with backpropagation.
- 14,777,871 trainable parameters; 66,965,007 total.
- AdamW, backbone learning rate 5e-5, head learning rate 1e-3, batch 16, four epochs, weight decay 0.01, gradient clipping 1.0, 10% warmup and linear decay.
- This run reuses v1's development-selected learning rate. It is one configuration, not a new three-trial learning-rate or augmentation experiment. No token masking in v2. Historical v1 masking results must not be relabelled as v2 evidence.
- Epoch/threshold chosen using development micro-F1, before opening test labels for evaluation: epoch 4, threshold 0.25, development micro-F1 0.694668.
- Weight audit: 68 frozen backbone tensors unchanged; all 32 trainable backbone tensors changed; four newly trained head tensors.

## Measured results

Held-out synthetic topic-label agreement, 600 examples:

| Method | Micro precision | Micro recall | Micro-F1 | Macro-F1 | Exact label-set accuracy |
| --- | ---: | ---: | ---: | ---: | ---: |
| DistilBERT v2, dev-selected threshold 0.25 | 0.718793 | 0.887384 | 0.794240 | 0.797407 | 0.401667 |
| Same-data TF-IDF + logistic baseline | 0.484642 | 0.360711 | 0.413592 | 0.394397 | 0.133333 |

These are not diagnostic accuracy or illness probabilities. The expanded 15-label test is different from v1's five-label test, so comparing their headline F1 values is not a controlled improvement comparison.

The final epoch's train loss is 0.006299 versus validation loss 0.247484. The large train/validation gap remains a generalisation concern, not something to hide behind the held-out F1. Curves use fixed threshold 0.5; final metrics use development-selected 0.25. A separate 22-case developer-authored challenge set (not used for selection) has micro-F1 0.842105 and exact match 0.727273; inspect its recorded failures too. No independent professional annotations, participant study, local-language evaluation or clinical validation has been completed.

## Browser artifact and delivery

Checkpoint SHA-256: `45192ec0b5f3b46aac991d5db619e3984333ec313bc9d5a8c3a2967a292f4025`.

FP32 ONNX SHA-256: `dcc8e5a5f0938db61d07d709f725b8878a724c18b7752c313a6d84c4f0bf69c7`. Size: 267,972,969 bytes. Maximum native/ONNX probe score difference: 0.000001215. All 600 held-out export decisions/metrics matched native inference. That conversion check does not establish clinical generalisation.

An additional full export audit compared all 9,000 held-out scores (600 rows × 15 labels), with **zero different decisions** and maximum difference 0.000005603 between native batch-16 and ONNX batch-1 inference. The actual browser's displayed 15 scores for a saved probe matched within 0.000000517 and suggested grief plus self-esteem.

The main inference code validates the checkpoint identity and all 15 outputs. The Research & ML page displays the current run's own labels, metrics and curves. The separate earlier public-comment emotion classifier and structured support model remain clearly labelled experiments.

The matching private transfer bundle is `ml/c2/artifacts/model-delivery/v2/c2-browser-models-v2.zip`. No model weights are in normal Git. Use the v2 source and v2 ZIP together; no retraining is required on another laptop. See [transfer instructions](RUN_ON_ANOTHER_LAPTOP.md). No public Release or production deployment is implied.

Archive: 515,821,517 bytes, SHA-256 `ab4a8495f847361977dd1e2bf1002da6085e1b6573bd2b4d37dc2473664dc0c5`. A clean-folder installation and the source checkout both verified all 22 model/tokenizer/runtime files.

## Website verification and an observed failure

All 275 C2 tests passed across 17 suites. TypeScript and ESLint passed. After the last safety-summary wording change, the four affected suites passed again (75 tests). Two async UI tests initially timed out while CPU training was competing for resources; they passed after training finished, without increasing test timeouts.

The live database/API served all 270 questions with an exact revision match. Browser checks covered the separate safety choice, changing a housing answer to a money answer and replacing its branch, the new model's self-esteem suggestion leading to a self-esteem entry/conditional question, and the resulting balanced-self-talk activity.

One invented browser example, “Since my brother died, I have felt alone and I keep telling myself that I am not good enough”, suggested self-esteem but **missed grief and connection**. That wording failure is preserved in the verification report, not hidden or used to tune this completed run. A clearer saved parity probe suggested grief and self-esteem correctly. These examples demonstrate inference/routing and the need for student correction; they do not prove natural-language or clinical accuracy.

## Evidence and reproducibility

- [Training evaluation and every epoch](evidence/c2-distilbert-concerns-v2-evaluation.json)
- [Dataset/weight audit](evidence/c2-distilbert-concerns-v2-audit.json)
- [Illustrative challenge results, including errors](evidence/c2-distilbert-concerns-v2-challenge.json)
- [Browser export parity](evidence/c2-distilbert-concerns-v2-browser-export.json)
- [All-row numerical and decision parity](evidence/c2-distilbert-concerns-v2-full-export-parity.json)
- [Actual browser checks and recorded failure](evidence/c2-distilbert-concerns-v2-browser-verification.json)
- [Question bank](../../src/lib/c2/followup-bank.json), [reproducible bank expansion](../../scripts/c2/expand-followup-bank.py), [routing rules](../../src/lib/c2/concern-routing.ts)
- Primary support-topic references: [NHS self-help guides](https://selfhelp.cntw.nhs.uk/) and [NHS feelings and symptoms](https://www.nhs.uk/mental-health/feelings-symptoms-behaviours/feelings-and-symptoms/). New questions are original support prompts, not copied or validated clinical scales.

Run the v2 `c2:concerns:data`, `c2:concerns:train`, `c2:concerns:audit` and `c2:concerns:export` npm scripts with the research Python environment active. Training refuses to overwrite an existing run; use a new documented run ID for a new experiment. Database setup: `npm run c2:followups:seed`, then `npm run c2:followups:verify`. Seeding v2 verified 270 public question records and changed no student responses.
