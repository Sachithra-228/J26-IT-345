/**
 * C1 - AES-256-GCM off-chain encryption at rest for sensitive student financial
 * profiles (Proposal NFR02 / FR01) and cryptographic commitment hashes (NFR04).
 *
 * Raw socioeconomic figures (income, loan, guardian employment, etc.) are encrypted
 * with AES-256-GCM (random 96-bit IV + 128-bit authentication tag) before being
 * written to MongoDB (`c1_assessments`). Welfare officers only read derived signals
 * (`vulnerabilityIndex`, `band`, `topFactors`) and never decrypt the raw profile;
 * only the student who owns the record receives the decrypted profile.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { keccak256, toUtf8Bytes } from "ethers";
import { parseProfile } from "./validation";
import type { StudentFinancialProfile, VulnerabilityAssessment } from "./vulnerability";

export const ENCRYPTION_ALGORITHM = "aes-256-gcm" as const;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const DEV_FALLBACK_SECRET = "unicare-c1-dev-aes256-fallback-key-do-not-use-in-prod";

export type EncryptedProfilePayload = {
  alg: "AES-256-GCM";
  iv: string;
  tag: string;
  ciphertext: string;
};

/** True when a dedicated encryption secret is configured in the environment. */
export function hasConfiguredEncryptionKey(): boolean {
  return Boolean(process.env.C1_ENCRYPTION_KEY && process.env.C1_ENCRYPTION_KEY.trim().length >= 16);
}

function deriveKey(secret?: string): Buffer {
  const raw =
    secret ??
    (process.env.C1_ENCRYPTION_KEY?.trim() ||
      process.env.C1_STUDENT_REF_SALT?.trim() ||
      DEV_FALLBACK_SECRET);
  return createHash("sha256").update(raw, "utf8").digest();
}

/** Encrypts a student's financial profile using AES-256-GCM with a fresh 96-bit IV. */
export function encryptFinancialProfile(
  profile: StudentFinancialProfile,
  secret?: string
): EncryptedProfilePayload {
  const key = deriveKey(secret);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv, { authTagLength: TAG_BYTES });
  const plaintext = JSON.stringify(profile);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    alg: "AES-256-GCM",
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: encrypted.toString("base64")
  };
}

/** Decrypts and schema-validates an AES-256-GCM encrypted student financial profile. */
export function decryptFinancialProfile(
  payload: EncryptedProfilePayload,
  secret?: string
): StudentFinancialProfile {
  if (!payload || payload.alg !== "AES-256-GCM") {
    throw new Error("Unsupported encryption algorithm.");
  }
  const key = deriveKey(secret);
  const iv = Buffer.from(payload.iv, "base64");
  const tag = Buffer.from(payload.tag, "base64");
  const ciphertext = Buffer.from(payload.ciphertext, "base64");
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
    throw new Error("Invalid AES-256-GCM IV or authentication tag length.");
  }
  const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv, { authTagLength: TAG_BYTES });
  decipher.setAuthTag(tag);
  const json = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  const parsed = parseProfile(JSON.parse(json));
  if (!parsed) {
    throw new Error("Decrypted profile failed schema validation.");
  }
  return parsed;
}

/**
 * Deterministic `bytes32` commitment hash (`assessmentHash` on `ScholarshipEscrow.sol`)
 * binding the off-chain AI assessment and consent timestamp without revealing PII on-chain.
 */
export function computeAssessmentCommitment(input: {
  userId?: string;
  firebaseUid?: string;
  assessment: Pick<VulnerabilityAssessment, "vulnerabilityIndex" | "band" | "topsisScore" | "modelVersion">;
  consentAt: string;
}): string {
  const canonical = JSON.stringify({
    subject: input.userId ?? input.firebaseUid ?? "anonymous",
    vulnerabilityIndex: input.assessment.vulnerabilityIndex,
    band: input.assessment.band,
    topsisScore: input.assessment.topsisScore,
    modelVersion: input.assessment.modelVersion,
    consentAt: input.consentAt
  });
  return keccak256(toUtf8Bytes(canonical));
}
