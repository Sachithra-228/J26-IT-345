import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CareerGuidanceTool } from "@/components/c3/career-guidance-tool";
import { LanguageProvider } from "@/context/language-context";
import { DEMO_IT_JOBS } from "@/lib/c3/demo-it-jobs";
import { getC3Text } from "@/lib/c3/i18n";
import { isOpen, MIN_REAL_MATCHES, normaliseJobs, recommendJobs, recommendWithFallback } from "@/lib/c3/job-recommend";
import { demoJobs } from "@/lib/demo-data";
import type { JobListing } from "@/types";

const en = getC3Text("en");
const TODAY = new Date(2026, 9, 18);
const QA_LEVELS = { testing_manual: 2, communication: 2, databases_sql: 1 };

/** All jobs here are FICTIONAL. */
const job = (id: string, title: string, requirements: string[], applicationDeadline = "2026-12-31"): JobListing => ({
  _id: id,
  title,
  company: "Fictional Labs",
  location: "Colombo",
  salary: "-",
  type: "internship",
  requirements,
  applicationDeadline,
  contactEmail: "jobs@example.com"
});

const QA_FULL = job("qa-full", "QA Intern", ["Manual testing and test cases", "SQL", "Communication skills"]);
const QA_HALF = job("qa-half", "QA Engineer", ["Manual testing", "Test automation with Selenium", "SQL", "Agile"]);
const QA_LOW = job("qa-low", "Automation Tester", ["Test automation with Selenium", "Agile", "Git", "Python"]);

describe("recommendJobs", () => {
  it("skips closed jobs; a missing or invalid deadline counts as open", () => {
    expect(isOpen(job("a", "x", [], "2026-10-17"), TODAY)).toBe(false);
    expect(isOpen(job("b", "x", [], "2026-10-18"), TODAY)).toBe(true);
    expect(isOpen(job("c", "x", [], ""), TODAY)).toBe(true);
    expect(isOpen(job("d", "x", [], "soon"), TODAY)).toBe(true);
    const closed = { ...QA_FULL, _id: "closed", applicationDeadline: "2026-01-01" };
    expect(recommendJobs([closed, QA_FULL], QA_LEVELS, "qa_engineer", TODAY).map((m) => m.job._id)).toEqual(["qa-full"]);
  });

  it("skips jobs that name fewer than two taxonomy skills", () => {
    const vague = job("vague", "Intern", ["Weekend availability", "Portfolio link"]);
    const one = job("one", "QA Intern", ["Manual testing"]);
    expect(recommendJobs([vague, one], QA_LEVELS, "qa_engineer", TODAY)).toEqual([]);
  });

  it("skips jobs that are not close to the selected role", () => {
    const design = job("ux", "UI/UX Designer Intern", ["UI/UX design with Figma", "Wireframing", "HTML and CSS"]);
    expect(recommendJobs([design], QA_LEVELS, "network_engineer", TODAY)).toEqual([]);
    expect(recommendJobs([design], QA_LEVELS, "ui_ux_designer", TODAY)).toHaveLength(1);
  });

  it("ranks by match %, then closeness to the role, then title, and splits have / missing", () => {
    const ranked = recommendJobs([QA_LOW, QA_HALF, QA_FULL], QA_LEVELS, "qa_engineer", TODAY);
    expect(ranked.map((m) => m.job._id)).toEqual(["qa-full", "qa-half", "qa-low"]);
    expect(ranked.map((m) => m.matchPercent)).toEqual([100, 50, 0]);
    const half = ranked[1];
    expect(half.haveSkills.map((s) => s.skillId).sort()).toEqual(["databases_sql", "testing_manual"]);
    expect(half.missingSkills.map((s) => s.skillId).sort()).toEqual(["agile", "test_automation"]);
    expect(half.missingSkills.every((s) => s.nextAction !== null)).toBe(true);
    expect(ranked.every((m) => !m.isDemo)).toBe(true);
    expect(recommendJobs([QA_LOW, QA_HALF, QA_FULL], QA_LEVELS, "qa_engineer", TODAY, 2)).toHaveLength(2);
  });

  it("gives the same output for the same input", () => {
    const a = recommendJobs([QA_HALF, QA_LOW, QA_FULL], QA_LEVELS, "qa_engineer", TODAY);
    const b = recommendJobs([QA_FULL, QA_LOW, QA_HALF], QA_LEVELS, "qa_engineer", TODAY);
    expect(a).toEqual(b);
  });
});

