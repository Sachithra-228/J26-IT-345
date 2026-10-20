import {
  computeAssessmentCommitment,
  decryptFinancialProfile,
  encryptFinancialProfile,
  type EncryptedProfilePayload
} from "./encryption";
import { DEMO_STUDENT_ID, DEMO_STUDENT_SALT, studentRefFor } from "./chain-notifications";
import type { VulnerabilityAssessment, StudentFinancialProfile } from "./vulnerability";

/** Stored record returned to the student who owns it. */
export type StoredAssessment = {
  userId?: string;
  firebaseUid?: string;
  studentName: string;
  university?: string;
  profile: StudentFinancialProfile;
  assessment: VulnerabilityAssessment;
  consentAt: string;
  updatedAt: string;
};

/**
 * MongoDB / storage document (`c1_assessments`).
 * Raw financial figures (`profile`) are encrypted at rest with AES-256-GCM (NFR02)
 * so raw socioeconomic answers are never stored in plaintext.
 */
export type EncryptedAssessmentDoc = {
  userId?: string;
  firebaseUid?: string;
  studentName: string;
  university?: string;
  encryptedProfile: EncryptedProfilePayload;
  assessment: VulnerabilityAssessment;
  assessmentHash: string;
  consentAt: string;
  updatedAt: string;
};

/** What a welfare officer sees: derived need signals + on-chain commitment hashes only (data minimisation). */
export type AdminQueueItem = {
  id: string;
  studentName: string;
  university?: string;
  vulnerabilityIndex: number;
  band: VulnerabilityAssessment["band"];
  flaggedVulnerable: boolean;
  topFactors: VulnerabilityAssessment["topFactors"];
  modelVersion: string;
  syntheticTraining: boolean;
  assessedAt: string;
  /** Cryptographic commitment to the assessment (`bytes32` for `ScholarshipEscrow.awardScholarship`). */
  assessmentHash?: string;
  /** Pseudonymous `studentRef` (`bytes32` for `ScholarshipEscrow.awardScholarship`) when salt is available. */
  studentRef?: string;
};

function computeStudentRefForQueue(record: { userId?: string; firebaseUid?: string }): string | undefined {
  const salt = process.env.C1_STUDENT_REF_SALT?.trim();
  const id = record.userId ?? record.firebaseUid;
  if (salt && id) return studentRefFor(id, salt);
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    return studentRefFor(id ?? DEMO_STUDENT_ID, DEMO_STUDENT_SALT);
  }
  return undefined;
}

/** Encrypts the student's raw financial profile into an at-rest storage document (NFR02). */
export function toEncryptedAssessmentDoc(record: StoredAssessment, secret?: string): EncryptedAssessmentDoc {
  return {
    userId: record.userId,
    firebaseUid: record.firebaseUid,
    studentName: record.studentName,
    university: record.university,
    encryptedProfile: encryptFinancialProfile(record.profile, secret),
    assessment: record.assessment,
    assessmentHash: computeAssessmentCommitment(record),
    consentAt: record.consentAt,
    updatedAt: record.updatedAt
  };
}

/** Decrypts a stored document back into a `StoredAssessment` for the owning student. */
export function fromEncryptedAssessmentDoc(
  doc: Partial<EncryptedAssessmentDoc> & { profile?: StudentFinancialProfile },
  secret?: string
): StoredAssessment | null {
  if (!doc || !doc.assessment || !doc.consentAt || !doc.updatedAt) return null;
  let profile: StudentFinancialProfile | undefined;
  if (doc.encryptedProfile) {
    try {
      profile = decryptFinancialProfile(doc.encryptedProfile, secret);
    } catch {
      return null;
    }
  } else if (doc.profile) {
    profile = doc.profile;
  }
  if (!profile) return null;
  return {
    userId: doc.userId,
    firebaseUid: doc.firebaseUid,
    studentName: doc.studentName ?? "Student",
    university: doc.university,
    profile,
    assessment: doc.assessment,
    consentAt: doc.consentAt,
    updatedAt: doc.updatedAt
  };
}

export function toAdminQueueItem(
  record: Pick<
    StoredAssessment,
    "userId" | "firebaseUid" | "studentName" | "university" | "assessment" | "consentAt" | "updatedAt"
  > & { assessmentHash?: string },
  id: string
): AdminQueueItem {
  const assessmentHash =
    record.assessmentHash ??
    computeAssessmentCommitment({
      userId: record.userId,
      firebaseUid: record.firebaseUid,
      assessment: record.assessment,
      consentAt: record.consentAt
    });
  const studentRef = computeStudentRefForQueue(record);
  return {
    id,
    studentName: record.studentName,
    university: record.university,
    vulnerabilityIndex: record.assessment.vulnerabilityIndex,
    band: record.assessment.band,
    flaggedVulnerable: record.assessment.flaggedVulnerable,
    topFactors: record.assessment.topFactors,
    modelVersion: record.assessment.modelVersion,
    syntheticTraining: record.assessment.syntheticTraining,
    assessedAt: record.updatedAt,
    assessmentHash,
    ...(studentRef ? { studentRef } : {})
  };
}

// ---------------------------------------------------------------- demo-mode store (encrypted at rest)
const demoStore = new Map<string, EncryptedAssessmentDoc>();

function identityKey(record: Pick<StoredAssessment, "userId" | "firebaseUid">) {
  return record.userId ?? record.firebaseUid ?? "anonymous";
}

export function saveDemoAssessment(record: StoredAssessment) {
  demoStore.set(identityKey(record), toEncryptedAssessmentDoc(record));
}

export function getDemoAssessment(identity: { userId?: string; firebaseUid?: string }): StoredAssessment | null {
  const doc = demoStore.get(identityKey(identity));
  return doc ? fromEncryptedAssessmentDoc(doc) : null;
}

export function getRawDemoEncryptedDoc(
  identity: { userId?: string; firebaseUid?: string }
): EncryptedAssessmentDoc | null {
  return demoStore.get(identityKey(identity)) ?? null;
}

export function deleteDemoAssessment(identity: { userId?: string; firebaseUid?: string }) {
  demoStore.delete(identityKey(identity));
}

export function listDemoAssessments(): Array<{ id: string; record: EncryptedAssessmentDoc }> {
  return [...demoStore.entries()].map(([id, record]) => ({ id, record }));
}
