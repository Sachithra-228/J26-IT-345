/**
 * C3 - text of a PDF CV with pdf.js, in the browser. Loaded only when a student picks
 * a PDF, so pdf.js is not part of the normal page bundle. Only the text layer is read:
 * nothing is rendered, no fonts are loaded and no embedded scripts or forms are run.
 *
 * pdf.js runs on the main thread (its worker module is imported, which sets
 * `globalThis.pdfjsWorker`) instead of a separate worker file: Next 14's minifier
 * cannot process the standalone worker asset, and a CV is only a page or two.
 */
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const MAX_PAGES = 10;

export async function pdfText(data: ArrayBuffer): Promise<string> {
  await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
  const task = getDocument({
    data: new Uint8Array(data),
    disableFontFace: true,
    enableXfa: false,
    stopAtErrors: false
  });
  try {
    const pdf = await task.promise;
    const pages: string[] = [];
    for (let n = 1; n <= Math.min(pdf.numPages, MAX_PAGES); n++) {
      const content = await (await pdf.getPage(n)).getTextContent();
      let line = "";
      const lines: string[] = [];
      for (const item of content.items) {
        if (!("str" in item)) continue;
        line += item.str;
        if (item.hasEOL) {
          lines.push(line);
          line = "";
        } else if (item.str && !item.str.endsWith(" ")) {
          line += " ";
        }
      }
      if (line) lines.push(line);
      pages.push(lines.join("\n"));
    }
    return pages.join("\n\n");
  } finally {
    await task.destroy();
  }
}