describe("recommendWithFallback", () => {
  it("adds sample jobs only when fewer than three real jobs fit, in a separate list", () => {
    expect(MIN_REAL_MATCHES).toBe(3);
    const three = recommendWithFallback([QA_FULL, QA_HALF, QA_LOW], QA_LEVELS, "qa_engineer", TODAY);
    expect(three.real).toHaveLength(3);
    expect(three.demo).toEqual([]);
    const one = recommendWithFallback([QA_FULL], QA_LEVELS, "qa_engineer", TODAY);
    expect(one.real.map((m) => m.job._id)).toEqual(["qa-full"]);
    expect(one.demo.length).toBeGreaterThan(0);
    expect(one.demo.every((m) => m.isDemo)).toBe(true);
    expect(one.demo.map((m) => m.job._id)).toContain("c3-demo-qa");
  });

  it("treats the platform's built-in demo jobs as samples, never as real", () => {
    const platform = demoJobs.map((j) => ({ ...j, applicationDeadline: "2026-12-31", requirements: ["React", "JavaScript", "Git"] }));
    const res = recommendWithFallback(platform, {}, "frontend_engineer", TODAY);
    expect(res.real).toEqual([]);
    expect(res.demo.some((m) => m.job._id === "j2")).toBe(true);
  });

  it("every sample job is fictional and fits its own role", () => {
    for (const j of DEMO_IT_JOBS) {
      expect(j.company).toMatch(/^Demo /);
      expect(j.contactEmail).toMatch(/@example\.com$/);
    }
    const roles = ["qa_engineer", "software_engineer", "frontend_engineer", "data_analyst", "business_analyst", "network_engineer", "ui_ux_designer", "devops_engineer"];
    for (const r of roles) expect(recommendWithFallback([], {}, r, TODAY).demo.length).toBeGreaterThan(0);
  });

  it("normalises the API response and ignores malformed items", () => {
    expect(normaliseJobs({ error: "Unauthorized" })).toEqual([]);
    const out = normaliseJobs([{ _id: 7, title: "QA Intern", requirements: ["SQL", 3] }, { position: "no title" }, null]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ _id: "7", title: "QA Intern", requirements: ["SQL"], applicationDeadline: "", company: "" });
  });
});

describe("Jobs that fit you (UI)", () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  async function toResults() {
    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <CareerGuidanceTool />
      </LanguageProvider>
    );
    await user.click(screen.getByRole("button", { name: en.loadExample }));
    await user.click(screen.getByRole("button", { name: en.analyse }));
    expect(global.fetch).not.toHaveBeenCalled(); // nothing is requested before the button is pressed
    await user.click(within(screen.getByTestId("c3-jobs")).getByRole("button", { name: en.jfShow }));
    return user;
  }

  it("shows loading, then real jobs first and no samples when three real jobs fit", async () => {
    const jobs = [QA_FULL, QA_HALF, QA_LOW];
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => jobs }) as unknown as typeof fetch;
    await toResults();
    const card = screen.getByTestId("c3-jobs");
    expect(global.fetch).toHaveBeenCalledWith("/api/jobs");
    await waitFor(() => expect(within(card).getAllByTestId("c3-job")).toHaveLength(3));
    expect(within(card).queryByTestId("c3-jobs-demo")).not.toBeInTheDocument();
    const rows = within(card).getAllByTestId("c3-job");
    expect(rows.map((r) => r.querySelector("p")?.textContent).sort()).toEqual(["Automation Tester", "QA Engineer", "QA Intern"]);
    const first = rows[0];
    expect(first).toHaveTextContent("100% match"); // the example profile has every skill of the first job
    expect(within(first).getByRole("link", { name: /Open in the job board/ })).toHaveAttribute("href", "/dashboard/student#career");
  });

  it("shows the error message and clearly labelled sample jobs when the job board fails", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) }) as unknown as typeof fetch;
    await toResults();
    const card = screen.getByTestId("c3-jobs");
    expect(await within(card).findByTestId("c3-jobs-error")).toHaveTextContent(en.jfError);
    const demo = within(card).getByTestId("c3-jobs-demo");
    expect(demo).toHaveTextContent(en.jfDemoHeading);
    expect(within(demo).getAllByTestId("c3-job-demo-badge").length).toBeGreaterThan(0);
    expect(within(demo).queryByRole("link")).not.toBeInTheDocument();
  });

  it("says when no real job fits yet", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [] }) as unknown as typeof fetch;
    await toResults();
    expect(await screen.findByTestId("c3-jobs-none")).toBeInTheDocument();
  });
});
