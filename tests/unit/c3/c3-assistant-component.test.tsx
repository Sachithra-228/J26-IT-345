import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CareerAssistant } from "@/components/c3/career-assistant";
import { CareerGuidanceSection } from "@/components/c3/career-guidance-section";
import { MockInterview } from "@/components/c3/mock-interview";
import { LanguageProvider } from "@/context/language-context";
import { getAssistantText } from "@/lib/c3/assistant-text";
import { assessCareer } from "@/lib/c3/assessment";
import { getC3Text } from "@/lib/c3/i18n";
import type { CareerProfile } from "@/lib/c3/validation";

const withLanguage = (ui: React.ReactElement) => <LanguageProvider>{ui}</LanguageProvider>;
const en = getAssistantText("en");
const c3 = getC3Text("en");

const profile = {
  yearOfStudy: 3,
  targetRoleIds: ["qa_engineer"],
  skills: { testing_manual: 1, communication: 2, databases_sql: 2 }
} as CareerProfile;

afterEach(() => {
  window.localStorage.clear();
  jest.restoreAllMocks();
});

describe("CareerAssistant", () => {
  it("answers typed and suggested questions on-device, with sources - without any network call", async () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
    const user = userEvent.setup();
    render(withLanguage(<CareerAssistant profile={profile} interview={null} />));

    expect(screen.getByText(en.welcome)).toBeInTheDocument();
    await user.click(screen.getByLabelText(en.inputLabel));
    await user.paste("How ready am I?");
    await user.click(screen.getByRole("button", { name: en.send }));

    const score = Math.round(assessCareer(profile).targets[0].readiness.score);
    let answers = screen.getAllByTestId("c3-assistant-answer");
    expect(answers).toHaveLength(1);
    expect(answers[0]).toHaveTextContent(`Your readiness for QA Engineer is ${score}/100`);
    expect(answers[0]).toHaveTextContent(`${en.basedOn} ${en.srcReadiness}`);
    expect(screen.getByLabelText(en.inputLabel)).toHaveValue("");

    // follow-up suggestions come from the answered intent
    await user.click(screen.getByRole("button", { name: en.qGaps }));
    answers = screen.getAllByTestId("c3-assistant-answer");
    expect(answers).toHaveLength(2);
    expect(answers[1]).toHaveTextContent("Your most valuable skill gaps for QA Engineer");
    expect(within(answers[1]).getAllByRole("listitem").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: en.clearChat }));
    expect(screen.queryAllByTestId("c3-assistant-answer")).toHaveLength(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("asks for the analysis first when there is none, but still answers role questions", async () => {
    const user = userEvent.setup();
    render(withLanguage(<CareerAssistant profile={null} interview={null} />));
    expect(screen.getByText(en.noAnalysisYet)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: en.qReadiness }));
    expect(screen.getByTestId("c3-assistant-answer")).toHaveTextContent(en.needAnalysis);

    await user.click(screen.getByLabelText(en.inputLabel));
    await user.paste("what does a network engineer need");
    await user.click(screen.getByRole("button", { name: en.send }));
    expect(screen.getAllByTestId("c3-assistant-answer")[1]).toHaveTextContent("What Network Engineer job ads ask for most");
  });

  it("asks for a question before answering", async () => {
    const user = userEvent.setup();
    render(withLanguage(<CareerAssistant profile={profile} interview={null} />));
    await user.click(screen.getByRole("button", { name: en.send }));
    expect(screen.getByRole("alert")).toHaveTextContent(en.emptyQuestion);
    expect(screen.queryByTestId("c3-assistant-answer")).not.toBeInTheDocument();
  });

  it("is available in Sinhala", async () => {
    window.localStorage.setItem("unicare-language", "si");
    const user = userEvent.setup();
    render(withLanguage(<CareerAssistant profile={profile} interview={null} />));
    const si = getAssistantText("si");
    await user.click(await screen.findByRole("button", { name: si.qReadiness }));
    expect(screen.getByTestId("c3-assistant-answer")).toHaveTextContent(si.srcReadiness);
  });
});

describe("Career Readiness section - assistant tab", () => {
  it("uses the analysis from the readiness tab", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ assessment: null }) }) as unknown as typeof fetch;
    const user = userEvent.setup();
    render(withLanguage(<CareerGuidanceSection />));
    await user.click(screen.getByRole("button", { name: c3.loadExample }));
    await user.click(screen.getByRole("button", { name: c3.analyse }));

    await user.click(screen.getByRole("tab", { name: en.tab }));
    expect(screen.getByRole("tab", { name: en.tab })).toHaveAttribute("aria-selected", "true");
    const panel = screen.getByTestId("c3-assistant");
    expect(within(panel).queryByText(en.noAnalysisYet)).not.toBeInTheDocument();
    await user.click(within(panel).getByRole("button", { name: en.qNextStep }));
    expect(within(panel).getByTestId("c3-assistant-answer")).toHaveTextContent(/Start with ".+"/);
  });
});

describe("MockInterview -> assistant", () => {
  it("reports the session summary when an interview is finished", async () => {
    const onSummary = jest.fn();
    const user = userEvent.setup();
    render(withLanguage(<MockInterview targetRoleIds={["qa_engineer"]} onSummary={onSummary} />));
    await user.selectOptions(screen.getByLabelText(c3.ivCount), "4");
    await user.click(screen.getByRole("button", { name: c3.ivStart }));
    for (let i = 1; i <= 4; i++) {
      await user.click(screen.getByLabelText(c3.ivAnswer));
      await user.paste("I would explain the idea and give an example from my project.");
      await user.click(screen.getByRole("button", { name: c3.ivSubmit }));
      expect(onSummary).not.toHaveBeenCalled();
      await user.click(screen.getByRole("button", { name: i < 4 ? c3.ivNext : c3.ivFinish }));
    }
    expect(onSummary).toHaveBeenCalledWith(expect.objectContaining({ answered: 4 }));
  });
});
