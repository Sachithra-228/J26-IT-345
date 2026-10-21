# C2 ONNX production build fix

The failed Vercel build reported `static/media/ort.webgpu.bundle.min.7af4de83.mjs from Terser` and `'import.meta' cannot be used outside of module code`. Local development and unit tests did not exercise this production minification path.

Transformers.js imports ONNX Runtime Web, whose self-referencing URL causes Webpack to emit its already-minified ESM runtime as a static asset. Next.js 14.2.35's SWC path in the Terser plugin invokes minification without passing the asset's module option. Parsing the installed runtime with `module: false` reproduces the error; `module: true` succeeds.

`next.config.mjs` now marks only hashed `static/media/ort.*.min.*.mjs` assets as already minimized immediately before the minification stage. This preserves the vendor module's original bytes. Application chunks retain normal production minification. Package versions, weights, runtime settings and training are unchanged.

An initial attempt using ONNX's `onnxruntime-web-use-extern-wasm` condition was insufficient: that entry also emits a self-referencing ESM asset. That configuration was removed before the successful build.

## Verification — 20 October 2026

- Source: commit `3e64425` plus the local `next.config.mjs` fix, exported to a fresh directory to avoid modifying the active development server's build files.
- `npm run build` / Next.js 14.2.35 completed with exit code 0, including lint, TypeScript, page generation and final route output. Existing image and hook warnings remain; they did not fail the build.
- The emitted ONNX module is byte-for-byte identical to the installed vendor module.
- All 22 local trained model, tokenizer and runtime files passed the existing SHA-256 verifier.
- The completed build ran with `next start` on `http://127.0.0.1:3001`.
- Wellness, research, the model manifest, the external WASM JavaScript module and the sample-community API returned HTTP 200.
- In the production browser, the research inspector ran the same `predictConcerns` function used by the main check-in. The existing synthetic exam/workload example produced Study & exam pressure = 0.9999997 and Worry & anxiety = 0.6014980 at threshold 0.25, with checkpoint `45192ec0b5f3b46aac991d5db619e3984333ec313bc9d5a8c3a2967a292f4025`. These are concern scores, not illness probabilities.
- The browser console had no captured warning/error entries after inference. Screenshot: [production-ml-build-fix.png](evidence/production-ml-build-fix.png).

This verifies a local Windows production build and actual browser inference. A new Vercel build has not yet been run. No push or deployment was performed as part of this fix.

## Separate deployment requirement

The local production verification used the privately transferred model assets already installed on this laptop. `public/c2/transformer/` remains ignored by Git. A successful Vercel compilation alone will not install those weights: the hosted site must also have a separately approved model-asset provisioning arrangement. See [RUN_ON_ANOTHER_LAPTOP.md](RUN_ON_ANOTHER_LAPTOP.md).

Reference: [ONNX Runtime Web deployment guidance](https://onnxruntime.ai/docs/tutorials/web/deploy.html).
