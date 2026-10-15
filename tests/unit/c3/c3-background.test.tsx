import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CareerGuidanceTool } from "@/components/c3/career-guidance-tool";
import { LanguageProvider } from "@/context/language-context";
import { answerIntent } from "@/lib/c3/assistant";
import { assessCareer } from "@/lib/c3/assessment";
import { getC3Text } from "@/lib/c3/i18n";
import { ROLE_IDS } from "@/lib/c3/model";
import { COMMON_ROLES, backgroundTips, orderRolesForSpecialisation } from "@/lib/c3/specialisation-roles";
import { assessmentRequestSchema, careerProfileSchema, parseCareerProfile, SPECIALISATIONS, type CareerProfile } from "@/lib/c3/validation";

const withLanguage = (ui: React.ReactElement) => <LanguageProvider>{ui}</LanguageProvider>;
const en = getC3Text("en");
const base = { yearOfStudy: 3, targetRoleIds: ["qa_engineer"], skills: { testing_manual: 1, communication: 2 } };

afterEach(() => window.localStorage.clear());

describe("background in the profile (context only)", () => {
  it("accepts a full or partial background and old profiles without one", () => {
    expect(careerProfileSchema.safeParse({ ...base, background: { specialisation: "SE", internship: "doing", projects: "3-5" } }).success).toBe(true);
    expect(careerProfileSchema.safeParse({ ...base, background: { internship: "notStarted" } }).success).toBe(true);
    expect(careerProfileSchema.safeParse({ ...base, background: {} }).success).toBe(true);
    expect(careerProfileSchema.safeParse(base).success).toBe(true);
    expect(assessmentRequestSchema.safeParse({ profile: { ...base, background: { projects: "0" } }, consent: true }).success).toBe(true);
  });

  it("rejects unknown values and unknown keys inside background", () => {
    expect(careerProfileSchema.safeParse({ ...base, background: { specialisation: "Physics" } }).success).toBe(false);
    expect(careerProfileSchema.safeParse({ ...base, background: { projects: "10" } }).success).toBe(false);
    expect(careerProfileSchema.safeParse({ ...base, background: { gpa: 3.9 } }).success).toBe(false);
    expect(assessmentRequestSchema.safeParse({ profile: base, consent: true, score: 99 }).success).toBe(false);
  });

  it("loads a stored profile even if its background is no longer valid", () => {
    expect(parseCareerProfile(base)).toEqual(base);
    expect(parseCareerProfile({ ...base, background: { specialisation: "Physics" } })).toEqual(base);
    expect(parseCareerProfile({ ...base, yearOfStudy: 7 })).toBeNull();
  });

  it("never changes readiness, gaps or plans", () => {
    const withBg: CareerProfile = { ...(base as CareerProfile), background: { specialisation: "DS", internship: "notStarted", projects: "0" } };
    expect(assessCareer(withBg)).toEqual(assessCareer(base as CareerProfile));
  });
});

describe("specialisation map (UI hint)", () => {
  it("covers every specialisation, uses real role ids and never drops a role", () => {
    for (const spec of SPECIALISATIONS) {
      for (const id of COMMON_ROLES[spec]) expect(ROLE_IDS).toContain(id);
      const ordered = orderRolesForSpecialisation(ROLE_IDS, spec);
      expect([...ordered].sort()).toEqual([...ROLE_IDS].sort());
      expect(ordered.slice(0, COMMON_ROLES[spec].length)).toEqual(COMMON_ROLES[spec]);
    }
    expect(orderRolesForSpecialisation(ROLE_IDS, "Other")).toEqual(ROLE_IDS);
    expect(orderRolesForSpecialisation(ROLE_IDS, undefined)).toEqual(ROLE_IDS);
  });

  it("gives at most three tips, and none without a background", () => {
    expect(backgroundTips(undefined, "qa_engineer", "test_automation")).toEqual([]);
    const tips = backgroundTips({ specialisation: "DS", internship: "notStarted", projects: "1-2" }, "qa_engineer", "test_automation");
    expect(tips.map((t) => t.code)).toEqual(["internshipFind", "portfolio", "outsideSpecialisation"]);
    expect(backgroundTips({ projects: "6+", internship: "completed" }, "qa_engineer", null).map((t) => t.code)).toEqual(["internshipEvidence", "showcase"]);
  });
});

