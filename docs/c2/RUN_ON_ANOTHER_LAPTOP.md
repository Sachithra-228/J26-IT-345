# Run the trained C2 models on another laptop

Member 02: D. G. A. Indeepa (IT23273412). Bundle v1, 20 October 2026.

## What is on GitHub?

The `research/c2-wellness` branch contains training code, synthetic data, model identities, evaluation reports and website code. The [C2 model Release](https://github.com/Sachithra-228/J26-IT-345/releases/tag/c2-models-pp1-v1) contains the actual trained browser weights. Its ZIP is 515,792,350 bytes (about 492 MiB).

Two trained exports are included: the main five-topic `c2-distilbert-concerns-v1` model and the separate 28-label `distilbert-pilot-v1` research experiment. Tokenizers, licensing/attribution and browser WASM runtime are included. The unused quantized pilot graph is excluded. No retraining or Python installation is required to run the website. Original Python training checkpoints remain local; these browser graphs carry the same learned weights, exported for inference.

C3's main `career-model.json` is 30,207 bytes; C2's main ONNX neural graph is 267,942,207 bytes. GitHub blocks ordinary Git files over 100 MiB, so Release assets distribute the larger models without adding them to Git history. See [GitHub's large-file guidance](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github).

## Online setup

Install Git and Node.js first. The transfer tools were checked with Node.js 24.21.0 / npm 11.19.0 on Windows. Windows uses its built-in `tar`; macOS/Linux need `unzip` for extraction. Allow at least 2 GB of free storage for download, extraction and installation, plus project dependencies.

Run in PowerShell or a terminal:

```powershell
git clone --branch research/c2-wellness https://github.com/Sachithra-228/J26-IT-345.git
cd J26-IT-345
npm ci
npm run c2:models:download
npm run c2:models:verify
```

If your friend already has this branch checked out, preserve/commit any local work and pull the branch instead of cloning over an existing project.

The download command verifies the ZIP SHA-256, extracts it to a temporary folder, verifies all 22 files, then installs only those model/runtime files under `public/c2/transformer`. It does not retrain, edit database records or install credentials.

For the same authenticated university site, configure `.env.local` using the team's private configuration on that laptop. Keep it out of Git and the model archive. The model downloader does not configure Firebase or MongoDB. The standalone `/wellness` check-in also works without a database using the identical bundled question bank; university login, live directories and forum/booking services require their configuration and network access.

Start the site:

```powershell
npm run dev
```

Open `http://localhost:3000/wellness`. Complete the questionnaire, enter an English example, click **Suggest topics**, review the suggestions and continue. An actual model result confirms inference; the page loading alone does not. **About & privacy → Research & ML** shows the separately recorded training/validation measurements and experiments.

## Offline model transfer

Copy the original `c2-browser-models-v1.zip` to a USB drive or another private transfer location. On Anuk's laptop the archive is at `ml/c2/artifacts/model-delivery/c2-browser-models-v1.zip`. This ZIP contains no `.env.local`, passwords, student answers, database dump or `node_modules`.

After checking out the source and installing npm dependencies on the other laptop:

```powershell
npm run c2:models:install -- "D:/Downloads/c2-browser-models-v1.zip"
npm run c2:models:verify
npm run dev
```

Use the actual path where the ZIP was copied. The trained inference files need no external AI service once installed. Account/database services still need their own connectivity.

## Verify the exact experiment

The committed [asset manifest](../../ml/c2/browser-assets-manifest.json) records every file size and SHA-256, both checkpoint identities, the download URL and the archive checksum:

`3b64da47e46814a838769c2e69c9fb544b81a02ccdfa16b4f91462a26aee491a`

`npm run c2:models:verify` fails if any required file is missing or differs. It verifies file identity, not predictive accuracy. Synthetic metrics remain engineering results, with no clinical diagnostic validation. Standard PHQ-9/GAD-7 scoring is separate from the concern classifier.

## Packaging evidence

The package script checks ONNX hashes against completed export reports before creating the ZIP. A clean-folder offline installation was tested on 20 October 2026 and all 22 installed files matched their original SHA-256. Recreate a delivery package from completed local exports with `python scripts/c2/package-model-assets.py --output <new-empty-output-folder>`; do not replace published assets or silently change a version. New weights require new evidence and a new bundle/release version.
