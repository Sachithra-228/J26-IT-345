# Anuk's C2 ML demonstration for PP1

**Updated focus:** a new synthetic questionnaire/context model is now trained and integrated. Use [the new demonstration guide](PP1_SYNTHETIC_DEMO.md) for that main workflow. This older guide documents the separate GoEmotions text baseline and its initial state.

Prepared for D. G. A. Indeepa, IT23273412, Member 02. Status: 19 October 2026.

## What is actually built

There is a real trained text emotion model, with exported learned weights and a working application connection. It is an auxiliary baseline for C2, not the entire proposed research model.

| Feature | How it works now |
| --- | --- |
| PHQ-9 and GAD-7 | Standard deterministic questionnaire scoring; not trained ML |
| Context follow-up questions | Conditional selection from a fixed question bank |
| Optional reflection analysis | Trained TF-IDF and one-vs-rest logistic regression; 28 emotion labels |
| Professional/community suggestions | Topic and preference rules; not a learned recommender |
| Support chat | Limited local response library; no generative LLM connected |
| Proposed quality-aware combined-input/facial experiment | Still pending; do not present as implemented |

## The training story in plain language

1. **Examples with answers:** GoEmotions supplies public English Reddit comments with human emotion annotations. One comment can have several emotion labels. These are not diagnoses or local student records.
2. **Separate the data:** After duplicate/overlap removal, 42,854 comments train the model, 5,308 development comments select settings, and 5,313 held-out test comments measure the selected model.
3. **Turn words into numbers:** TF-IDF represents single words and pairs of words with up to 5,000 features. Vocabulary and IDF are learned from training text only.
4. **Learn weights:** Twenty-eight regularized logistic classifiers learn which features help predict each emotion label. These learned weights make this ML rather than a keyword response list.
5. **Choose settings without looking at test results:** Two C values and six thresholds are compared using development micro-F1. C=4 and threshold 0.25 win this comparison.
6. **Evaluate:** The selected model has held-out micro-F1 0.5552 and macro-F1 0.4084. A simple training-frequency comparator has micro-F1 0.3054. This does not establish superiority over other trained models.
7. **Use it in the site:** Python exports the vocabulary, IDF, weights, intercepts and threshold. Reflections runs the model in the browser when the user opts in. It does not retrain from a user's journal.

Precision asks how often predicted labels match annotations. Recall asks how many annotated labels are found. F1 balances them. Micro-F1 pools label decisions; macro-F1 gives each emotion equal weight. **Do not call 0.5552 "55.52% diagnostic accuracy."** Some rare labels perform poorly: grief and nervousness have zero recall in this test set.

## A five-minute demonstration

The website demonstration is now at **`/wellness/research`**, accessible using **Research & ML** in the Wellness workspace navigation. It shows the model name, a live text predictor, recorded evaluation, per-emotion results and the actual training/inference source files. Training still runs in Python; the website does not simulate a training run or retrain on submitted text. The commands below are optional supporting demonstrations, not the only way to show the model.

The website increment was verified on 19 October: Wellness navigation reaches the research page, the real exported model produces the expected live scores, and the displayed Python source includes feature fitting, `LogisticRegression`, `model.fit` and the held-out evaluation. Narrow and desktop layouts had no page-width overflow. All 94 C2 tests, project type checking and lint for the three changed application files passed. A credential-free live prediction screenshot is retained at `docs/c2/evidence/ml-website-prediction.png`. The website tests include real learned-weight inference, withheld outputs, stale-result cancellation and a mismatched-version error.

Run from the project folder. The prepared dependency environment must already be installed; the demonstration itself is offline.

```powershell
Set-Location 'D:\NewReaserch\J26-IT-345'
npm.cmd run c2:demo
npm.cmd run c2:demo -- --labels
npm.cmd run c2:demo -- --text "I am happy about finishing my project and grateful for the help."
```

1. Show the split counts and explain the different purpose of each split.
2. Show the baseline and model scores. These are recorded held-out results, not a new test on the invented sentence.
3. Show Python/browser agreement. Twenty-five reference probes check the same exported model calculations; this is software correctness evidence, separate from predictive performance.
4. Show live scores for a new sentence and then an input that is too short or uses an unsupported script. Scores are withheld for unsuitable inputs; the script check is not full language detection.
5. Open the student dashboard, choose **Wellness → Reflections**, enter an invented English sentence, select **Explore possible emotions expressed in my English writing**, and select **Review my reflection**. The site uses the same learned artifact and inference functions as this demonstration.
6. Show **My check-in** separately. Explain that questionnaire screening bands come from questionnaire scoring, not the emotion model. The text model does not determine a disorder, urgency or professional referral.

