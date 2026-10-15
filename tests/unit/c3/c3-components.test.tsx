import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CareerGuidanceSection } from "@/components/c3/career-guidance-section";
import { CareerGuidanceTool } from "@/components/c3/career-guidance-tool";
import { CareerDataStatus } from "@/components/c3/career-data-status";
import { CareerInsightsAdmin } from "@/components/c3/career-insights-admin";
import { LanguageProvider } from "@/context/language-context";
import { buildAggregate, demoCohort } from "@/lib/c3/assessment-store";
import { collectionProgress, dataStatus, type DataStatus } from "@/lib/c3/data-status";
import { fmt, getC3Text } from "@/lib/c3/i18n";

const withLanguage = (ui: React.ReactElement) => <LanguageProvider>{ui}</LanguageProvider>;

type User = ReturnType<typeof userEvent.setup>;
/** Step 1 needs 1-3 target roles before Next. */
async function chooseRoleAndNext(user: User, role = "QA Engineer") {
  await user.click(screen.getByRole("checkbox", { name: role }));
  await user.click(screen.getByRole("button", { name: /Next/ }));
}
const en = getC3Text("en");

afterEach(() => {
  window.localStorage.clear();
  jest.restoreAllMocks();
  delete process.env.NEXT_PUBLIC_C3_CV_ENABLED;
});