describe("background in the wizard", () => {
  it("moves the specialisation's common roles first with a badge, keeps all 12 and selects none", async () => {
    const user = userEvent.setup();
    render(withLanguage(<CareerGuidanceTool />));
    const chipsBefore = screen.getAllByRole("checkbox");
    expect(chipsBefore).toHaveLength(12);
    await user.click(screen.getByRole("radio", { name: en.specSE }));
    expect(screen.getByRole("radio", { name: en.specSE })).toHaveAttribute("aria-checked", "true");
    const chips = screen.getAllByRole("checkbox");
    expect(chips).toHaveLength(12);
    expect(chips.slice(0, 4).map((c) => c.getAttribute("aria-label"))).toEqual(["Software Engineer", "Front-end Engineer", "Mobile App Developer", "QA Engineer"]);
    for (const c of chips) expect(c).toHaveAttribute("aria-checked", "false");
    expect(chips[0]).toHaveAccessibleDescription(en.commonBadge);
    expect(chips[5]).not.toHaveAccessibleDescription(en.commonBadge);
    expect(within(chips[0]).getByText(new RegExp(en.commonBadge))).toBeInTheDocument();
    // a second click clears the optional choice and restores the catalogue order
    await user.click(screen.getByRole("radio", { name: en.specSE }));
    expect(screen.getAllByRole("checkbox")[0]).toHaveAttribute("aria-label", "Software Engineer");
    expect(screen.queryByText(new RegExp(en.commonBadge))).not.toBeInTheDocument();
  });

  it("shows the year as context and background tips above the unchanged plan", async () => {
    const seen: CareerProfile[] = [];
    const user = userEvent.setup();
    render(withLanguage(<CareerGuidanceTool onResult={(p) => seen.push(p)} />));
    await user.click(screen.getByRole("radio", { name: en.intNotStarted }));
    await user.click(screen.getByRole("radio", { name: "1-2" }));
    await user.click(screen.getByRole("checkbox", { name: "QA Engineer" }));
    await user.click(screen.getByRole("button", { name: /Next/ }));
    await user.click(screen.getByRole("button", { name: en.analyse }));
    expect(screen.getByTestId("c3-year-context")).toHaveTextContent(en.yearContext3);
    const tips = screen.getByTestId("c3-background-tips");
    expect(tips).toHaveTextContent(en.tipInternshipFind);
    expect(tips).toHaveTextContent(/portfolio project that uses/);
    expect(seen[0].background).toEqual({ internship: "notStarted", projects: "1-2" });
    // the tips sit before the plan
    const plan = screen.getByTestId("c3-plan");
    expect(tips.compareDocumentPosition(plan) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("shows no tips card and sends no background when nothing was chosen", async () => {
    const seen: CareerProfile[] = [];
    const user = userEvent.setup();
    render(withLanguage(<CareerGuidanceTool onResult={(p) => seen.push(p)} />));
    await user.click(screen.getByRole("button", { name: en.loadExample }));
    await user.click(screen.getByRole("button", { name: en.analyse }));
    expect(screen.queryByTestId("c3-background-tips")).not.toBeInTheDocument();
    expect(seen[0]).not.toHaveProperty("background");
  });

  it("loads a saved profile with and without background", async () => {
    const user = userEvent.setup();
    const { unmount } = render(withLanguage(<CareerGuidanceTool initialProfile={base as CareerProfile} />));
    expect(await screen.findByRole("heading", { name: en.stepSkills })).toBeInTheDocument();
    unmount();
    render(withLanguage(<CareerGuidanceTool initialProfile={{ ...(base as CareerProfile), background: { specialisation: "CS" } }} />));
    await user.click(await screen.findByRole("button", { name: /Back/ }));
    expect(screen.getByRole("radio", { name: en.specCS })).toHaveAttribute("aria-checked", "true");
    expect(screen.getAllByRole("checkbox")[0]).toHaveAttribute("aria-label", "Cybersecurity Analyst");
  });
});

describe("background in the assistant (context only)", () => {
  it("adds the tips to the 'what next' answer without changing anything else", () => {
    const assessment = assessCareer(base as CareerProfile);
    const plain = answerIntent("nextStep", { assessment, interview: null }, "en");
    const withBg = answerIntent("nextStep", { assessment, interview: null, background: { internship: "notStarted" } }, "en");
    expect(withBg.lines.slice(0, plain.lines.length)).toEqual(plain.lines);
    expect(withBg.lines.map((l) => l.text)).toContain(en.tipInternshipFind);
    expect(answerIntent("readiness", { assessment, interview: null, background: { internship: "notStarted" } }, "en").lines).toEqual(
      answerIntent("readiness", { assessment, interview: null }, "en").lines
    );
  });
});
