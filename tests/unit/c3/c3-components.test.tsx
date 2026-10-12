import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CareerGuidanceSection } from "@/components/c3/career-guidance-section";
import { CareerGuidanceTool } from "@/components/c3/career-guidance-tool";
import { CareerInsightsAdmin } from "@/components/c3/career-insights-admin";
import { LanguageProvider } from "@/context/language-context";
import { buildAggregate, demoCohort } from "@/lib/c3/assessment-store";
import { getC3Text } from "@/lib/c3/i18n";

const withLanguage = (ui: React.ReactElement) => <LanguageProvider>{ui}</LanguageProvider>;
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

  it("asks for 1 to 3 target roles", async () => {
    const user = userEvent.setup();
    render(withLanguage(<CareerGuidanceTool />));
    await user.click(screen.getByRole("button", { name: en.analyse }));
    expect(screen.getByRole("alert")).toHaveTextContent(en.targetError);
    expect(screen.queryByTestId("c3-results")).not.toBeInTheDocument();
  });

  it("higher skill levels give a higher readiness for the role", async () => {
    const user = userEvent.setup();
    render(withLanguage(<CareerGuidanceTool />));
    await user.click(screen.getByRole("checkbox", { name: "Network Engineer" }));
    await user.click(screen.getByRole("button", { name: en.analyse }));
    const low = Number((await screen.findByTestId("c3-score-network_engineer")).textContent);
    await user.selectOptions(screen.getByLabelText("Computer networking"), "3");
    await user.selectOptions(screen.getByLabelText("Cybersecurity"), "2");
    await user.click(screen.getByRole("button", { name: en.analyse }));
    await waitFor(() => expect(Number(screen.getByTestId("c3-score-network_engineer").textContent)).toBeGreaterThan(low));
  });

  it("hides the CV step unless the feature flag is on", () => {
    render(withLanguage(<CareerGuidanceTool />));
    expect(screen.queryByText(en.cvTitle)).not.toBeInTheDocument();
  });

  it("needs consent before analysing CV text, strips PII and keeps it on the device", async () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
    const user = userEvent.setup();
    render(withLanguage(<CareerGuidanceTool cvEnabled />));
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

  it("is available in Sinhala and Tamil", async () => {
    window.localStorage.setItem("unicare-language", "si");
    const { unmount } = render(withLanguage(<CareerGuidanceTool />));
    expect(await screen.findByRole("button", { name: getC3Text("si").analyse })).toBeInTheDocument();
    expect(screen.getByText(getC3Text("si").guidanceNote)).toBeInTheDocument();
    unmount();
    window.localStorage.setItem("unicare-language", "ta");
    render(withLanguage(<CareerGuidanceTool />));
    expect(await screen.findByRole("button", { name: getC3Text("ta").analyse })).toBeInTheDocument();
  });
});

describe("CareerGuidanceSection (student dashboard)", () => {
  it("saves only the answers, and only after consent", async () => {
    const fetchMock = jest.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") return { ok: true, status: 201, json: async () => ({ savedAt: "2026-10-10T10:00:00Z" }) };
      return { ok: true, status: 200, json: async () => ({ assessment: null }) };
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();
    render(withLanguage(<CareerGuidanceSection />));

    const saveButton = screen.getByRole("button", { name: en.save });
    expect(saveButton).toBeDisabled();
    await user.click(screen.getByRole("button", { name: en.loadExample }));
    await user.click(screen.getByRole("button", { name: en.analyse }));
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
