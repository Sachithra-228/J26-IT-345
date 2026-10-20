# Run the trained C2 models on another laptop

Member 02: D. G. A. Indeepa (IT23273412). Expanded model bundle v2, 20 October 2026.

## Match the source and trained files

The expanded local checkout uses `c2-distilbert-concerns-v2`, a 15-output support-topic classifier. Its matching archive is **`c2-browser-models-v2.zip`**. The separate 28-label `distilbert-pilot-v1` research export is also included, with tokenizers, licensing and browser WASM files. Neither model diagnoses illnesses or predicts emergency risk.

The owner must approve a GitHub push before teammates can pull these latest source changes. Until then, the remote branch still has the earlier implementation. **Do not mix a v1 source checkout with the v2 archive, or the v2 checkout with a v1 archive.** The installer and runtime verify exact model identities.

Trained weights are ignored by normal Git. The previous v1 ZIP and training artifacts remain preserved, but use the new v2 ZIP for the expanded checkout. No public model Release has been approved or published. `c2:models:download` therefore reports that a private ZIP is required; do not expect a public download link to work.

## Setup after the matching source is available

Install Git and Node.js. The transfer tools were checked with Node.js 24.21.0 / npm 11.19.0 on Windows. Windows uses `tar`; macOS/Linux use `unzip`. Allow space for the ZIP, extraction, installed models and npm dependencies.

```powershell
git clone --branch research/c2-wellness https://github.com/Sachithra-228/J26-IT-345.git
cd J26-IT-345
npm ci
npm run c2:models:install -- "D:/Downloads/c2-browser-models-v2.zip"
npm run c2:models:verify
npm run dev
```

For an existing checkout, preserve your own work and update the matching branch instead of cloning over it. Copy the ZIP privately from Anuk's laptop:

`ml/c2/artifacts/model-delivery/v2/c2-browser-models-v2.zip`

Use its actual location in the install command. The installer checks the archive checksum, extracts to a temporary folder, verifies all listed file hashes, and installs only model/tokenizer/runtime files under `public/c2/transformer`. **No retraining or Python installation is needed to run the website.**

The archive contains no environment file, credentials, student answers, database dump or `node_modules`. Configure the team's Firebase/MongoDB environment privately if you need accounts, live directories and booking/forum services. The standalone check-in can use the identical bundled 270-question revision if the database is unavailable.

Open `http://localhost:3000/wellness`, complete the questionnaires, enter an English description and select **Suggest topics**. The first inference loads approximately 268 MB of main model weights into the browser; the text remains on the device. Students using an eventual hosted site need no manual ZIP or Python setup—the deployment must first include the same verified assets. Deployment provisioning is not implemented by transferring this ZIP.

## Reproducible evidence

[The asset manifest](../../ml/c2/browser-assets-manifest.json) records the exact archive size, checksum and model identities. Its prospective Release URL is inactive while `distribution.publicReleasePublished` is false.

`npm run c2:models:verify` confirms file identity, not clinical accuracy. Synthetic evaluation results belong to their recorded experiment. The earlier five-label run must not be presented as the expanded model's results.

Create a new private package from completed exports without replacing an existing archive:

```powershell
python scripts/c2/package-model-assets.py --bundle-version v2 --output ml/c2/artifacts/model-delivery/v2
```

Packaging changes the local asset manifest. Publishing any model weights publicly still requires the owner's explicit approval.