New sentences have no verified ground truth. Show a prediction without promising a particular result, and explain mismatches. The default examples include successful execution and withheld outputs; they are not a representative accuracy sample. There are no new evaluation claims from these demonstrations.

Verified on 19 October: the default demonstration and `--labels` completed, the Python-reference maximum score difference was 2.397e-9 across 25 probes, and all 89 C2 software tests passed. A separate invented input, "I feel proud that I finished my project and grateful for my friends.", produced no label above threshold (highest score: neutral 0.1644; pride 0.0924). This illustrates why clear-looking sentences can still produce unhelpful outputs. It has no independent annotation and is not a new benchmark measurement. Demonstrate this limitation as well as the default examples. The demo script also passed a strict standalone TypeScript check.

## If the lecturer asks to see training

The training code is `ml/c2/train_text.py`. The prepared Python environment is outside the repository at `D:\NewReaserch\.venv-c2`. Run:

```powershell
& 'D:\NewReaserch\.venv-c2\Scripts\python.exe' ml/c2/train_text.py download
& 'D:\NewReaserch\.venv-c2\Scripts\python.exe' ml/c2/train_text.py train
npm.cmd run c2:test
```

The download stage verifies the cached source hashes when available. The train stage really fits the models, performs development selection, evaluates the frozen test split and replaces generated model/report/reference artifacts. It does not merely display a prepared animation. A repeat run demonstrates reproducibility; do not change settings to chase test performance. The original recorded run took 12.672 seconds after dependencies/data were ready; timing varies.

Raw data is under `ml/c2/data/raw/goemotions/`, ignored by Git. Keep the frozen public splits separate. Do not add invented student cases to the benchmark or treat public emotion labels as clinical labels.

## Evidence to open

| Evidence | Repository path |
| --- | --- |
| Training and data preparation | `ml/c2/train_text.py` |
| Trained learned weights | `src/lib/c2/model/text-model.json` |
| Data provenance, split audit, development trials and per-emotion metrics | `docs/c2/evidence/text-evaluation.json` |
| Same inference used by the website | `src/lib/c2/text-runtime.ts` |
| Python reference comparisons | `tests/unit/c2/text-runtime.test.ts` |
| Scope, source license and limitations | `docs/c2/model-card.md` |

## What to add next, in priority order

1. **Visible research evidence:** Present this reproducible experiment, baseline comparison, per-emotion failures and application integration. A polished dashboard alone cannot establish model quality.
2. **Proposal-aligned combined-input experiment:** Implement the proposed regularized fusion baseline and missing-input/quality handling, starting with documented synthetic scenarios. Separate questionnaire-only, questionnaire-plus-text and optional facial-feature conditions. Keep any simulation results clearly identified in research evidence; synthetic labels cannot establish clinical performance or prove that facial information improves real judgments. No facial-model or fusion result is claimed yet.
3. **Professional review and future study:** Independent professional follow-up labels and an approved local study are required to investigate the proposal's main research question. Show this as planned validation, not completed evidence.
4. **Complete the support workflow:** Confirm professional profile metadata, improve matching evaluation, and implement confidential assigned-counselor access. The present guided chat can be demonstrated as implemented; generative AI would be a separate addition requiring its own evaluation.

## A short explanation to practise

"My current C2 implementation combines questionnaire screening, optional reflection analysis and support navigation. The trained ML component is an English text emotion baseline using TF-IDF and one-vs-rest logistic regression. I used separate public training, development and test partitions, with duplicate checks. The held-out micro-F1 is 0.5552, compared with 0.3054 for a simple frequency baseline. I exported the learned model to the browser and checked its scores against Python. It classifies wording, not mental illness. My proposed combined-input experiment and local professional validation remain future work."

Use "I" only for work you have reviewed, understood and can explain. AI assisted the implementation, training pipeline, tests and documentation; disclose that assistance according to your institution's requirements. Do not claim participant recruitment, professional validation or unaided authorship that did not happen.
