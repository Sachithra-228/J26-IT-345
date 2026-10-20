import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import evaluation from "../../../../docs/c2/evidence/text-evaluation.json";
import { WellnessModelLab } from "@/components/c2/wellness-model-lab";
import supportReport from "../../../../docs/c2/evidence/support-evaluation.json";
import { WellnessSupportLab } from "@/components/c2/wellness-support-lab";
import { WellnessTransformerLab } from "@/components/c2/wellness-transformer-lab";
import {
  validateTransformerReport,
  type TransformerReport,
} from "@/lib/c2/transformer-evidence";
import {
  validateConcernReport,
  WellnessConcernLab,
  type ConcernReport,
} from "@/components/c2/wellness-concern-lab";
import concernIdentity from "@/lib/c2/model/concern-identity.json";

export const dynamic = "force-static";
export const runtime = "nodejs";
export const metadata = { title: "C2 Research & ML | UniCare Connect" };

export default async function WellnessResearchPage() {
  let concernReport: ConcernReport | null = null;
  try {
    concernReport = validateConcernReport(
      JSON.parse(
        await readFile(
          join(
            process.cwd(),
            `docs/c2/evidence/${concernIdentity.runId}-evaluation.json`,
          ),
          "utf8",
        ),
      ),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const concernTraining = await readFile(
    join(process.cwd(), "ml/c2/train_concerns.py"),
    "utf8",
  );
  let transformerReport: TransformerReport | null = null;
  let transformerBrowserReady = false;
  let transformerBrowserInfo: { bytes: number; microF1: number } | undefined;
  try {
    const bytes = await readFile(
      join(
        process.cwd(),
        "docs/c2/evidence/distilbert-pilot-v1-evaluation.json",
      ),
      "utf8",
    );
    transformerReport = validateTransformerReport(JSON.parse(bytes));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  if (transformerReport) {
    try {
      const manifest = JSON.parse(
        await readFile(
          join(
            process.cwd(),
            "public/c2/transformer/c2-distilbert/manifest.json",
          ),
          "utf8",
        ),
      );
      transformerBrowserReady =
        manifest.schemaVersion === 1 &&
        manifest.dtype === "fp32" &&
        manifest.checkpointSha256 === transformerReport.checkpointSha256 &&
        Number.isFinite(manifest.browserTest?.micro?.f1);
      if (transformerBrowserReady)
        transformerBrowserInfo = {
          bytes: manifest.onnxBytes,
          microF1: manifest.browserTest.micro.f1,
        };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  const transformerTraining = await readFile(
    join(process.cwd(), "ml/c2/train_distilbert.py"),
    "utf8",
  );
  // Only these public project sources are exposed. No path input or environment files.
  const [
    trainingCode,
    inferenceCode,
    model,
    supportTraining,
    generator,
    supportRuntime,
    supportBytes,
  ] = await Promise.all([
    readFile(join(process.cwd(), "ml/c2/train_text.py"), "utf8"),
    readFile(join(process.cwd(), "src/lib/c2/text-runtime.ts"), "utf8"),
    readFile(join(process.cwd(), "src/lib/c2/model/text-model.json")),
    readFile(join(process.cwd(), "ml/c2/train_support.py"), "utf8"),
    readFile(join(process.cwd(), "ml/c2/generate_support_cases.py"), "utf8"),
    readFile(join(process.cwd(), "src/lib/c2/support-runtime.ts"), "utf8"),
    readFile(join(process.cwd(), "src/lib/c2/model/support-model.json")),
  ]);
  if (
    createHash("sha256").update(supportBytes).digest("hex") !==
    supportReport.modelSha256
  ) {
    throw new Error(
      "C2 support model does not match its recorded evaluation. Regenerate matching evidence before presenting results.",
    );
  }
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:py-12">
      <WellnessConcernLab report={concernReport} code={concernTraining} />
      <details className="rounded-3xl border border-slate-200 p-5 dark:border-slate-700">
        <summary className="cursor-pointer text-lg font-semibold">
          Earlier experiment: DistilBERT public-comment emotions
        </summary>
        <div className="mt-6">
          <WellnessTransformerLab
            report={transformerReport}
            trainingCode={transformerTraining}
            browserReady={transformerBrowserReady}
            browserInfo={transformerBrowserInfo}
          />
        </div>
      </details>
      <details className="rounded-3xl border border-slate-200 p-5 dark:border-slate-700">
        <summary className="cursor-pointer text-lg font-semibold">
          Earlier experiment: synthetic structured support and logistic topic
          router
        </summary>
        <div className="mt-6">
          <WellnessSupportLab
            report={supportReport}
            trainingCode={supportTraining}
            generatorCode={generator}
            inferenceCode={supportRuntime}
          />
        </div>
      </details>
      <details className="rounded-3xl border border-slate-200 p-5 dark:border-slate-700">
        <summary className="cursor-pointer text-lg font-semibold">
          Separate experiment: English text emotion model
        </summary>
        <div className="mt-6">
          <WellnessModelLab
            evaluation={evaluation}
            trainingCode={trainingCode}
            inferenceCode={inferenceCode}
            modelHash={createHash("sha256").update(model).digest("hex")}
          />
        </div>
      </details>
    </div>
  );
}