describe("CareerGuidanceTool", () => {
  it("analyses an example profile entirely on-device and explains the result", async () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
    const user = userEvent.setup();
    render(withLanguage(<CareerGuidanceTool />));

    expect(screen.getByText(en.guidanceNote)).toBeInTheDocument();
    expect(screen.getByText(en.syntheticNote)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: en.loadExample }));
    await user.click(screen.getByRole("button", { name: en.analyse }));

    const results = await screen.findByTestId("c3-results");
    const score = Number(within(results).getByTestId("c3-score-qa_engineer").textContent);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
    expect(within(screen.getByTestId("c3-breakdown")).getAllByRole("row").length).toBeGreaterThan(2);
    expect(within(screen.getByTestId("c3-gaps")).getAllByRole("listitem").length).toBeGreaterThan(0);
    const plan = screen.getByTestId("c3-plan");
    expect(within(plan).getAllByText(en.whyThis).length).toBeGreaterThan(0);
    expect(fetchSpy).not.toHaveBeenCalled(); // privacy promise
  });

  it("switches the explanation when another role is selected", async () => {
    const user = userEvent.setup();
    render(withLanguage(<CareerGuidanceTool />));
    await user.click(screen.getByRole("button", { name: en.loadExample }));
    await user.click(screen.getByRole("button", { name: en.analyse }));
    await user.click(await screen.findByTestId("c3-role-devops_engineer"));
    expect(screen.getByTestId("c3-role-devops_engineer")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: /Why DevOps \/ Cloud Engineer scored/ })).toBeInTheDocument();
  });

  it("asks for 1 to 3 target roles before moving on", async () => {
    const user = userEvent.setup();
    render(withLanguage(<CareerGuidanceTool />));
    await user.click(screen.getByRole("button", { name: /Next/ }));
    expect(screen.getByRole("alert")).toHaveTextContent(en.targetError);
    expect(screen.queryByTestId("c3-results")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: en.stepAbout })).toBeVisible();
    // a fourth role cannot be chosen
    for (const r of ["QA Engineer", "Business Analyst", "Data Analyst"]) await user.click(screen.getByRole("checkbox", { name: r }));
    expect(screen.getByRole("checkbox", { name: "Network Engineer" })).toBeDisabled();
    expect(screen.getByText(fmt(en.rolesChosen, { n: 3 }))).toBeInTheDocument();
  });

  it("higher skill levels give a higher readiness for the role", async () => {
    const user = userEvent.setup();
    render(withLanguage(<CareerGuidanceTool />));
    await chooseRoleAndNext(user, "Network Engineer");
    await user.click(screen.getByRole("button", { name: en.analyse }));
    const low = Number((await screen.findByTestId("c3-score-network_engineer")).textContent);
    await user.click(screen.getByRole("button", { name: new RegExp(en.editAnswers) }));
    await user.click(screen.getByRole("button", { name: /Cloud, infrastructure and security/ }));
    await user.click(within(screen.getByRole("radiogroup", { name: "Computer networking" })).getByRole("radio", { name: "3 - Advanced" }));
    await user.click(within(screen.getByRole("radiogroup", { name: "Cybersecurity" })).getByRole("radio", { name: "2 - Intermediate" }));
    await user.click(screen.getByRole("button", { name: en.analyse }));
    await waitFor(() => expect(Number(screen.getByTestId("c3-score-network_engineer").textContent)).toBeGreaterThan(low));
  });

  it("keeps the caveats in one short visible line with the full notes under More info", () => {
    render(withLanguage(<CareerGuidanceTool />));
    const line = screen.getByText(en.notesShort);
    expect(line).toBeVisible();
    expect(line.textContent).toMatch(/guarantee/);
    expect(line.textContent).toMatch(/synthetic/);
    const more = screen.getByText(en.moreInfo).closest("details") as HTMLElement;
    expect(within(more).getByText(en.syntheticNote)).toBeInTheDocument();
    expect(within(more).getByText(en.privacyNote)).toBeInTheDocument();
  });

  it("rates skills with a keyboard-friendly 0-3 radio group and counts rated skills per area", async () => {
    const user = userEvent.setup();
    render(withLanguage(<CareerGuidanceTool />));
    await chooseRoleAndNext(user);
    const group = screen.getByRole("radiogroup", { name: "Python programming" });
    const none = within(group).getByRole("radio", { name: "0 - None" });
    expect(none).toHaveAttribute("aria-checked", "true");
    none.focus();
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(within(group).getByRole("radio", { name: "2 - Intermediate" })).toHaveAttribute("aria-checked", "true");
    expect(within(group).getByRole("radio", { name: "2 - Intermediate" })).toHaveFocus();
    expect(screen.getByRole("button", { name: /Software engineering/ })).toHaveTextContent(fmt(en.rated, { x: 1, y: 5 }));
  });

  it("moves to the results, focuses them and hides the baseline until Research view is on", async () => {
    const user = userEvent.setup();
    render(withLanguage(<CareerGuidanceTool />));
    await user.click(screen.getByRole("button", { name: en.loadExample }));
    await user.click(screen.getByRole("button", { name: en.analyse }));
    expect(await screen.findByTestId("c3-results")).toBeVisible();
    expect(screen.getByRole("heading", { name: en.stepResults })).toHaveFocus();
    expect(screen.queryByText(/Simple overlap/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("switch", { name: en.researchView }));
    expect(screen.getAllByText(/Simple overlap/).length).toBe(12);
    // the per-skill points stay visible; the formula is one click away
    expect(within(screen.getByTestId("c3-breakdown")).getAllByText(/pts$/).length).toBeGreaterThan(2);
    expect(screen.getByText(en.calcTitle)).toBeInTheDocument();
  });

  it("starts CV-found skills at Basic without counting them as questionnaire answers", async () => {
    const results: Array<{ sources: Record<string, string> }> = [];
    const user = userEvent.setup();
    render(withLanguage(<CareerGuidanceTool cvEnabled onResult={(_p, a) => results.push(a)} />));
    await chooseRoleAndNext(user, "DevOps / Cloud Engineer");
    await user.click(screen.getByRole("checkbox", { name: en.cvConsent }));
    await user.click(screen.getByLabelText(en.cvLabel));
    await user.paste("Skills: Docker and Kubernetes");
    await user.click(screen.getByRole("button", { name: en.cvAnalyse }));
    expect(screen.getByText(en.cvPrefilled)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Next/ }));
    await user.click(screen.getByRole("button", { name: /Cloud, infrastructure and security/ }));
    const group = screen.getByRole("radiogroup", { name: /Containers \(Docker \/ Kubernetes\)/ });
    expect(within(group).getByRole("radio", { name: "1 - Basic" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getAllByText(en.cvBadge).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: en.analyse }));
    expect(results[0].sources.containers).toBe("cv");
    expect(within(screen.getByTestId("c3-breakdown")).getAllByText(en.fromCv).length).toBeGreaterThan(0);
  });

  it("hides the CV step unless it is enabled", () => {
    render(withLanguage(<CareerGuidanceTool />));
    expect(screen.queryByText(en.cvTitle)).not.toBeInTheDocument();
  });

  it("shows the CV step in the student section by default, and hides it when the flag is false", () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }) as unknown as typeof fetch;
    const { unmount } = render(withLanguage(<CareerGuidanceSection />));
    expect(screen.getByRole("button", { name: new RegExp(en.stepCv) })).toBeInTheDocument();
    expect(screen.getByText(fmt(en.stepOf, { n: 1, total: 4 }))).toBeInTheDocument();
    unmount();
    process.env.NEXT_PUBLIC_C3_CV_ENABLED = "false";
    render(withLanguage(<CareerGuidanceSection />));
    expect(screen.queryByRole("button", { name: new RegExp(en.stepCv) })).not.toBeInTheDocument();
    expect(screen.getByText(fmt(en.stepOf, { n: 1, total: 3 }))).toBeInTheDocument();
  });

  it("needs consent before analysing CV text, strips PII and keeps it on the device", async () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
    const user = userEvent.setup();
    render(withLanguage(<CareerGuidanceTool cvEnabled />));
    await chooseRoleAndNext(user);
    const box = screen.getByLabelText(en.cvLabel);
    expect(box).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: en.cvConsent }));
    await user.type(box, "Name: Nimal Silva{enter}nimal@example.com 0771234567{enter}Skills: Docker, Kubernetes and Figma");
    await user.click(screen.getByRole("button", { name: en.cvAnalyse }));
    const found = screen.getByTestId("c3-cv-found");
    expect(found).toHaveTextContent("Containers (Docker / Kubernetes)");
    expect(found).toHaveTextContent("UI / UX design");
    expect(found).toHaveTextContent("Personal details removed before analysis: 3");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("reads an uploaded CV file on the device into the CV box, then finds its skills", async () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
    const user = userEvent.setup();
    render(withLanguage(<CareerGuidanceTool cvEnabled />));
    await chooseRoleAndNext(user);
    const input = screen.getByLabelText(en.cvUpload);
    expect(input).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: en.cvConsent }));
    const cvText = ["Name: Nimal Silva", "nimal@example.com", "Skills: Docker, Selenium"].join(String.fromCharCode(10));
    const file = new File([cvText], "my-cv.txt", { type: "text/plain" });
    await user.upload(input, file);
    expect(await screen.findByText(fmt(en.cvFileLoaded, { name: "my-cv.txt" }))).toBeInTheDocument();
    expect(screen.getByLabelText(en.cvLabel)).toHaveValue(cvText);
    await user.click(screen.getByRole("button", { name: en.cvAnalyse }));
    const found = screen.getByTestId("c3-cv-found");
    expect(found).toHaveTextContent("Containers (Docker / Kubernetes)");
    expect(found).toHaveTextContent("Test automation");
    expect(found).toHaveTextContent("Personal details removed before analysis: 2");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("explains why a CV file could not be used", async () => {
    const user = userEvent.setup();
    render(withLanguage(<CareerGuidanceTool cvEnabled />));
    await chooseRoleAndNext(user);
    await user.click(screen.getByRole("checkbox", { name: en.cvConsent }));
    const input = screen.getByLabelText(en.cvUpload);
    fireEvent.change(input, { target: { files: [new File(["x"], "cv.doc", { type: "application/msword" })] } });
    expect(await screen.findByRole("alert")).toHaveTextContent(en.cvErrType);
    expect(screen.getByLabelText(en.cvLabel)).toHaveValue("");
  });

  it("is available in Sinhala and Tamil", async () => {
    window.localStorage.setItem("unicare-language", "si");
    const { unmount } = render(withLanguage(<CareerGuidanceTool />));
    expect(await screen.findByRole("button", { name: getC3Text("si").loadExample })).toBeInTheDocument();
    expect(screen.getByText(getC3Text("si").notesShort)).toBeInTheDocument();
    expect(screen.getByText(getC3Text("si").guidanceNote)).toBeInTheDocument();
    unmount();
    window.localStorage.setItem("unicare-language", "ta");
    render(withLanguage(<CareerGuidanceTool />));
    expect(await screen.findByRole("button", { name: getC3Text("ta").loadExample })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: getC3Text("ta").stepAbout })).toBeInTheDocument();
  });
});

