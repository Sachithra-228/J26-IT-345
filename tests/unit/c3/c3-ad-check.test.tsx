import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CareerGuidanceTool } from "@/components/c3/career-guidance-tool";
import { LanguageProvider } from "@/context/language-context";
import { checkAgainstAd, closestRoles, firstActionFor, roleSimilarity } from "@/lib/c3/ad-check";
import { assessCareer } from "@/lib/c3/assessment";
import { getC3Text } from "@/lib/c3/i18n";
import { careerModel, getRole, type RoleProfile } from "@/lib/c3/model";
import type { CareerProfile } from "@/lib/c3/validation";

const en = getC3Text("en");
const withLanguage = (ui: React.ReactElement) => <LanguageProvider>{ui}</LanguageProvider>;

/** Made-up ad text (not a real advertisement). */
const QA_AD = `Software Engineer in Test - Colombo
We are looking for a QA person to join our team.
Requirements: experience with manual testing and writing test cases, test automation with Selenium,
basic SQL, Git, basic Linux commands and good communication skills. Knowledge of Agile / Scrum is an advantage.
Send your CV to careers@example.com or call 0771234567.`;

describe("checkAgainstAd (logic)", () => {
  it("splits the ad's skills into have / still to learn using the student's levels", () => {
    const res = checkAgainstAd(QA_AD, { testing_manual: 2, communication: 3, databases_sql: 1 });
    const ids = res.skills.map((s) => s.skillId);
    expect(ids).toEqual(expect.arrayContaining(["testing_manual", "test_automation", "databases_sql", "version_control", "communication", "agile"]));
    expect(res.skills.filter((s) => s.have).map((s) => s.skillId).sort()).toEqual(["communication", "databases_sql", "testing_manual"]);
    expect(res.have).toBe(3);
    expect(res.missing).toBe(ids.length - 3);
    expect(res.match).toBeCloseTo(3 / ids.length);
    expect(res.enoughSkills).toBe(true);
    // contact details are stripped before extraction, as for CVs
    expect(res.redacted).toBeGreaterThanOrEqual(2);
  });

  it("maps an unfamiliar title to the closest role family", () => {
    const res = checkAgainstAd(QA_AD, {});
    expect(res.closestRoles[0].roleId).toBe("qa_engineer");
    expect(res.closestRoles.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < res.closestRoles.length; i++) {
      expect(res.closestRoles[i - 1].similarity).toBeGreaterThanOrEqual(res.closestRoles[i].similarity);
    }
  });

  it("suggests the least-effort action that teaches a missing skill", () => {
    const res = checkAgainstAd(QA_AD, {});
    const auto = res.skills.find((s) => s.skillId === "test_automation");
    expect(auto?.nextAction).toEqual(firstActionFor("test_automation", 0));
    expect(auto?.nextAction?.effortHours).toBeGreaterThan(0);
    expect(res.skills.find((s) => s.have)?.nextAction ?? null).toBeNull();
  });

  it("handles text with no or few known skills", () => {
    const none = checkAgainstAd("We are a friendly company in Kandy. Apply now!", {});
    expect(none.skills).toEqual([]);
    expect(none.match).toBeNull();
    expect(none.closestRoles).toEqual([]);
    expect(checkAgainstAd("Python developer", {}).enoughSkills).toBe(false);
  });

  it("cosine similarity is 1 for a role's own skills spread evenly and 0 without overlap", () => {
    const flat: RoleProfile = { ...(getRole("qa_engineer") as RoleProfile), skills: ["python", "linux"].map((skillId) => ({ skillId, weight: 0.5, tf: 1, idf: 1, requiredLevel: 1, levelCounts: [1, 0, 0], adsMentioning: 1 })) };
    expect(roleSimilarity(["python", "linux"], flat)).toBeCloseTo(1);
    expect(roleSimilarity(["ui_ux"], flat)).toBe(0);
    expect(roleSimilarity([], flat)).toBe(0);
    expect(closestRoles(["ui_ux"], [flat])).toEqual([]);
  });

  it("never changes readiness, gaps or plans", () => {
    const profile = { yearOfStudy: 3, targetRoleIds: ["qa_engineer"], skills: { testing_manual: 1 } } as CareerProfile;
    const before = assessCareer(profile);
    checkAgainstAd(QA_AD, before.levels);
    expect(assessCareer(profile)).toEqual(before);
    expect(careerModel.roles).toHaveLength(12);
  });
});

describe("Check me against a job ad (UI)", () => {
  async function toResults() {
    const user = userEvent.setup();
    render(withLanguage(<CareerGuidanceTool />));
    await user.click(screen.getByRole("button", { name: en.loadExample }));
    await user.click(screen.getByRole("button", { name: en.analyse }));
    return user;
  }

  it("checks a pasted ad, lists have / missing skills and opens the closest role", async () => {
    const user = await toResults();
    const card = screen.getByTestId("c3-ad-check");
    const button = within(card).getByRole("button", { name: en.acButton });
    expect(button).toBeDisabled();
    await user.click(within(card).getByLabelText(en.acLabel));
    await user.paste(QA_AD);
    await user.click(button);
    const res = screen.getByTestId("c3-ad-check-result");
    expect(within(res).getByTestId("c3-ad-check-match")).toHaveTextContent(/You have \d+ of the \d+ skills/);
    expect(within(res).getByTestId("c3-ad-check-missing")).toHaveTextContent("First step:");
    const roles = within(res).getByTestId("c3-ad-check-roles");
    // the example targets QA first, so open the last suggested role to prove the click switches role
    const expected = checkAgainstAd(QA_AD, {}).closestRoles.map((r) => r.roleId);
    expect(expected.length).toBeGreaterThan(1);
    const chips = within(roles).getAllByRole("button");
    expect(chips).toHaveLength(expected.length);
    await user.click(chips[chips.length - 1]);
    expect(screen.getByTestId(`c3-role-${expected[expected.length - 1]}`)).toHaveAttribute("aria-pressed", "true");
    // the result stays after switching role, and Clear removes text and result
    await user.click(within(screen.getByTestId("c3-ad-check")).getByRole("button", { name: en.acClear }));
    expect(screen.queryByTestId("c3-ad-check-result")).not.toBeInTheDocument();
    expect(within(screen.getByTestId("c3-ad-check")).getByLabelText(en.acLabel)).toHaveValue("");
  });

  it("explains when the text has no known skills", async () => {
    const user = await toResults();
    const card = screen.getByTestId("c3-ad-check");
    await user.type(within(card).getByLabelText(en.acLabel), "Great team, great salary!");
    await user.click(within(card).getByRole("button", { name: en.acButton }));
    expect(screen.getByTestId("c3-ad-check-result")).toHaveTextContent(en.acNone);
  });
});
