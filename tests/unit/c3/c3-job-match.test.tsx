import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PartTimeJobBoardFull } from "@/components/career/part-time-job-board-full";
import { CareerGuidanceTool } from "@/components/c3/career-guidance-tool";
import { LanguageProvider } from "@/context/language-context";
import { getC3Text } from "@/lib/c3/i18n";
import {
  JOB_MATCH_KEY,
  JOB_MATCH_MAX_AGE_MS,
  clearJobMatchContext,
  readJobMatchContext,
  saveJobMatchContext
} from "@/lib/c3/job-match-context";
import { annotateJob, bestMatchOrder } from "@/lib/c3/job-recommend";
import { careerModel } from "@/lib/c3/model";
import { demoJobs } from "@/lib/demo-data";
import type { JobListing } from "@/types";

const en = getC3Text("en");
const QA = { testing_manual: 2, communication: 2, databases_sql: 1 };

/** All jobs here are FICTIONAL. */
const job = (id: string, title: string, requirements: string[], extra: Partial<JobListing> = {}): JobListing => ({
  _id: id,
  title,
  company: `Company ${id}`,
  location: "Colombo",
  salary: "-",
  type: "internship",
  requirements,
  applicationDeadline: "2026-12-31",
  contactEmail: "jobs@example.com",
  ...extra
});

const VAGUE = job("vague", "Office Helper", ["Weekend availability"]);
const QA_HALF = job("qa-half", "QA Engineer", ["Manual testing", "Test automation with Selenium", "SQL", "Agile"]);
const QA_FULL = job("qa-full", "QA Intern", ["Manual testing and test cases", "SQL", "Communication skills"]);
// a feed job: requirements are empty and the "deadline" is its (past) publication date
const FEED = job("remotive-1", "Senior QA Automation Engineer - Selenium, SQL", [], { source: "Remotive", applicationDeadline: "2026-09-01", externalUrl: "https://remotive.example/1" });
const PLATFORM_DEMO = { ...demoJobs[1], requirements: ["React", "JavaScript", "Git"] };
const DA = job("da", "Data Analyst Intern", ["SQL", "Data analysis with Power BI", "Statistics", "Python"]);

function mockBoard(local: JobListing[], feed: JobListing[]) {
  global.fetch = jest.fn((url: string) =>
    Promise.resolve({ ok: true, json: async () => (url === "/api/jobs/feed" ? feed : local) })
  ) as unknown as typeof fetch;
}

const renderBoard = () =>
  render(
    <LanguageProvider>
      <PartTimeJobBoardFull />
    </LanguageProvider>
  );

const titlesIn = (el: HTMLElement) => within(el).getAllByRole("heading", { level: 4 }).map((h) => h.textContent);

const realFetch = global.fetch;
afterEach(() => {
  window.sessionStorage.clear();
  global.fetch = realFetch;
});

describe("job match context (sessionStorage)", () => {
  it("saves and reads only known roles and skills, with the model version", () => {
    expect(saveJobMatchContext("qa_engineer", { ...QA, docker: 0 } as never, 1000)).toBe(false); // unknown skill id
    expect(saveJobMatchContext("astronaut", QA, 1000)).toBe(false);
    expect(saveJobMatchContext("qa_engineer", QA, 1000)).toBe(true);
    expect(readJobMatchContext(2000)).toEqual({ roleId: "qa_engineer", levels: QA, modelVersion: careerModel.version, savedAt: 1000 });
    clearJobMatchContext();
    expect(readJobMatchContext(2000)).toBeNull();
  });

  it("ignores and removes a context that is too old, from another model or invalid", () => {
    saveJobMatchContext("qa_engineer", QA, 0);
    expect(readJobMatchContext(JOB_MATCH_MAX_AGE_MS + 1)).toBeNull();
    expect(window.sessionStorage.getItem(JOB_MATCH_KEY)).toBeNull();
    for (const bad of [
      "{not json",
      JSON.stringify({ roleId: "qa_engineer", levels: QA, modelVersion: "old-model", savedAt: 0 }),
      JSON.stringify({ roleId: "qa_engineer", levels: { testing_manual: 9 }, modelVersion: careerModel.version, savedAt: 0 }),
      JSON.stringify({ roleId: "qa_engineer", levels: QA, modelVersion: careerModel.version, savedAt: 10 })
    ]) {
      window.sessionStorage.setItem(JOB_MATCH_KEY, bad);
      expect(readJobMatchContext(5)).toBeNull(); // the last one is "from the future"
    }
  });

  it("works when storage throws", () => {
    const spy = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(saveJobMatchContext("qa_engineer", QA)).toBe(false);
    spy.mockRestore();
  });
});

describe("annotateJob / bestMatchOrder (never removes a job)", () => {
  it("scores feed jobs despite a past date and keeps unscored jobs", () => {
    expect(annotateJob(FEED, QA, "qa_engineer")?.matchPercent).toBeGreaterThan(0);
    expect(annotateJob(VAGUE, QA, "qa_engineer")).toBeNull();
    const jobs = [VAGUE, PLATFORM_DEMO, QA_HALF, FEED, QA_FULL];
    const scores = new Map(jobs.map((j) => [j._id, annotateJob(j, QA, "qa_engineer")]));
    const ordered = bestMatchOrder(jobs, scores).map((j) => j._id);
    expect(ordered).toHaveLength(jobs.length);
    expect(ordered[0]).toBe("qa-half"); // closest to QA Engineer (role fit before match %)
    expect(ordered.indexOf("vague")).toBeGreaterThan(ordered.indexOf("remotive-1"));
    expect(ordered[ordered.length - 1]).toBe(PLATFORM_DEMO._id); // demo jobs after every real job
  });
});