describe("CareerGuidanceSection (student dashboard)", () => {
  it("lets a student erase saved answers before running a new analysis", async () => {
    const fetchMock = jest.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") return { ok: true, status: 200, json: async () => ({ deleted: true }) };
      return {
        ok: true,
        status: 200,
        json: async () => ({ savedAt: "2026-10-10T10:00:00Z", profile: { yearOfStudy: 3, targetRoleIds: ["qa_engineer"], skills: { testing_manual: 2 } } })
      };
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();
    render(withLanguage(<CareerGuidanceSection />));
    await user.click(await screen.findByRole("button", { name: en.deleteSaved }));
    await waitFor(() => expect(screen.getByText(en.deletedNote)).toBeInTheDocument());
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(true);
    // the saved answers were loaded into the skills step
    expect(screen.getByRole("heading", { name: en.stepSkills })).toBeVisible();
  });

  it("saves only the answers, and only after consent", async () => {
    const fetchMock = jest.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") return { ok: true, status: 201, json: async () => ({ savedAt: "2026-10-10T10:00:00Z" }) };
      return { ok: true, status: 200, json: async () => ({ assessment: null }) };
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();
    render(withLanguage(<CareerGuidanceSection />));

    expect(screen.queryByRole("button", { name: en.save })).not.toBeInTheDocument(); // shown with the results
    await user.click(screen.getByRole("button", { name: en.loadExample }));
    await user.click(screen.getByRole("button", { name: en.analyse }));
    const saveButton = await screen.findByRole("button", { name: en.save });
    expect(saveButton).toBeDisabled(); // still no consent
    await user.click(screen.getByRole("checkbox", { name: en.consentLabel }));
    await user.click(saveButton);

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(en.savedAt));
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    const body = JSON.parse(String(post?.[1]?.body));
    expect(body.consent).toBe(true);
    expect(Object.keys(body)).toEqual(["profile", "consent"]);
    expect(body.profile.targetRoleIds).toEqual(["qa_engineer", "business_analyst"]);
  });
});

