/**
 * C3 - read the text of an uploaded CV file ON THE STUDENT'S DEVICE.
 *
 * Supports PDF (pdf.js, loaded only when a PDF is chosen), Word .docx (the XML
 * inside the zip) and plain text. The file is never uploaded: the text it yields is
 * put in the CV box, where the student can check it, and then goes through the same
 * PII stripping and skill extraction as pasted text. Scanned (image-only) PDFs have
 * no text layer and are reported as empty - OCR is out of scope.
 */
import JSZip from "jszip";
import { MAX_CV_CHARS } from "./validation";

export const MAX_CV_FILE_BYTES = 5 * 1024 * 1024;
export const CV_FILE_ACCEPT =
  ".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";

export type CvFileKind = "pdf" | "docx" | "txt";
export type CvFileErrorCode = "type" | "size" | "empty" | "read";

export class CvFileError extends Error {
  constructor(public code: CvFileErrorCode) {
    super(`CV file: ${code}`);
  }
}

export type CvFileText = { kind: CvFileKind; text: string; truncated: boolean };

export function cvFileKind(file: Pick<File, "name" | "type">): CvFileKind | null {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") return "pdf";
  if (name.endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
  if (name.endsWith(".txt") || file.type === "text/plain") return "txt";
  return null;
}

function readAs(file: Blob, mode: "text" | "buffer"): Promise<string | ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string | ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    if (mode === "text") reader.readAsText(file);
    else reader.readAsArrayBuffer(file);
  });
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decodeXml(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** Text of a .docx body: one line per paragraph, tabs and line breaks kept. */
export async function docxText(data: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(data);
  const doc = zip.file("word/document.xml");
  if (!doc) throw new CvFileError("read");
  const xml = await doc.async("string");
  const body = xml
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<w:br\/>|<w:cr\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<\/w:tc>/g, "\t")
    .replace(/<[^>]+>/g, "");
  return decodeXml(body);
}

function tidy(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Reads a CV file in the browser and returns its text (at most MAX_CV_CHARS characters). */
export async function readCvFile(file: File): Promise<CvFileText> {
  const kind = cvFileKind(file);
  if (!kind) throw new CvFileError("type");
  if (file.size > MAX_CV_FILE_BYTES) throw new CvFileError("size");
  let raw: string;
  try {
    if (kind === "txt") raw = (await readAs(file, "text")) as string;
    else {
      const data = (await readAs(file, "buffer")) as ArrayBuffer;
      if (kind === "docx") raw = await docxText(data);
      else raw = await (await import("./cv-pdf")).pdfText(data);
    }
  } catch (e) {
    throw e instanceof CvFileError ? e : new CvFileError("read");
  }
  const text = tidy(raw);
  if (!text) throw new CvFileError("empty");
  return { kind, text: text.slice(0, MAX_CV_CHARS), truncated: text.length > MAX_CV_CHARS };
}
