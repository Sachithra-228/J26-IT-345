/**
 * C3 - academic background as CONTEXT for the student UI (Objective 1).
 *
 * UI HINT ONLY, NOT A MODEL INPUT: this map just puts the roles that students of a
 * SLIIT specialisation commonly aim for first in the role picker, with a badge. It
 * never hides or pre-selects a role, and readiness, gaps and plans never read it.
 * The mapping is the researcher's assumption and should be checked with SLIIT staff.
 */
import type { Language } from "@/context/language-context";
import { fmt, label, type C3Text } from "./i18n";
import { getRole, getSkill } from "./model";
import type { Background, Specialisation } from "./validation";

export const COMMON_ROLES: Record<Specialisation, string[]> = {
  IT: ["software_engineer", "qa_engineer", "business_analyst", "devops_engineer"],
  SE: ["software_engineer", "frontend_engineer", "mobile_developer", "qa_engineer"],
  DS: ["data_analyst", "data_scientist"],
  CSNE: ["network_engineer", "devops_engineer"],
  CS: ["cybersecurity_analyst", "network_engineer"],
  ISE: ["business_analyst", "project_coordinator", "software_engineer"],
  IM: ["ui_ux_designer", "frontend_engineer"],
  Other: []
};

export function commonRolesFor(specialisation: Specialisation | undefined): string[] {
  return specialisation ? COMMON_ROLES[specialisation] : [];
}

/**
 * Orders role ids so the specialisation's common roles come first (in the map's
 * order); every role stays, and the rest keep their original order.
 */
export function orderRolesForSpecialisation(roleIds: string[], specialisation: Specialisation | undefined): string[] {
  const common = commonRolesFor(specialisation).filter((id) => roleIds.includes(id));
  return [...common, ...roleIds.filter((id) => !common.includes(id))];
}

export type BackgroundTip =
  | { code: "internshipFind" }
  | { code: "internshipUse"; skillId: string | null }
  | { code: "internshipEvidence" }
  | { code: "portfolio"; skillId: string | null }
  | { code: "showcase" }
  | { code: "outsideSpecialisation"; roleId: string; specialisation: Specialisation };

/**
 * Up to three text tips from the background. They sit next to the Gap-to-Action plan
 * and never change it. `topGapSkillId` is the role's most valuable gap, if any.
 */
export function backgroundTips(background: Background | undefined, roleId: string, topGapSkillId: string | null): BackgroundTip[] {
  if (!background) return [];
  const tips: BackgroundTip[] = [];
  if (background.internship === "notStarted") tips.push({ code: "internshipFind" });
  else if (background.internship === "doing") tips.push({ code: "internshipUse", skillId: topGapSkillId });
  else if (background.internship === "completed") tips.push({ code: "internshipEvidence" });
  if (background.projects === "0" || background.projects === "1-2") tips.push({ code: "portfolio", skillId: topGapSkillId });
  else if (background.projects === "3-5" || background.projects === "6+") tips.push({ code: "showcase" });
  const spec = background.specialisation;
  if (spec && spec !== "Other" && !COMMON_ROLES[spec].includes(roleId)) {
    tips.push({ code: "outsideSpecialisation", roleId, specialisation: spec });
  }
  return tips.slice(0, 3);
}

const SPEC_KEY: Record<Specialisation, keyof C3Text> = {
  IT: "specIT",
  SE: "specSE",
  DS: "specDS",
  CSNE: "specCSNE",
  CS: "specCS",
  ISE: "specISE",
  IM: "specIM",
  Other: "specOther"
};

export function specialisationName(spec: Specialisation, t: C3Text): string {
  return t[SPEC_KEY[spec]];
}

/** The tip in the student's language (used by the results page and the assistant). */
export function backgroundTipText(tip: BackgroundTip, t: C3Text, language: Language): string {
  const skill = (id: string | null) => {
    const s = id ? getSkill(id) : undefined;
    return s ? label(s.label, language) : null;
  };
  switch (tip.code) {
    case "internshipFind":
      return t.tipInternshipFind;
    case "internshipUse": {
      const name = skill(tip.skillId);
      return name ? fmt(t.tipInternshipUse, { skill: name }) : t.tipInternshipUseAny;
    }
    case "internshipEvidence":
      return t.tipInternshipEvidence;
    case "portfolio": {
      const name = skill(tip.skillId);
      return name ? fmt(t.tipPortfolio, { skill: name }) : t.tipPortfolioAny;
    }
    case "showcase":
      return t.tipShowcase;
    case "outsideSpecialisation": {
      const role = getRole(tip.roleId);
      return fmt(t.tipOutsideSpec, { role: role ? label(role.label, language) : tip.roleId, spec: specialisationName(tip.specialisation, t) });
    }
  }
}
