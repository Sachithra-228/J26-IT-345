# C2 reproducible text training

## New synthetic questionnaire/context experiment

The earlier structured-data model is documented in [the support model card](../../docs/c2/support-model-card.md). It uses 1,500 synthetic structured cases (900 train / 300 development / 300 test), fits logistic regression and Random Forest, selects the support model before test evaluation, and fits a separate learned topic router. No pretrained support model is used. Run `generate_support_cases.py`, then `train_support.py`, then `test_support.py` with the prepared Python environment described below. Its replay remains under `/wellness/research`; the main check-in now uses the separate DistilBERT concern flow described at the end of this README. Synthetic labels are not medical diagnoses or professional judgments.

## Existing public-text experiment

This directory contains the first new C2 ML experiment, implemented from scratch in the current repository. It trains on public English emotion annotations. It does not train a clinical or referral model.

Use Python 3.12 and the pinned dependencies in `requirements.txt`. A fresh environment can be created with `python -m venv .venv-c2`, followed by `.venv-c2\Scripts\python.exe -m pip install -r ml/c2/requirements.txt` on Windows.

Run from the repository root:

```powershell
.venv-c2\Scripts\python.exe ml/c2/train_text.py download
.venv-c2\Scripts\python.exe ml/c2/train_text.py train
npm run c2:test
```

For the environment already prepared on Anuk's computer, the Python executable is `D:/NewReaserch/.venv-c2/Scripts/python.exe`. Use that executable in place of `.venv-c2\Scripts\python.exe`.

The download stage pins a Google Research Git revision and records SHA-256 hashes. Later calls verify the cached files. To intentionally change the dataset release, use a separately archived dataset directory and record the change; do not silently replace a frozen evaluation set.

The training stage fits training-only preprocessing, chooses settings on development data, and evaluates the test division after selection. A rerun repeats the same frozen protocol; it is not an opportunity to tune against test results.

For an offline lecture demonstration using the same learned artifact and inference functions as the website, run `npm run c2:demo`. Add `-- --labels` for per-emotion test metrics or `-- --text "Your English sentence"` for a new input. This command does not train or save inputs. See [the PP1 walkthrough](../../docs/c2/PP1_ML_DEMO.md) for the explanation, evidence and remaining proposal work.

Outputs:

- `src/lib/c2/model/text-model.json`: portable learned model.
- `src/lib/c2/model/text-status.json`: small interface summary.
- `docs/c2/evidence/text-evaluation.json`: source hashes, partition audit, selected settings, all development trials, per-label metrics, baseline and environment.
- `tests/fixtures/c2/text-parity.json`: Python reference probes for TypeScript inference.

Public source data and documentation are cached under git-ignored `ml/c2/data/raw/goemotions/`. Never put student health records or private journals in tracked directories. See `docs/c2/model-card.md` for attribution, permissions, limits and measured results.

The interfaces are `/wellness`, the student dashboard's Wellness section and `/wellness/research`. Questionnaire answers, reflections and guided chat stay in temporary page memory. The application includes PHQ-9/GAD-7 scoring and a database-backed bank of 270 custom support questions. The expanded DistilBERT classifier ranks 15 support topics; explicit application rules choose 5–9 questions and respond to earlier answers. Self-harm support is a separate direct-disclosure route. The classifier does not predict question IDs, emergency risk or diagnoses. Proposed text/camera multimodal fusion and confidential assigned-counselor referral remain pending. See [the v2 model explanation](../../docs/c2/PP1_EXPANDED_TOPICS.md) and [the separate support model card](../../docs/c2/support-model-card.md).

## DistilBERT fine-tuning experiment

The separate neural experiment is documented in `docs/c2/DISTILBERT_EXPERIMENT.md`.
Use `requirements-distilbert-lock.txt` in a separate Python environment. Run
`train_distilbert.py benchmark` to verify actual pretrained-layer gradient updates,
then `train_distilbert.py train` to record a named experiment. A benchmark alone
is not a completed fine-tuning experiment. `export_distilbert.py` converts only a
completed, matching checkpoint to a browser model and measures conversion effects.
Existing classical and synthetic-support artifacts are preserved.
# Main student check-in: DistilBERT concern classifier

The main check-in now has a dedicated concern-analysis flow: standard PHQ-9/GAD-7 answers, optional English narrative, DistilBERT topic suggestions, student confirmation, adaptive fixed-bank questions, an explained summary and topic/preference matching. The neural concern run is separate from the GoEmotions emotion experiment and earlier synthetic structured logistic models.

Run these commands with the existing `.venv-c2-distilbert` Python environment activated (or use its full interpreter path):

```powershell
python ml/c2/generate_concern_cases_v2.py
python ml/c2/train_concerns.py --run-id c2-distilbert-concerns-v2 --data-dir ml/c2/data/synthetic/concerns-v2 --selected-rate-only --epochs 4
python ml/c2/audit_concerns.py --run-id c2-distilbert-concerns-v2 --data-dir ml/c2/data/synthetic/concerns-v2
python ml/c2/export_concerns.py --run-id c2-distilbert-concerns-v2 --data-dir ml/c2/data/synthetic/concerns-v2
```

V2 generation creates 3,000 explicitly synthetic narrative cases (1,800/600/600) under `ml/c2/data/synthetic/concerns-v2/`. Wording families are partitioned before composition. Clinical labels and real participant records are absent. V1's five-label data and completed artifacts are preserved separately. Training refuses to overwrite an existing run ID. Do not regenerate data behind a completed report without documenting a new experiment.

The exporter creates the `c2-concerns` browser artifact and writes its checkpoint identity after native parity and held-out export checks pass. Large model/runtime assets remain ignored by Git. Use the matching private offline ZIP; no public model Release has been approved or published. See [setup on another laptop](../../docs/c2/RUN_ON_ANOTHER_LAPTOP.md) for installation and separate account/database configuration.

Current reports use `docs/c2/evidence/c2-distilbert-concerns-v2-*.json`; historical v1 reports remain alongside them. The public-comment emotion model's measurements must not be reused as concern-model performance. Student confirmations and preference filters remain in control; this classifier does not diagnose conditions or learn treatment outcomes.
