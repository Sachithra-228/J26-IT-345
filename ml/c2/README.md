# C2 reproducible text training

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

Outputs:

- `src/lib/c2/model/text-model.json`: portable learned model.
- `src/lib/c2/model/text-status.json`: small interface summary.
- `docs/c2/evidence/text-evaluation.json`: source hashes, partition audit, selected settings, all development trials, per-label metrics, baseline and environment.
- `tests/fixtures/c2/text-parity.json`: Python reference probes for TypeScript inference.

Public source data and documentation are cached under git-ignored `ml/c2/data/raw/goemotions/`. Never put student health records or private journals in tracked directories. See `docs/c2/model-card.md` for attribution, permissions, limits and measured results.

The interfaces are `/wellness` and the student dashboard's Wellness section. Questionnaire answers, reflections and guided chat stay in temporary page memory. The separate application includes PHQ-9/GAD-7 scoring and context follow-ups; these do not come from the text classifier. Combined-input modeling, camera work and confidential assigned-counselor referral remain pending. See [the application report](../../docs/c2/reports/assessment-increment.md) for current status and verification.
