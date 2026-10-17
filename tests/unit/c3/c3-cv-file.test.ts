import JSZip from "jszip";
import { CvFileError, cvFileKind, MAX_CV_FILE_BYTES, readCvFile } from "@/lib/c3/cv-file";
import { extractSkills } from "@/lib/c3/extract";
import { MAX_CV_CHARS } from "@/lib/c3/validation";

// pdf.js needs a real browser; its wrapper is tested in the browser and mocked here.
jest.mock("@/lib/c3/cv-pdf", () => ({
  pdfText: jest.fn(async () => "Test Student\nSkills\nJava, Spring Boot, MySQL\n\n\n\nWorked with Docker")
}));

async function docx(paragraphs: string[]): Promise<File> {
  const zip = new JSZip();
  const body = paragraphs.map((p) => `<w:p><w:r><w:t xml:space="preserve">${p}</w:t></w:r></w:p>`).join("");
  zip.file("word/document.xml", `<?xml version="1.0"?><w:document><w:body>${body}</w:body></w:document>`);
  const data = await zip.generateAsync({ type: "uint8array" });
  return new File([data], "cv.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

const codeOf = async (p: Promise<unknown>) => {
  try {
    await p;
    return "ok";
  } catch (e) {
    return e instanceof CvFileError ? e.code : String(e);
  }
};

describe("CV file reading (on-device)", () => {
  it("recognises PDF, Word and text files by name or type", () => {
    expect(cvFileKind({ name: "CV.PDF", type: "" })).toBe("pdf");
    expect(cvFileKind({ name: "cv", type: "application/pdf" })).toBe("pdf");
    expect(cvFileKind({ name: "cv.docx", type: "" })).toBe("docx");
    expect(cvFileKind({ name: "cv.txt", type: "" })).toBe("txt");
    expect(cvFileKind({ name: "cv.doc", type: "application/msword" })).toBeNull();
    expect(cvFileKind({ name: "photo.png", type: "image/png" })).toBeNull();
  });

  it("reads a text file", async () => {
    const r = await readCvFile(new File(["Skills: Java, SQL\r\n\r\n\r\n\r\nGit  "], "cv.txt", { type: "text/plain" }));
    expect(r).toEqual({ kind: "txt", text: "Skills: Java, SQL\n\nGit", truncated: false });
  });

  it("reads the paragraphs of a Word .docx and decodes XML entities", async () => {
    const r = await readCvFile(await docx(["Kamal Perera", "Skills: Java &amp; Spring Boot, MySQL", "Selenium &lt;automation&gt;"]));
    expect(r.kind).toBe("docx");
    expect(r.text).toBe("Kamal Perera\nSkills: Java & Spring Boot, MySQL\nSelenium <automation>");
    expect(extractSkills(r.text).skills.map((s) => s.skillId)).toEqual(expect.arrayContaining(["prog_oop", "databases_sql", "test_automation"]));
  });

  it("reads a PDF through pdf.js, loaded only for PDFs", async () => {
    const r = await readCvFile(new File([new Uint8Array([37, 80, 68, 70])], "cv.pdf", { type: "application/pdf" }));
    expect(r.kind).toBe("pdf");
    expect(r.text).toBe("Test Student\nSkills\nJava, Spring Boot, MySQL\n\nWorked with Docker");
  });

  it("keeps at most MAX_CV_CHARS characters and says so", async () => {
    const r = await readCvFile(new File(["x".repeat(MAX_CV_CHARS + 50)], "cv.txt", { type: "text/plain" }));
    expect(r.text.length).toBe(MAX_CV_CHARS);
    expect(r.truncated).toBe(true);
  });

  it("refuses other file types, large files, empty files and broken files", async () => {
    expect(await codeOf(readCvFile(new File(["x"], "cv.doc", { type: "application/msword" })))).toBe("type");
    expect(await codeOf(readCvFile(new File([new Uint8Array(MAX_CV_FILE_BYTES + 1)], "cv.txt", { type: "text/plain" })))).toBe("size");
    expect(await codeOf(readCvFile(new File(["  \n\n "], "cv.txt", { type: "text/plain" })))).toBe("empty");
    expect(await codeOf(readCvFile(new File(["not a zip"], "cv.docx")))).toBe("read");
  });
});