describe("Career job board", () => {
  it("is unchanged without a C3 context", async () => {
    mockBoard([VAGUE, QA_HALF, QA_FULL], [FEED]);
    renderBoard();
    await screen.findAllByText("QA Intern");
    expect(screen.queryByTestId("c3-jm-banner")).not.toBeInTheDocument();
    expect(screen.queryByTestId("c3-jm-sort")).not.toBeInTheDocument();
    expect(screen.queryByTestId("c3-jm-badge")).not.toBeInTheDocument();
    expect(screen.queryByTestId("c3-jm-samples")).not.toBeInTheDocument();
    const list = screen.getAllByRole("article");
    expect(list.map((a) => within(a).getByRole("heading", { level: 4 }).textContent)).toEqual([
      "Office Helper",
      "QA Engineer",
      "QA Intern",
      FEED.title
    ]);
  });

  it("with a context: banner, best match by default, badges, demo marking, real jobs first", async () => {
    saveJobMatchContext("qa_engineer", QA);
    mockBoard([PLATFORM_DEMO, VAGUE, QA_HALF, DA, QA_FULL], [FEED]);
    const user = userEvent.setup();
    renderBoard();
    expect(await screen.findByTestId("c3-jm-banner")).toHaveTextContent("Showing jobs matched to your QA Engineer result");
    expect(screen.getByTestId("c3-jm-sort")).toHaveValue("best");
    const articles = await screen.findAllByRole("article");
    const titles = articles.map((a) => within(a).getByRole("heading", { level: 4 }).textContent);
    expect(titles[0]).toBe("QA Engineer"); // closest to QA Engineer first
    expect(titles[titles.length - 1]).toBe(PLATFORM_DEMO.title);
    expect(within(articles[0]).getByTestId("c3-jm-match")).toHaveTextContent("% match");
    expect(within(articles[0]).getByTestId("c3-job-closest")).toHaveTextContent("Closest role: QA Engineer");
    expect(within(articles[titles.indexOf("QA Intern")]).getByTestId("c3-jm-match")).toHaveTextContent("100% match");
    // a Data Analyst job does not fit QA: no match badge, but its closest role is shown, and it comes after the QA jobs
    const da = articles[titles.indexOf("Data Analyst Intern")];
    expect(within(da).queryByTestId("c3-jm-match")).not.toBeInTheDocument();
    expect(within(da).getByTestId("c3-job-closest")).toHaveTextContent("Closest role: Data Analyst");
    expect(titles.indexOf("Data Analyst Intern")).toBeGreaterThan(titles.indexOf("QA Intern"));
    const half = articles[titles.indexOf("QA Engineer")];
    expect(within(half).getByText(/Missing:/)).toHaveTextContent("Test automation");
    expect(within(half).getByText(/First step:/)).toBeInTheDocument();
    expect(within(articles[titles.indexOf("Office Helper")]).queryByTestId("c3-jm-badge")).not.toBeInTheDocument();
    expect(within(articles[titles.length - 1]).getByTestId("c3-jm-demo")).toHaveTextContent(en.jfDemoBadge);
    const feed = articles[titles.indexOf(FEED.title)];
    expect(feed).toHaveTextContent("Remotive");
    expect(within(feed).getByTestId("c3-jm-match")).toBeInTheDocument();
    // real jobs match, so no C3 sample jobs
    expect(screen.queryByTestId("c3-jm-samples")).not.toBeInTheDocument();
    // "As listed" restores the original order; Clear turns everything off
    await user.selectOptions(screen.getByTestId("c3-jm-sort"), "default");
    expect(screen.getAllByRole("article").map((a) => within(a).getByRole("heading", { level: 4 }).textContent)[0]).toBe(PLATFORM_DEMO.title);
    await user.click(screen.getByRole("button", { name: en.jmClear }));
    expect(screen.queryByTestId("c3-jm-banner")).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem(JOB_MATCH_KEY)).toBeNull();
  });

  it("shows C3 sample jobs only when no real job matches, under their own heading and only in All", async () => {
    saveJobMatchContext("qa_engineer", QA);
    mockBoard([VAGUE], []);
    const user = userEvent.setup();
    renderBoard();
    const samples = await screen.findByTestId("c3-jm-samples");
    expect(samples).toHaveTextContent(en.jfDemoHeading);
    expect(samples).toHaveTextContent(en.jfDemoNote);
    expect(titlesIn(samples)[0]).toBe(en.jfDemoHeading);
    expect(within(samples).getAllByTestId("c3-job").length).toBeGreaterThan(0);
    expect(within(samples).getAllByTestId("c3-job-demo-badge").length).toBeGreaterThan(0);
    // the real list still comes first
    const real = screen.getAllByRole("article");
    expect(real[0].compareDocumentPosition(samples) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Campus jobs/ }));
    await waitFor(() => expect(screen.queryByTestId("c3-jm-samples")).not.toBeInTheDocument());
  });
});

describe("C3 results -> Career", () => {
  it("saves the context in sessionStorage and never puts skill levels in the URL", async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <CareerGuidanceTool />
      </LanguageProvider>
    );
    await user.click(screen.getByRole("button", { name: en.loadExample }));
    await user.click(screen.getByRole("button", { name: en.analyse }));
    const link = screen.getByTestId("c3-see-in-career");
    expect(link).toHaveAttribute("href", "/dashboard/student#career");
    link.addEventListener("click", (e) => e.preventDefault()); // jsdom cannot navigate
    await user.click(link);
    const ctx = readJobMatchContext();
    expect(ctx?.roleId).toBe("qa_engineer");
    expect(Object.keys(ctx?.levels ?? {}).length).toBeGreaterThan(0);
    expect(window.location.href).not.toMatch(/testing_manual|levels|qa_engineer/);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
