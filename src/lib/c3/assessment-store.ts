/**
 * C3 - stored career assessments and the anonymous staff aggregate.
 *
 * Data minimisation: a stored record holds only the questionnaire answers (year,
 * target roles, skill levels), the model version and timestamps. No name, no CV text
 * (CV-derived skills are already folded into the levels on the student's device).
 * Staff only ever receive aggregates, and every count below C3_MIN_GROUP_SIZE is hidden.
 */
import { C3_MIN_GROUP_SIZE } from "./config";
import demoCohortJson from "./model/demo-cohort.json";
import { proposedGaps } from "./gaps";
import { ROLE_IDS, SKILL_IDS, careerModel, getRole } from "./model";
import { proposedReadiness, readinessBand } from "./readiness";
import type { CareerProfile } from "./validation";

export type StoredCareerAssessment = {
  userId?: string;
  firebaseUid?: string;
  profile: CareerProfile;
  modelVersion: string;
  syntheticTraining: boolean;
  consentAt: string;
  updatedAt: string;
};

export type RoleAggregate = {
  roleId: string;
  /** Students whose target roles include this role (null when below the minimum group size). */
  targetedBy: number | null;
  meanReadiness: number | null;
  bands: { strong: number; developing: number; early: number } | null;
};

export type CareerAggregate = {
  source: "stored" | "synthetic-demo";
  students: number;
  minGroupSize: number;
  suppressed: boolean;
  byYear: { year3: number | null; year4: number | null };
  roles: RoleAggregate[];
  commonGaps: Array<{ skillId: string; students: number; share: number }>;
  skillCoverage: Array<{ skillId: string; shareAtLeastBasic: number; meanLevel: number }>;
  modelVersion: string;
  syntheticTraining: boolean;
};

const hide = (n: number) => (n >= C3_MIN_GROUP_SIZE ? n : null);

export function buildAggregate(profiles: CareerProfile[], source: CareerAggregate["source"]): CareerAggregate {
  const n = profiles.length;
  const base = {
    source,
    students: n,
    minGroupSize: C3_MIN_GROUP_SIZE,
    modelVersion: careerModel.version,
    syntheticTraining: /synthetic/i.test(careerModel.trainedOn)
  };
  if (n < C3_MIN_GROUP_SIZE) {
    return { ...base, suppressed: true, byYear: { year3: null, year4: null }, roles: [], commonGaps: [], skillCoverage: [] };
  }

  const roles: RoleAggregate[] = ROLE_IDS.map((roleId) => {
    const role = getRole(roleId);
    const targeting = profiles.filter((p) => p.targetRoleIds.includes(roleId));
    if (!role || targeting.length < C3_MIN_GROUP_SIZE) return { roleId, targetedBy: hide(targeting.length), meanReadiness: null, bands: null };
    const scores = targeting.map((p) => proposedReadiness(p.skills, role).score);
    const bands = { strong: 0, developing: 0, early: 0 };
    for (const s of scores) bands[readinessBand(s)] += 1;
    return { roleId, targetedBy: targeting.length, meanReadiness: scores.reduce((a, b) => a + b, 0) / scores.length, bands };
  });

  // most common top-3 gaps for each student's primary target role
  const gapCounts = new Map<string, number>();
  for (const p of profiles) {
    const role = getRole(p.targetRoleIds[0]);
    if (!role) continue;
    for (const g of proposedGaps(p.skills, role).slice(0, 3)) gapCounts.set(g.skillId, (gapCounts.get(g.skillId) ?? 0) + 1);
  }
  const commonGaps = [...gapCounts.entries()]
    .filter(([, c]) => c >= C3_MIN_GROUP_SIZE)
    .sort((a, b) => b[1] - a[1] || SKILL_IDS.indexOf(a[0]) - SKILL_IDS.indexOf(b[0]))
    .slice(0, 8)
    .map(([skillId, students]) => ({ skillId, students, share: students / n }));

  const skillCoverage = SKILL_IDS.map((skillId) => {
    const levels = profiles.map((p) => p.skills[skillId] ?? 0);
    return {
      skillId,
      shareAtLeastBasic: levels.filter((l) => l >= 1).length / n,
      meanLevel: levels.reduce((a, b) => a + b, 0) / n
    };
  });

  return {
    ...base,
    suppressed: false,
    byYear: { year3: hide(profiles.filter((p) => p.yearOfStudy === 3).length), year4: hide(profiles.filter((p) => p.yearOfStudy === 4).length) },
    roles,
    commonGaps,
    skillCoverage
  };
}

// ---------------------------------------------------------------- demo-mode store
const demoStore = new Map<string, StoredCareerAssessment>();

function identityKey(identity: { userId?: string; firebaseUid?: string }) {
  return identity.userId ?? identity.firebaseUid ?? "anonymous";
}

export function saveDemoCareerAssessment(record: StoredCareerAssessment) {
  demoStore.set(identityKey(record), record);
}

export function getDemoCareerAssessment(identity: { userId?: string; firebaseUid?: string }) {
  return demoStore.get(identityKey(identity)) ?? null;
}

export function deleteDemoCareerAssessment(identity: { userId?: string; firebaseUid?: string }) {
  demoStore.delete(identityKey(identity));
}

/** Synthetic generated students (labelled) so the staff view has something to show in demo mode. */
export const demoCohort = (demoCohortJson as unknown as { students: CareerProfile[] }).students;

export function demoAggregateProfiles(): CareerProfile[] {
  return [...demoCohort, ...[...demoStore.values()].map((r) => r.profile)];
}
