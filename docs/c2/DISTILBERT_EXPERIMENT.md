# DistilBERT experiment: implementation and PP1 explanation

Owner: D. G. A. Indeepa, IT23273412. Prepared 19 October 2026 with AI assistance.

This is a new experiment alongside the working classical models. A script, downloaded base checkpoint or successful gradient smoke test does **not** mean final fine-tuning/evaluation has completed. A completed run must have `evaluation.json`, a selected saved checkpoint and recorded test metrics. Do not copy the older model's numbers into this experiment.

## Completed pilot: 19 October 2026

Run `distilbert-pilot-v1` completed all three candidates, three epochs each, on CPU in 2,306 seconds (about 38.4 minutes, excluding environment setup/base download). Actual unique comments: 3,000 training, 1,000 development and 5,313 held-out test. The selected candidate used backbone learning rate **0.00005**, head rate **0.0005**, epoch **3**, and output threshold **0.25**, without token masking.

| Held-out metric | Fine-tuned DistilBERT | Equal-data TF-IDF/logistic comparator |
| --- | ---: | ---: |
| Micro precision | 0.5326 | 0.4335 |
| Micro recall | 0.5398 | 0.5040 |
| Micro-F1 | 0.5362 | 0.4661 |
| Macro-F1 | 0.3272 | 0.2794 |
| Entire-label-set exact match | 0.3674 | 0.2897 |
| Label-wise accuracy | 0.9610 | 0.9518 |

Do not describe label-wise accuracy as “96% accurate at understanding students.” Most individual labels are absent, which makes that measure high. Precision asks how many predicted labels were correct; recall asks how many actual labels were found; F1 balances the two. Micro-F1 pools all label decisions, while macro-F1 gives each emotion equal weight. No significance test or general superiority claim is made.

The earlier **full-data** TF-IDF model's micro-F1 of 0.5552 uses 42,854 training comments and is a separate comparison. This pilot does not establish that DistilBERT beats that full-data system. Its equal-data comparison refits logistic regression on the same 3,000 training comments.

At matched backbone rate 0.00002, the best validation micro-F1 was 0.5119 without masking and 0.5045 with masking (difference -0.0074). Augmentation did not help in this single-seed pilot. We preserve the result rather than choosing a masked model simply to claim augmentation was useful.

For the selected trial's epoch 3, training/validation BCE loss was **0.08316 / 0.09986**, and training/validation exact match at the fixed plotting threshold 0.5 was **39.87% / 35.10%**. Final test exact match above uses the separately selected threshold 0.25. Explain this threshold difference when presenting the curves.

The saved-weight audit found **68 frozen backbone tensors exactly unchanged**, **32 fine-tuned backbone tensors changed**, and four classification-head tensors in the saved checkpoint. There are **14,787,868 trainable parameters** out of **66,975,004** total parameters. This verifies actual pretrained-layer fine-tuning. No benchmark comment exceeded the 96-token cap; the maximum measured token lengths were 51 training, 44 development and 55 test, including special tokens.

Embarrassment, grief, nervousness, pride, realization and relief have zero test recall at the chosen threshold. This is a material weakness, not hidden by the overall F1. All per-emotion counts are available in the evaluation and website.

Evidence: [evaluation](evidence/distilbert-pilot-v1-evaluation.json), [split/weight/token-length audit](evidence/distilbert-pilot-v1-audit.json), and [initial gradient setup check](evidence/distilbert-gradient-audit.json). The browser conversion has its own report and must be checked separately.

The FP32 ONNX graph differs from PyTorch by at most 0.0000004173 in the ten software probes. Integer compression experiments exposed desktop/browser score differences; the PP1 browser export therefore retains full precision. Its first model download is **268.0 MB**, a material deployment limitation. Training weights, model selection and threshold 0.25 remain unchanged. The conversion report measures the deployed graph with one comment per inference; all reported held-out metrics match the Python checkpoint, including micro-F1 **0.5362**. This remains an auxiliary emotion experiment, not a clinical tool. See [conversion report](evidence/distilbert-pilot-v1-browser-export.json).

## Purpose and proposal alignment

Fine-tune `distilbert/distilbert-base-uncased` to classify multiple emotions expressed in one English comment. The older Member02 proposal names DistilBERT/RoBERTa for conversational text; the detailed individual proposal includes a candidate transformer text branch. MobileNetV2 belongs to the optional facial branch, which is a separate, unimplemented experiment.

Dataset: the already downloaded, hash-verified Google Research GoEmotions release. It supplies human emotion annotations, not pretrained task weights or depression/anxiety diagnoses. No invented questionnaire rows, live MongoDB records, student journals or images enter this experiment. Existing 1,500 synthetic questionnaire cases belong to the separate support-routing experiment.