describe("CareerInsightsAdmin", () => {
  function mockAggregate(data: unknown, ok = true) {
    global.fetch = jest.fn().mockResolvedValue({ ok, status: ok ? 200 : 500, json: async () => data }) as unknown as typeof fetch;
  }

  it("shows anonymous cohort figures and the synthetic-demo warning", async () => {
    mockAggregate(buildAggregate(demoCohort, "synthetic-demo"));
    render(withLanguage(<CareerInsightsAdmin />));
    expect(await screen.findByTestId("c3-agg-students")).toHaveTextContent(String(demoCohort.length));
    expect(screen.getByText(en.aggDemo)).toBeInTheDocument();
    expect(within(screen.getByTestId("c3-agg-roles")).getAllByRole("row")).toHaveLength(13);
    const bars = within(screen.getByTestId("c3-agg-chart")).getAllByRole("listitem");
    expect(bars).toHaveLength(12);
    const values = bars.map((b) => Number(b.textContent?.match(/(\d+)$/)?.[1] ?? -1));
    expect([...values].sort((x, y) => y - x)).toEqual(values);
    expect(screen.getByTestId("c3-agg-gaps")).toBeInTheDocument();
    expect(screen.getByTestId("c3-agg-coverage")).toBeInTheDocument();
  });

  it("explains when there are too few students to show anything", async () => {
    mockAggregate(buildAggregate(demoCohort.slice(0, 2), "stored"));
    render(withLanguage(<CareerInsightsAdmin />));
    expect(await screen.findByTestId("c3-agg-suppressed")).toBeInTheDocument();
    expect(screen.queryByTestId("c3-agg-roles")).not.toBeInTheDocument();
  });

  it("offers a retry when loading fails", async () => {
    mockAggregate({}, false);
    render(withLanguage(<CareerInsightsAdmin />));
    expect(await screen.findByRole("alert")).toHaveTextContent(en.aggError);
  });
});

