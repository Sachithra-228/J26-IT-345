import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CareerGuidanceTool } from "@/components/c3/career-guidance-tool";
import { LanguageProvider } from "@/context/language-context";
import { DEMO_IT_JOBS } from "@/lib/c3/demo-it-jobs";
import { getC3Text } from "@/lib/c3/i18n";
import {
  isOpen,
  JOB_ROLE_MIN_SIMILARITY,
  JOB_ROLE_MARGIN,
  jobFitsRole,
  normaliseJobs,
  recommendJobs,
  recommendWithFallback
} from "@/lib/c3/job-recommend";
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
// the job from the bug report: a QA job that shares SQL / Agile / Git with a Data Analyst student
const QA_TEST = job("qa-test", "QA Engineer Intern (Test)", ["SQL", "Agile", "Git"]);
const DA = job("da", "Data Analyst Intern", ["SQL", "Data analysis with Power BI", "Statistics", "Python"]);
const DA2 = job("da2", "Junior Data Analyst", ["SQL", "Excel reporting", "Data visualisation", "Communication skills"]);

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

  it("ranks by closeness to the role first, then match %, and splits have / missing", () => {
    const ranked = recommendJobs([QA_LOW, QA_HALF, QA_FULL], QA_LEVELS, "qa_engineer", TODAY);
    expect(ranked.map((m) => m.job._id)).toEqual(["qa-half", "qa-full", "qa-low"]);
    expect(ranked.map((m) => m.matchPercent)).toEqual([50, 100, 0]);
    for (let i = 1; i < ranked.length; i++) expect(ranked[i - 1].similarity).toBeGreaterThanOrEqual(ranked[i].similarity);
    expect(ranked.every((m) => m.closestRoleId === "qa_engineer" && m.fitsRole)).toBe(true);
    const half = ranked[0];
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

describe("role fit (the job must fit the selected role, not just share skills)", () => {
  it("uses fixed, named thresholds", () => {
    expect(JOB_ROLE_MIN_SIMILARITY).toBe(0.35);
    expect(JOB_ROLE_MARGIN).toBe(0.1);
    expect(jobFitsRole(["testing_manual", "test_automation"], "qa_engineer").fits).toBe(true);
    expect(jobFitsRole(["testing_manual", "test_automation"], "data_analyst").fits).toBe(false);
  });

  it("does not recommend a QA job for Data Analyst, even at a high match %", () => {
    const daLevels = { databases_sql: 2, agile: 1, version_control: 1, data_analysis: 1 };
    expect(recommendJobs([QA_TEST, QA_HALF, QA_LOW], daLevels, "data_analyst", TODAY)).toEqual([]);
    expect(recommendJobs([QA_TEST], daLevels, "qa_engineer", TODAY)[0].closestRoleId).toBe("qa_engineer");
  });

  it("ranks Data Analyst jobs first for Data Analyst and labels the closest role", () => {
    const ranked = recommendJobs([QA_TEST, QA_FULL, DA2, DA], QA_LEVELS, "data_analyst", TODAY);
    expect(ranked.map((m) => m.job._id)).toEqual(["da", "da2"]);
    expect(ranked.every((m) => m.closestRoleId === "data_analyst")).toBe(true);
  });

  it("never lists a job whose closest role is clearly another role", () => {
    // "QA Intern": QA Engineer 0.63, Data Analyst 0.40 - second closest, but 0.23 below the closest
    expect(recommendJobs([QA_FULL], QA_LEVELS, "data_analyst", TODAY)).toEqual([]);
    // two almost equally close roles both fit: the sample network job (Cybersecurity 0.90, Network 0.87)
    const net = DEMO_IT_JOBS.find((j) => j._id === "c3-demo-net") as JobListing;
    expect(recommendJobs([net], {}, "network_engineer", TODAY)).toHaveLength(1);
    expect(recommendJobs([net], {}, "cybersecurity_analyst", TODAY)).toHaveLength(1);
  });
});

describe("recommendWithFallback", () => {
  it("shows real jobs for the role and no samples when one fits", () => {
    const res = recommendWithFallback([QA_FULL], QA_LEVELS, "qa_engineer", TODAY);
    expect(res.real.map((m) => m.job._id)).toEqual(["qa-full"]);
    expect(res.other).toEqual([]);
    expect(res.demo).toEqual([]);
  });

  it("falls back to jobs for the other suggested roles, each with its closest role", () => {
    const res = recommendWithFallback([QA_HALF, QA_LOW], QA_LEVELS, "data_analyst", TODAY, { otherRoleIds: ["qa_engineer", "business_analyst"] });
    expect(res.real).toEqual([]);
    expect(res.other.map((m) => m.job._id)).toEqual(["qa-half", "qa-low"]);
    expect(res.other.every((m) => m.closestRoleId === "qa_engineer" && m.roleId === "qa_engineer")).toBe(true);
    expect(res.demo).toEqual([]);
  });

  it("uses clearly labelled sample jobs only when no real job fits any of the roles", () => {
    const res = recommendWithFallback([QA_TEST], QA_LEVELS, "data_analyst", TODAY, { otherRoleIds: ["business_analyst"] });
    expect(res.real).toEqual([]);
    expect(res.other).toEqual([]);
    expect(res.demo.length).toBeGreaterThan(0);
    expect(res.demo.every((m) => m.isDemo)).toBe(true);
    expect(res.demo[0].job._id).toBe("c3-demo-da");
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
    for (const r of roles) {
      const demo = recommendWithFallback([], {}, r, TODAY).demo;
      expect(demo.length).toBeGreaterThan(0);
      expect(demo.every((m) => m.fitsRole)).toBe(true);
    }
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
    expect(rows.map((r) => r.querySelector("h4")?.textContent).sort()).toEqual(["Automation Tester", "QA Engineer", "QA Intern"]);
    const first = rows[0];
    expect(first).toHaveTextContent("100% match"); // the example profile has every skill of the first job
    expect(within(first).getByTestId("c3-job-closest")).toHaveTextContent("Closest role: QA Engineer");
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

  it("shows jobs for the other suggested roles when none fits the selected role", async () => {
    const ba = job("ba", "Associate Business Analyst", ["Business analysis and requirements gathering", "Agile / Scrum", "SQL", "Project management"]);
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [ba] }) as unknown as typeof fetch;
    await toResults(); // the example profile selects QA Engineer first
    const card = screen.getByTestId("c3-jobs");
    expect(await within(card).findByTestId("c3-jobs-none")).toHaveTextContent("No open jobs for QA Engineer right now.");
    const other = within(card).getByTestId("c3-jobs-other");
    expect(other).toHaveTextContent(en.jfOtherHeading);
    expect(within(other).getByTestId("c3-job-closest")).toHaveTextContent("Closest role: Business Analyst");
    expect(within(card).queryByTestId("c3-jobs-demo")).not.toBeInTheDocument();
  });

  it("says when no real job fits yet", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [] }) as unknown as typeof fetch;
    await toResults();
    expect(await screen.findByTestId("c3-jobs-none")).toBeInTheDocument();
  });
});