Sources: [base model and license](https://huggingface.co/distilbert/distilbert-base-uncased), [official training guide](https://huggingface.co/docs/transformers/tasks/sequence_classification), [dataset](https://github.com/google-research/google-research/tree/master/goemotions).

## What is trained

The base checkpoint contains pretrained English representations. A new 28-output classification head is initialized for this task. Embeddings and the first four of six transformer blocks are frozen by default. The final two transformer blocks and the classification head receive gradient updates from our training labels. This is **partial fine-tuning**, not training DistilBERT from scratch and not merely downloading an emotion classifier. The benchmark verifies that a pretrained block actually changes while the embeddings remain frozen.

Architecture: WordPiece IDs → word/position embeddings → six attention blocks (12 heads, hidden size 768) → first-token representation → 768-unit dense layer and ReLU → dropout 0.2 → 28 logits → sigmoid scores. The initial load report's newly initialized classification-head weights are expected: our downstream training learns those weights. The earlier blocks retain their pretrained values.

The 28 labels are 27 emotions plus neutral. Multiple labels can be true for a comment, so training uses sigmoid outputs and binary cross-entropy with logits, rather than a mutually exclusive softmax classifier.

## Data preparation

1. Verify all cached dataset file hashes against the pinned source manifest.
2. Preserve official training/development/test partitions; remove empty entries and merge normalized-token duplicates within each partition, unioning labels within that partition only. Remove cross-partition overlaps in training > development > test order. This reuses the classical baseline's documented preparation so the comparison is consistent.
3. Keep the original comment wording for WordPiece tokenization; preserve negation. The uncased tokenizer handles casing. Truncate to the recorded maximum length (initially 96 tokens) and dynamically pad each batch. Record this truncation choice as a limitation.
4. A pilot can use uniform seeded training/development subsets, chosen before fitting. `--train-rows 0 --dev-rows 0` uses the complete cleaned splits. The final cleaned test split is always complete. The protocol stores counts, IDs hashes and label supports. No author-level separation or absence of all semantic duplicates is claimed.
5. Fit the TF-IDF comparator again on exactly the selected training subset; select its parameters on exactly the selected development subset. The older full-data baseline is not used as a supposedly equal-data comparator.

## Augmentation

Primary trials use original labeled text. Image flipping/rotation is inappropriate for text. Dropout is model regularization, not extra independent training cases.

`--mask-ablation` adds a third candidate that randomly masks 5% of eligible WordPiece tokens during training. It excludes padding/special tokens and token IDs in a small English negation list. It does not change validation/test text. This is an experimental robustness augmentation, **not a guarantee that meaning or the label is preserved**: an emotion word could be masked. Its effect must be judged on development results; it can be worse. Report the ablation separately rather than claiming augmentation always improves accuracy. Do not call this masked-language-model pretraining: our optimization target remains emotion classification.

## Settings and selection

| Setting | Initial protocol |
| --- | --- |
| Backbone learning-rate candidates | 0.00002 and 0.00005 |
| New head learning rate | 0.0005 |
| Optimizer | AdamW |
| Weight decay | 0.01 |
| Maximum epochs | 3 |
| Batch size | 16, subject to the measured hardware benchmark |
| Maximum input length | 96 tokens |
| Fine-tuned backbone | Final 2 of 6 blocks |
| Gradient clipping | Norm 1.0 |
| Schedule | Linear decay with 10% warmup |
| Decision threshold candidates | 0.15, 0.20, 0.25, 0.30, 0.40, 0.50 |
| Selection metric | Development micro-F1 |
| Early stopping | 2 epochs without improvement for a candidate |
| Random seed | 23273412 |

Learning rates and shared output threshold are compared. Epoch/checkpoint is selected. Batch size, sequence length, frozen blocks and other fixed settings are **configured**, not automatically described as tuned. Model parameters are the learned tensors; hyperparameters are the experiment settings. Save the initial protocol before any training and do not choose settings against the test results.

## Evidence to show

- The actual `loss.backward()`, optimizer update, frozen-layer setup and saved model in `ml/c2/train_distilbert.py`.
- Actual per-epoch training/validation loss, measured over each entire selected partition in evaluation mode after each epoch. These are not invented or interpolated curves.
- Training/validation exact-match accuracy at a fixed threshold of 0.5 for comparable curves. Exact match requires the whole label set to match. Label-wise accuracy is also recorded but may look high because most labels are absent; show F1 alongside it.
- Development threshold comparisons, selected checkpoint and selected hyperparameters.
- Test micro/macro precision, recall and F1, exact-match and label-wise accuracy; per-label support and scores; one 2x2 confusion matrix per emotion. A single multiclass confusion matrix is inappropriate for this multilabel task.
- Same-subset TF-IDF baseline results, including any result where it beats the transformer. No improvement is guaranteed.
- Saved `.safetensors` checkpoint, tokenizer, checkpoint hash, source revision, environment versions, elapsed time and known failures. Full checkpoints stay ignored locally because of size.

No clinical prediction, Sinhala/Tamil validation, trained generative chat, facial model, independent counselor labels or learned treatment-outcome matching is established by these metrics. This text experiment must not drive clinical urgency or automatic referrals.

## Run from the repository root

Use the separate environment so existing support models remain reproducible:

```powershell
& 'D:\NewReaserch\.venv-c2-distilbert\Scripts\python.exe' -m pip install -r ml/c2/requirements-distilbert.txt
& 'D:\NewReaserch\.venv-c2-distilbert\Scripts\python.exe' ml/c2/train_distilbert.py benchmark
```

After measuring runtime, start a recorded pilot (counts below are explicit, not full-data training):

```powershell
& 'D:\NewReaserch\.venv-c2-distilbert\Scripts\python.exe' ml/c2/train_distilbert.py train --run-id distilbert-pilot-v1 --train-rows 3000 --dev-rows 1000 --mask-ablation
```

Full data, when suitable hardware/time is available:

```powershell
& 'D:\NewReaserch\.venv-c2-distilbert\Scripts\python.exe' ml/c2/train_distilbert.py train --run-id distilbert-full-v1 --train-rows 0 --dev-rows 0 --mask-ablation
```

An existing run ID cannot be overwritten. Protocol, history and checkpoints are under `ml/c2/artifacts/distilbert/<run-id>/`. Only a successfully completed evaluation is copied to `docs/c2/evidence/<run-id>-evaluation.json`. A gradient benchmark deliberately does not open the test partition and is not a final trained classifier.

The website now displays measured training results and runs the exported DistilBERT checkpoint in a dedicated live panel. The existing classical models remain separately identified. Browser checks passed for all ten software probes: exact token IDs and all 28 scores agreed with the FP32 reference within 0.00001 (maximum error 0.0000007486). These invented probes verify software parity, not generalization or clinical accuracy. See [actual browser checks](evidence/distilbert-browser-verification.json).

## Browser export and live demonstration

After the final training/evaluation completes:

```powershell
& 'D:\NewReaserch\.venv-c2-distilbert\Scripts\python.exe' ml/c2/export_distilbert.py --run-id distilbert-pilot-v1
```

The exporter verifies the selected checkpoint hash and converts it to full-precision ONNX. This is deployment conversion, not augmentation, fine-tuning or another training run. It checks the graph against PyTorch and measures it over the complete cleaned test split with one comment per inference at the already selected threshold. It does not tune using these test results. Ten invented software probes supply exact tokenizer IDs and reference scores for browser checks, including negation, curly apostrophes and accented English words. Earlier integer conversions failed portability checks; they are excluded from the final browser runtime.

Public runtime assets go into git-ignored `public/c2/transformer/`. Model and tokenizer files plus WebAssembly runtime files are served from this site. `@huggingface/transformers` loads the exported checkpoint only when prediction is requested; remote model loading is disabled. Browser inference uses one WebAssembly thread so it does not require changes to the site's cross-origin isolation or Firebase sign-in behavior.

The new `/wellness/research` section distinguishes the fine-tuned transformer, the earlier TF-IDF text baseline and the synthetic questionnaire model. It exposes actual training curves, settings, development comparisons, per-label test metrics and source code. Live transformer inference is enabled only when a completed evaluation and matching export manifest are present. Entered text stays in browser memory; it is not sent to a prediction API, database or training process.

Large model files stay local and are not included in a normal Git push. Another computer needs to rerun/export the experiment or receive the verified trained artifact through an appropriate artifact channel. A deployed checkout without these assets can display committed recorded results but cannot run the live transformer. Recheck deployment and browser inference independently before presenting that environment.

## Demonstrate at PP1

Open `http://localhost:3000/wellness/research` on this computer. Show the preprocessing and layer settings, the actual three-epoch learning curves, the three-trial augmentation comparison, and the held-out precision/recall/F1 table. Expand the training-code panel to show freezing, backpropagation and checkpoint saving. Finally enter an English example in the live DistilBERT panel and explain its emotion scores. Allow for the first 268 MB model load before presenting.

Explain the distinction clearly: this DistilBERT experiment learns **text emotion labels** from human-annotated public comments. The separately trained structured model uses synthetic questionnaire/context cases to demonstrate adaptive follow-up and support recommendations. Neither establishes clinical diagnosis. Do not describe public comments as student patient records or the synthetic cases as collected participants.

The [software verification summary](evidence/distilbert-software-verification.json) records the 739 passing regression tests, targeted transformer checks, TypeScript/lint checks and actual browser parity evidence. Screenshots: [live prediction](evidence/distilbert-live-prediction.png), [learning curves](evidence/distilbert-learning-curves.png). Changes and large model assets are currently local; no new push or production deployment was performed for this experiment.
