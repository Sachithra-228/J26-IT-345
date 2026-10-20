import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CareerGuidanceTool } from "@/components/c3/career-guidance-tool";
import { LanguageProvider } from "@/context/language-context";
import { getC3Text } from "@/lib/c3/i18n";
import type { JobListing } from "@/types";

const en = getC3Text("en");
const realFetch = global.fetch;
const realPrint = window.print;

/** FICTIONAL job. */
const QA_JOB: JobListing = {
  _id: "qa-real",
  title: "QA Intern",
  company: "Fictional Labs",
  location: "Colombo",
  salary: "-",
  type: "internship",
  requirements: ["Manual testing and test cases", "Test automation with Selenium", "SQL", "Agile"],
  applicationDeadline: "2099-12-31",
  contactEmail: "jobs@example.com"
};

afterEach(() => {
  global.fetch = realFetch;
  window.print = realPrint;
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
  return user;
}

describe("My Career Readiness Report", () => {
  it("renders from the current results, without any network call, and prints", async () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
    const printSpy = jest.fn();
    window.print = printSpy;
    const user = await toResults();
    await user.click(screen.getByTestId("c3-report-open"));

    const report = screen.getByTestId("c3-report");
    expect(within(report).getByRole("heading", { name: en.rpTitle })).toBeInTheDocument();
    expect(within(report).getByTestId("c3-report-main")).toHaveTextContent("Your readiness for QA Engineer");
    expect(within(report).getByTestId("c3-report-main")).toHaveTextContent(/\d+\/100/);
    // chart 1: the top 3 roles, with text labels
    const roles = within(report).getByTestId("c3-report-chart-roles");
    expect(roles.querySelectorAll("text").length).toBe(6);
    expect(roles.getAttribute("aria-label")).toMatch(/QA Engineer \d+\/100/);
    // chart 2: student level vs needed level, as text too
    expect(within(report).getByTestId("c3-report-chart-skills").getAttribute("aria-label")).toMatch(/You .*needed/);
    expect(within(report).getByTestId("c3-report-gaps")).toHaveTextContent(en.rpGaps);
    expect(within(report).getByTestId("c3-report-plan")).toHaveTextContent(/steps, about \d+ hours/);
    // honest footer and synthetic label
    expect(within(report).getByTestId("c3-report-footer")).toHaveTextContent("synthetic job ads");
    expect(report).toHaveTextContent(en.rpSynthetic);
    expect(report).toHaveTextContent("c3-readiness-v1-synthetic");
    // jobs were not loaded, so no jobs section and still no request
    expect(within(report).queryByTestId("c3-report-jobs")).not.toBeInTheDocument();

    await user.click(within(report).getByRole("button", { name: en.rpPrint }));
    expect(printSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows the name only when the student types it, and never stores it", async () => {
    window.print = jest.fn();
    const user = await toResults();
    await user.click(screen.getByTestId("c3-report-open"));
    const report = screen.getByTestId("c3-report");
    expect(within(report).queryByTestId("c3-report-name")).not.toBeInTheDocument();
    await user.type(within(report).getByLabelText(en.rpNameLabel), "Fictional Student");
    expect(within(report).getByTestId("c3-report-name")).toHaveTextContent("Prepared for: Fictional Student");
    expect(JSON.stringify(window.localStorage)).not.toContain("Fictional Student");
    expect(JSON.stringify(window.sessionStorage)).not.toContain("Fictional Student");
    // Escape closes the report
    await user.keyboard("{Escape}");
    expect(screen.queryByTestId("c3-report")).not.toBeInTheDocument();
  });

  it("includes jobs already loaded, and labels sample jobs as demo", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [] }) as unknown as typeof fetch;
    const user = await toResults();
    await user.click(within(screen.getByTestId("c3-jobs")).getByRole("button", { name: en.jfShow }));
    await screen.findByTestId("c3-jobs-none");
    await user.click(screen.getByTestId("c3-report-open"));
    const jobs = within(screen.getByTestId("c3-report")).getByTestId("c3-report-jobs");
    expect(within(jobs).getAllByTestId("c3-report-demo")[0]).toHaveTextContent(en.jfDemoBadge);
  });

  it("lists real jobs without a demo label", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [QA_JOB] }) as unknown as typeof fetch;
    const user = await toResults();
    await user.click(within(screen.getByTestId("c3-jobs")).getByRole("button", { name: en.jfShow }));
    await within(screen.getByTestId("c3-jobs")).findAllByTestId("c3-job");
    await user.click(screen.getByTestId("c3-report-open"));
    const jobs = within(screen.getByTestId("c3-report")).getByTestId("c3-report-jobs");
    expect(jobs).toHaveTextContent("QA Intern");
    expect(jobs).toHaveTextContent(/% match/);
    expect(within(jobs).queryByTestId("c3-report-demo")).not.toBeInTheDocument();
  });
});
