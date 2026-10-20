import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CareerAssistant } from "@/components/c3/career-assistant";
import { MockInterview } from "@/components/c3/mock-interview";
import { LanguageProvider } from "@/context/language-context";
import { answerIntent, answerQuestion, closestSuggestions, getIntent, matchIntent, type AssistantContext } from "@/lib/c3/assistant";
import { getAssistantText } from "@/lib/c3/assistant-text";
import { assessCareer } from "@/lib/c3/assessment";
import { getC3Text } from "@/lib/c3/i18n";
import { readJobMatchContext } from "@/lib/c3/job-match-context";
import type { CareerProfile } from "@/lib/c3/validation";

const en = getC3Text("en");
const a = getAssistantText("en");
const withLanguage = (ui: React.ReactElement) => <LanguageProvider>{ui}</LanguageProvider>;

const profile = {
  yearOfStudy: 3,
  targetRoleIds: ["software_engineer", "qa_engineer"],
  skills: { prog_oop: 2, databases_sql: 2, version_control: 1, communication: 2, testing_manual: 1 }
} as CareerProfile;
const ctx: AssistantContext = { assessment: assessCareer(profile), interview: null };
const empty: AssistantContext = { assessment: null, interview: null };

afterEach(() => {
  window.sessionStorage.clear();
  jest.restoreAllMocks();
});

describe("assistant: new questions and sections", () => {
  it("routes the new questions without changing the old ones", () => {
    expect(matchIntent(a.qJobs).intent).toBe("jobs");
    expect(matchIntent(a.qCertifications).intent).toBe("certifications");
    expect(matchIntent(a.qBestRole).intent).toBe("bestRole");
    expect(matchIntent("Which role suits me?").intent).toBe("bestRole");
  });

  it("marks answers about readiness, gaps, the plan and jobs with the section to open", () => {
    expect(answerIntent("readiness", ctx, "en").section).toBe("readiness");
    expect(answerIntent("gaps", ctx, "en").section).toBe("gaps");
    expect(answerIntent("nextStep", ctx, "en").section).toBe("plan");
    expect(answerIntent("resources", ctx, "en").section).toBeUndefined();
    const jobs = answerIntent("jobs", ctx, "en");
    expect(jobs.section).toBe("jobs");
    expect(jobs.roleId).toBe("software_engineer");
    expect(jobs.sources).toEqual(getIntent("jobs").sources);
    // without the analysis: the "run it first" answer opens the readiness tab
    const need = answerIntent("jobs", empty, "en");
    expect(need.grounded).toBe(false);
    expect(need.section).toBe("readiness");
  });

  it("suggests the closest suggested questions for an unknown question", () => {
    const unknown = answerQuestion("Is my salary good for my role?", ctx, "en");
    expect(unknown.grounded).toBe(false);
    expect(unknown.followUps.slice(0, 2)).toEqual(["bestRole", "roleRequirements"]);
    expect(closestSuggestions("salary role", a)).toEqual(["bestRole", "roleRequirements"]);
    // nothing in common: the usual three
    expect(answerQuestion("xyzzy plugh", ctx, "en").followUps).toEqual(getIntent("help").followUps);
  });

  it("uses the updated notice text", () => {
    expect(a.note).toContain("255 real Sri Lankan job ads");
    expect(a.note).toContain("synthetic job ads");
  });
});

describe("assistant UI", () => {
  it("keeps the notice under 'How this works', suggests jobs and certifications, and opens sections", async () => {
    const onOpen = jest.fn();
    const user = userEvent.setup();
    render(withLanguage(<CareerAssistant profile={profile} interview={null} onOpenSection={onOpen} />));
    expect(screen.getByText(new RegExp(a.howItWorks))).toBeInTheDocument();
    expect(screen.getByTestId("c3-assistant-note")).toHaveTextContent("255 real Sri Lankan job ads");
    expect(screen.getByRole("button", { name: a.qJobs })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: a.qCertifications })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: a.qGaps }));
    await user.click(screen.getByRole("button", { name: new RegExp(a.openGaps) }));
    expect(onOpen).toHaveBeenCalledWith("gaps");

    await user.click(screen.getByRole("button", { name: a.qNextStep }));
    await user.click(screen.getAllByRole("button", { name: new RegExp(a.openPlan) })[0]);
    expect(onOpen).toHaveBeenCalledWith("plan");
  });

  it("opens the matched Career job board for 'Which jobs fit me?' without putting skills in the URL", async () => {
    const user = userEvent.setup();
    render(withLanguage(<CareerAssistant profile={profile} interview={null} />));
    await user.click(screen.getByRole("button", { name: a.qJobs }));
    const link = screen.getByRole("link", { name: new RegExp(a.openJobs) });
    expect(link).toHaveAttribute("href", "/dashboard/student#career");
    link.addEventListener("click", (e) => e.preventDefault()); // jsdom cannot navigate
    await user.click(link);
    expect(readJobMatchContext()?.roleId).toBe("software_engineer");
    expect(window.location.href).not.toMatch(/prog_oop|levels/);
  });

  it("hides the section button when there is nowhere to open it", async () => {
    const user = userEvent.setup();
    render(withLanguage(<CareerAssistant profile={profile} interview={null} />));
    await user.click(screen.getByRole("button", { name: a.qGaps }));
    expect(screen.queryByRole("button", { name: new RegExp(a.openGaps) })).not.toBeInTheDocument();
  });
});

describe("mock interview UI", () => {
  it("leads with what went well and what to improve, and the summary lists every answer", async () => {
    const onOpenPlan = jest.fn();
    const user = userEvent.setup();
    render(
      withLanguage(
        <MockInterview levels={{ testing_manual: 1, communication: 2 }} targetRoleIds={["qa_engineer"]} onOpenPlan={onOpenPlan} />
      )
    );
    expect(screen.getByText(new RegExp(en.ivHowItWorks))).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(en.ivCount), "4");
    await user.click(screen.getByRole("button", { name: en.ivStart }));

    const answers = [
      "First I would explain the main idea, then give an example from my project where I used Selenium and tests to reduce bugs by 30%.",
      "Not sure.",
      "Not sure.",
      "Not sure."
    ];
    for (let i = 0; i < answers.length; i++) {
      await user.click(screen.getByLabelText(en.ivAnswer));
      await user.paste(answers[i]);
      await user.click(screen.getByRole("button", { name: en.ivSubmit }));
      const feedback = screen.getByTestId("c3-iv-feedback");
      expect(within(feedback).getByTestId("c3-iv-went-well")).toBeInTheDocument();
      expect(within(feedback).getByText(en.ivDetails)).toBeInTheDocument();
      if (i === 1) expect(within(feedback).getByTestId("c3-iv-to-improve")).toHaveTextContent(en.ivToImprove);
      await user.click(screen.getByRole("button", { name: i < answers.length - 1 ? en.ivNext : en.ivFinish }));
    }

    const list = screen.getByTestId("c3-iv-answers");
    expect(within(list).getAllByRole("listitem")).toHaveLength(4);
    expect(list).toHaveTextContent(/Q1: \d+\/100/);
    expect(within(list).getByTestId("c3-iv-best")).toHaveTextContent(en.ivStrongest);
    expect(within(list).getByTestId("c3-iv-worst")).toHaveTextContent(en.ivWeakestTag);
    expect(screen.getByTestId("c3-iv-plan-steps")).toHaveTextContent(/next step:/);
    expect(screen.getByRole("button", { name: en.ivChangeRole })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: en.ivOpenPlan }));
    expect(onOpenPlan).toHaveBeenCalled();
  });
});
