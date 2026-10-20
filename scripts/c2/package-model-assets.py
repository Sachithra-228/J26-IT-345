"""Package completed browser exports for transfer; never retrains a model."""
import argparse
import hashlib
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[2]
TAG = "c2-models-pp1-v1"
NAME = "c2-browser-models-v1.zip"


def digest(path):
    with path.open("rb") as handle:
        return hashlib.file_digest(handle, "sha256").hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "ml/c2/artifacts/model-delivery")
    args = parser.parse_args()
    files = []
    runs = []
    for directory, report_name in [("c2-concerns", "c2-distilbert-concerns-v1-browser-export.json"), ("c2-distilbert", "distilbert-pilot-v1-browser-export.json")]:
        folder = ROOT / "public/c2/transformer" / directory
        report = json.loads((ROOT / "docs/c2/evidence" / report_name).read_text())
        manifest = json.loads((folder / "manifest.json").read_text())
        if manifest["checkpointSha256"] != report["checkpointSha256"] or digest(folder / "onnx/model.onnx") != report["onnxSha256"]:
            raise ValueError("Browser weights do not match completed training evidence")
        runs.append({"directory": directory, "runId": manifest["runId"], "checkpointSha256": manifest["checkpointSha256"]})
        files.extend(folder / name for name in ["ATTRIBUTION.txt", "LICENSE.txt", "config.json", "manifest.json", "tokenizer.json", "tokenizer_config.json", "onnx/model.onnx"])
    runtime = sorted((ROOT / "public/c2/transformer/wasm").glob("ort-wasm*"))
    if not runtime or not any(path.suffix == ".wasm" for path in runtime):
        raise ValueError("Browser runtime files are missing")
    files.extend(runtime)
    rows = [{"path": path.relative_to(ROOT).as_posix(), "bytes": path.stat().st_size, "sha256": digest(path)} for path in sorted(files)]
    args.output.mkdir(parents=True, exist_ok=True)
    archive = args.output / NAME
    if archive.exists():
        raise FileExistsError("Refusing to replace a published bundle; use a new output directory/version")
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6, allowZip64=True) as bundle:
        for row in rows:
            bundle.write(ROOT / row["path"], row["path"])
    result = {"schemaVersion": 1, "releaseTag": TAG, "runs": runs,
              "archive": {"name": NAME, "bytes": archive.stat().st_size, "sha256": digest(archive),
                          "url": f"https://github.com/Sachithra-228/J26-IT-345/releases/download/{TAG}/{NAME}"}, "files": rows}
    (ROOT / "ml/c2/browser-assets-manifest.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"archive": str(archive), "bytes": result["archive"]["bytes"], "sha256": result["archive"]["sha256"], "files": len(rows)}), flush=True)


if __name__ == "__main__":
    main()