describe("CareerDataStatus (admin)", () => {
  const status: DataStatus = {
    generatedAt: "2026-10-14",
    taxonomyVersion: "1.1.0",
    realAds: {
      rowsInSheet: 32,
      adsUsed: 30,
      rowsSkipped: 2,
      issuesToFix: 3,
      other: 1,
      rolesAtTarget: 1,
      perRole: [
        { roleId: "software_engineer", ads: 27, target: 25 },
        { roleId: "qa_engineer", ads: 3, target: 25 }
      ],
      sources: { TopJobs: 20, "LinkedIn (manual)": 10 }
    },
    realEvaluation: {
      ads: 30,
      annotators: 1,
      developmentSet: true,
      precision: 0.9,
      recall: 0.8,
      f1: 0.847,
      f1Ci95: [0.81, 0.88],
      roleFromTitleAccuracy: 0.56,
      seniorityAccuracy: 0.99
    }
  };

  it("shows the model source, collection progress per role and the real-ads check", () => {
    render(withLanguage(<CareerDataStatus status={status} />));
    expect(screen.getByText(en.dsTitle)).toBeInTheDocument();
    expect(screen.getByTestId("c3-ds-ads")).toHaveTextContent(fmt(en.dsAdsLine, { used: 30, skipped: 2, issues: 3 }));
    // capped per role: (25 + 3) / 50
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "56");
    const rows = within(screen.getByTestId("c3-ds-roles")).getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveTextContent("Software Engineer2725");
    expect(screen.getByTestId("c3-ds-eval")).toHaveTextContent("precision 0.90, recall 0.80, F1 0.85 (95% CI 0.81-0.88)");
    expect(screen.getByText(fmt(en.dsEvalExtra, { role: 56, sen: 99 }))).toBeInTheDocument();
    expect(screen.getByText(en.dsEvalNote)).toBeInTheDocument();
    const sources = screen.getByTestId("c3-ds-sources");
    expect(sources).toHaveTextContent("TopJobs 20 (67%)");
    expect(sources).toHaveTextContent("LinkedIn (manual) 10 (33%)");
    // bars: most ads first, the role at target is marked with a tick and a label, every bar has a tooltip label
    const bars = within(screen.getByTestId("c3-ds-chart")).getAllByRole("listitem");
    expect(bars[0]).toHaveTextContent(/^Software Engineer.*✓27$/);
    expect(within(bars[0]).getByTitle(en.dsAtTarget)).toBeInTheDocument();
    expect(screen.getByLabelText(fmt(en.dsTipRole, { role: "QA Engineer", n: 3, target: 25 }))).toBeInTheDocument();
    expect(screen.getByTestId("c3-ds-tile-ads")).toHaveTextContent("30");
    expect(screen.getByTestId("c3-ds-tile-f1")).toHaveTextContent("0.85");
  });

  it("holds aggregate numbers only and says the profiles are still synthetic", () => {
    const text = JSON.stringify(dataStatus);
    expect(text).not.toMatch(/https?:|@|www\.|Full_Ad_Text|JOB\d/i);
    expect(collectionProgress(dataStatus).profilesFrom).toBe("synthetic");
    render(withLanguage(<CareerDataStatus />));
    expect(screen.getByText(/still built from 480 synthetic job advertisements/)).toBeInTheDocument();
  });

  it("is part of the admin insights page even when the cohort figures fail to load", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }) as unknown as typeof fetch;
    render(withLanguage(<CareerInsightsAdmin />));
    expect(await screen.findByRole("alert")).toHaveTextContent(en.aggError);
    expect(screen.getByTestId("c3-data-status")).toBeInTheDocument();
  });

  it("shows the held-out check only when there are held-out ads", () => {
    const { unmount } = render(withLanguage(<CareerDataStatus status={status} />));
    expect(screen.queryByTestId("c3-ds-heldout")).not.toBeInTheDocument();
    unmount();
    const withHeldOut: DataStatus = {
      ...status,
      realEvaluation: { ...status.realEvaluation, heldOut: { ads: 52, f1: 0.819, f1Ci95: [0.786, 0.85], devLastJobNumber: 98 } }
    };
    render(withLanguage(<CareerDataStatus status={withHeldOut} />));
    expect(screen.getByTestId("c3-ds-heldout")).toHaveTextContent(fmt(en.dsHeldOut, { n: 52, f1: "0.82", lo: "0.79", hi: "0.85" }));
  });

  it("is available in Sinhala", async () => {
    window.localStorage.setItem("unicare-language", "si");
    render(withLanguage(<CareerDataStatus status={status} />));
    expect(await screen.findByText(getC3Text("si").dsTitle)).toBeInTheDocument();
  });
});
