import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CareerGuidanceSection } from "@/components/c3/career-guidance-section";
import { MockInterview } from "@/components/c3/mock-interview";
import { LanguageProvider } from "@/context/language-context";
import { getC3Text } from "@/lib/c3/i18n";

const withLanguage = (ui: React.ReactElement) => <LanguageProvider>{ui}</LanguageProvider>;
const en = getC3Text("en");

afterEach(() => {
  window.localStorage.clear();
  jest.restoreAllMocks();
});

describe("MockInterview", () => {
  it("runs a full on-device session: question, rubric feedback, summary - without any network call", async () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
    const user = userEvent.setup();
    render(withLanguage(<MockInterview levels={{ testing_manual: 1, communication: 2 }} targetRoleIds={["qa_engineer"]} />));

    expect(screen.getByText(en.ivUsesGaps)).toBeInTheDocument();
    expect(screen.getByLabelText(en.ivRole)).toHaveValue("qa_engineer");
    await user.selectOptions(screen.getByLabelText(en.ivCount), "4");
    await user.click(screen.getByRole("button", { name: en.ivStart }));

    for (let i = 1; i <= 4; i++) {
      expect(screen.getByText(`Question ${i} of 4`)).toBeInTheDocument();
      expect(screen.getByText(en.ivWhyAsked)).toBeInTheDocument();
      await user.click(screen.getByLabelText(en.ivAnswer));
      await user.paste(
        "First I would explain the main idea, then give an example from my project where I used Selenium and tests to reduce bugs by 30%."
      );
      await user.click(screen.getByRole("button", { name: en.ivSubmit }));
      const feedback = screen.getByTestId("c3-iv-feedback");
      expect(within(feedback).getByTestId("c3-iv-score")).toHaveTextContent(/Score \d+\/100/);
      expect(within(feedback).getByText(en.crKeyPoints)).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: i < 4 ? en.ivNext : en.ivFinish }));
    }

    expect(screen.getByTestId("c3-iv-summary")).toHaveTextContent(/over 4 answers/);
    expect(screen.getByText(en.ivPrivacy)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("asks for an answer before giving feedback", async () => {
    const user = userEvent.setup();
    render(withLanguage(<MockInterview />));
    expect(screen.getByText(en.ivNoAnalysis)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: en.ivStart }));
    await user.click(screen.getByRole("button", { name: en.ivSubmit }));
    expect(screen.getByRole("alert")).toHaveTextContent(en.ivEmptyAnswer);
    expect(screen.queryByTestId("c3-iv-feedback")).not.toBeInTheDocument();
  });

  it("lets the student change the role before starting", async () => {
    const user = userEvent.setup();
    render(withLanguage(<MockInterview targetRoleIds={["qa_engineer"]} />));
    await user.selectOptions(screen.getByLabelText(en.ivRole), "network_engineer");
    expect(screen.getByLabelText(en.ivRole)).toHaveValue("network_engineer");
  });

  it("is available in Sinhala", async () => {
    window.localStorage.setItem("unicare-language", "si");
    render(withLanguage(<MockInterview />));
    expect(await screen.findByRole("button", { name: getC3Text("si").ivStart })).toBeInTheDocument();
  });
});

describe("Career Readiness section tabs", () => {
  it("switches to the mock interview and keeps the readiness form", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ assessment: null }) }) as unknown as typeof fetch;
    const user = userEvent.setup();
    render(withLanguage(<CareerGuidanceSection />));
    await user.click(screen.getByRole("button", { name: en.loadExample }));
    await user.click(screen.getByRole("button", { name: en.analyse }));

    await user.click(screen.getByRole("tab", { name: en.tabInterview }));
    expect(screen.getByRole("tab", { name: en.tabInterview })).toHaveAttribute("aria-selected", "true");
    const interview = screen.getByTestId("c3-interview");
    expect(within(interview).getByText(en.ivUsesGaps)).toBeInTheDocument();
    expect(within(interview).getByLabelText(en.ivRole)).toHaveValue("qa_engineer");

    await user.click(screen.getByRole("tab", { name: en.tabReadiness }));
    expect(screen.getByTestId("c3-results")).toBeInTheDocument();
  });
});
