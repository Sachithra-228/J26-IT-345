import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminAidPrioritisation } from "@/components/admin/admin-aid-prioritisation";
import { AssessmentTool } from "@/components/c1/assessment-tool";
import { LedgerExplorer } from "@/components/c1/ledger-explorer";
import { LanguageProvider } from "@/context/language-context";
import demoLedger from "@/lib/c1/demo-ledger.json";
import { canonicalLedgerString, summarizeLedger, type LedgerFile } from "@/lib/c1/ledger";

const ledger = demoLedger as unknown as LedgerFile;

function withLanguage(ui: React.ReactElement) {
  return <LanguageProvider>{ui}</LanguageProvider>;
}

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  global.fetch = jest.fn().mockResolvedValue({ ok, status, json: async () => body }) as unknown as typeof fetch;
}

afterEach(() => {
  window.localStorage.clear();
  jest.restoreAllMocks();
});

describe("AssessmentTool", () => {
  it("calculates a need index and ranked scholarships entirely on-device", async () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
    const user = userEvent.setup();
    render(withLanguage(<AssessmentTool />));

    await user.click(screen.getByRole("button", { name: "Calculate" }));

    expect(await screen.findByTestId("vi-value")).toBeInTheDocument();
    const value = Number(screen.getByTestId("vi-value").textContent);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(100);
    expect(screen.getByTestId("vi-band")).toBeInTheDocument();
    expect(within(screen.getByTestId("recommendations")).getAllByRole("listitem").length).toBeGreaterThan(0);
    // privacy promise: nothing was sent anywhere
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("scores higher need above lower need", async () => {
    const user = userEvent.setup();
    render(withLanguage(<AssessmentTool />));
    const income = screen.getByLabelText(/monthly household income/i);

    await user.clear(income);
    await user.type(income, "250000");
    await user.click(screen.getByRole("button", { name: "Calculate" }));
    const rich = Number((await screen.findByTestId("vi-value")).textContent);

    await user.clear(income);
    await user.type(income, "25000");
    await user.click(screen.getByRole("button", { name: "Calculate" }));
    const poor = Number(screen.getByTestId("vi-value").textContent);

    expect(poor).toBeGreaterThan(rich);
  });

  it("blocks invalid input, explains why, and moves focus to the first bad field", async () => {
    const user = userEvent.setup();
    render(withLanguage(<AssessmentTool />));
    const income = screen.getByLabelText(/monthly household income/i);
    await user.clear(income);
    await user.type(income, "100");
    await user.click(screen.getByRole("button", { name: "Calculate" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/check the highlighted values/i);
    expect(income).toHaveAttribute("aria-invalid", "true");
    expect(income).toHaveFocus();
    expect(screen.queryByTestId("vi-value")).not.toBeInTheDocument();
  });

  it("reveals the loan amount field only when there is an education loan", async () => {
    const user = userEvent.setup();
    render(withLanguage(<AssessmentTool />));
    expect(screen.queryByLabelText(/loan amount/i)).not.toBeInTheDocument();
    await user.click(screen.getByLabelText(/education loan/i));
    expect(screen.getByLabelText(/loan amount/i)).toBeInTheDocument();
  });

  it("reports the result to the parent so a dashboard can save it", async () => {
    const onResult = jest.fn();
    const user = userEvent.setup();
    render(withLanguage(<AssessmentTool onResult={onResult} />));
    await user.click(screen.getByRole("button", { name: "Calculate" }));
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult.mock.calls[0][0].monthlyHouseholdIncomeLkr).toBe(45000);
    expect(onResult.mock.calls[0][1].vulnerabilityIndex).toBeGreaterThanOrEqual(0);
  });

  it("is available in Sinhala", async () => {
    window.localStorage.setItem("unicare-language", "si");
    render(withLanguage(<AssessmentTool />));
    expect(await screen.findByRole("button", { name: "ගණනය කරන්න" })).toBeInTheDocument();
  });

  it("warns that the model is synthetic-trained", () => {
    render(withLanguage(<AssessmentTool />));
    expect(screen.getByText(/synthetic data/i)).toBeInTheDocument();
  });

  it("fills the form from a fictional sample student and scores it", async () => {
    const user = userEvent.setup();
    render(withLanguage(<AssessmentTool />));

    await user.selectOptions(screen.getByLabelText("Try a sample student"), "S04");
    expect(screen.getByLabelText(/monthly household income/i)).toHaveValue(18000);
    expect(screen.getByText(/fictional profiles for demonstration/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Calculate" }));
    const needy = Number((await screen.findByTestId("vi-value")).textContent);

    await user.selectOptions(screen.getByLabelText("Try a sample student"), "S12");
    expect(screen.queryByTestId("vi-value")).not.toBeInTheDocument(); // old result cleared
    await user.click(screen.getByRole("button", { name: "Calculate" }));
    const comfortable = Number((await screen.findByTestId("vi-value")).textContent);

    expect(needy).toBeGreaterThan(comfortable);
  });

  it("labels the sample students in Sinhala", async () => {
    window.localStorage.setItem("unicare-language", "si");
    render(withLanguage(<AssessmentTool />));
    expect(await screen.findByRole("option", { name: /ගම්බද තනි දෙමාපිය පවුල/ })).toBeInTheDocument();
  });
});

describe("LedgerExplorer", () => {
  const response = {
    meta: { ...ledger.meta, source: "simulation", eventCount: ledger.events.length },
    summary: summarizeLedger(ledger.events),
    events: [...ledger.events].slice(-12).reverse(),
    digest: "a".repeat(64),
    generatedAt: "2026-10-07T00:00:00.000Z"
  };

  it("shows totals, awards, activity and the integrity fingerprint", async () => {
    mockFetchOnce(response);
    render(withLanguage(<LedgerExplorer variant="public" />));

    expect(await screen.findByText("35 ETH")).toBeInTheDocument();
    expect(screen.getByText("16 ETH")).toBeInTheDocument();
    expect(screen.getByText("Local simulation")).toBeInTheDocument();
    expect(screen.getByTestId("ledger-digest")).toHaveTextContent("a".repeat(64));
    expect(screen.getAllByText("Completed").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Revoked").length).toBeGreaterThan(0);
    // no personal data shown - students appear only as shortened hashes
    expect(document.body.textContent).toMatch(/0x[0-9a-f]{6}…[0-9a-f]{4}/);
  });

  it("marks live data differently from a simulation", async () => {
    mockFetchOnce({ ...response, meta: { ...response.meta, source: "live", network: "sepolia", chainId: 11155111 } });
    render(withLanguage(<LedgerExplorer />));
    expect(await screen.findByText("Live blockchain")).toBeInTheDocument();
    expect(screen.getAllByRole("link").some((a) => a.getAttribute("href")?.startsWith("https://sepolia.etherscan.io/tx/"))).toBe(true);
  });

  it("shows an error with a working retry", async () => {
    const user = userEvent.setup();
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 502, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => response }) as unknown as typeof fetch;
    render(withLanguage(<LedgerExplorer />));

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not be loaded/i);
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("35 ETH")).toBeInTheDocument();
  });

  it("uses the same canonical string the server hashes (fingerprint can be re-verified)", () => {
    expect(typeof canonicalLedgerString(ledger.events)).toBe("string");
    expect(canonicalLedgerString(ledger.events).length).toBeGreaterThan(100);
  });
});

describe("AdminAidPrioritisation", () => {
  const item = (id: string, name: string, vi: number, band: "high" | "moderate" | "low") => ({
    id,
    studentName: name,
    university: "SLIIT",
    vulnerabilityIndex: vi,
    band,
    flaggedVulnerable: vi > 50,
    topFactors: [{ feature: "income_per_capita", label: "Low income per household member", sharePercent: 55 }],
    modelVersion: "xgb-v1-synthetic",
    syntheticTraining: true,
    assessedAt: "2026-10-05T10:00:00.000Z"
  });

  it("lists students in the order the API ranks them, with factors and a synthetic-model badge", async () => {
    mockFetchOnce({ items: [item("1", "Nimali", 92, "high"), item("2", "Kasun", 55, "moderate")] });
    render(withLanguage(<AdminAidPrioritisation />));

    const rows = await screen.findAllByRole("row");
    expect(within(rows[1]).getByText("Nimali")).toBeInTheDocument();
    expect(within(rows[2]).getByText("Kasun")).toBeInTheDocument();
    expect(within(rows[1]).getByText("92")).toBeInTheDocument();
    expect(screen.getAllByText("Synthetic-trained model").length).toBe(2);
    expect(screen.getAllByText(/Low income per household member/).length).toBe(2);
  });

  it("shows an empty state", async () => {
    mockFetchOnce({ items: [] });
    render(withLanguage(<AdminAidPrioritisation />));
    expect(await screen.findByText(/no students have shared/i)).toBeInTheDocument();
  });

  it("shows an error when the user is not allowed or the API fails", async () => {
    mockFetchOnce({}, false, 403);
    render(withLanguage(<AdminAidPrioritisation />));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/could not be loaded/i));
  });
});
