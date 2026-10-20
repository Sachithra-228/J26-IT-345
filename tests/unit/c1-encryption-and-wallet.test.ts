/**
 * @jest-environment node
 */
import {
  fromEncryptedAssessmentDoc,
  getDemoAssessment,
  getRawDemoEncryptedDoc,
  saveDemoAssessment,
  toAdminQueueItem,
  toEncryptedAssessmentDoc,
  type StoredAssessment
} from "@/lib/c1/assessment-store";
import {
  computeAssessmentCommitment,
  decryptFinancialProfile,
  encryptFinancialProfile
} from "@/lib/c1/encryption";
import { assessVulnerability, type StudentFinancialProfile } from "@/lib/c1/vulnerability";
import {
  prepareAwardScholarship,
  prepareCreateCampaign,
  prepareTopUpCampaign,
  prepareVerifyMilestone
} from "@/lib/c1/wallet-actions";

const sampleProfile: StudentFinancialProfile = {
  monthlyHouseholdIncomeLkr: 35_000,
  householdSize: 5,
  dependents: 3,
  siblingsInEducation: 1,
  guardianEmployment: "informal",
  singleParent: true,
  hasEducationLoan: true,
  loanAmountLkr: 250_000,
  monthlyExpensesLkr: 38_000,
  accommodation: "boarding",
  ruralDistrict: true,
  financialShockLastYear: true,
  currentScholarship: false,
  gpa: 3.35,
  yearOfStudy: 3
};

describe("AES-256-GCM off-chain profile encryption (NFR02)", () => {
  it("encrypts and decrypts a student financial profile with a fresh IV each time", () => {
    const enc1 = encryptFinancialProfile(sampleProfile, "test-secret-key-1234567890");
    const enc2 = encryptFinancialProfile(sampleProfile, "test-secret-key-1234567890");
    expect(enc1.alg).toBe("AES-256-GCM");
    expect(enc1.iv).not.toBe(enc2.iv);
    expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
    expect(JSON.stringify(enc1)).not.toContain("35000");

    const dec = decryptFinancialProfile(enc1, "test-secret-key-1234567890");
    expect(dec).toEqual(sampleProfile);
  });

  it("rejects tampered ciphertext, tampered auth tag, or wrong secret key", () => {
    const enc = encryptFinancialProfile(sampleProfile, "correct-secret-key-1234");
    expect(() => decryptFinancialProfile(enc, "wrong-secret-key-5678")).toThrow();

    const badTag = { ...enc, tag: Buffer.alloc(16, 7).toString("base64") };
    expect(() => decryptFinancialProfile(badTag, "correct-secret-key-1234")).toThrow();
  });

  it("stores encryptedProfile instead of raw profile in assessment documents", () => {
    const assessment = assessVulnerability(sampleProfile);
    const record: StoredAssessment = {
      userId: "student-42",
      studentName: "Nimali Perera",
      university: "SLIIT",
      profile: sampleProfile,
      assessment,
      consentAt: "2026-10-20T03:00:00.000Z",
      updatedAt: "2026-10-20T03:00:00.000Z"
    };

    const doc = toEncryptedAssessmentDoc(record, "my-secret-key-123456");
    expect("profile" in doc).toBe(false);
    expect(doc.encryptedProfile.alg).toBe("AES-256-GCM");
    expect(doc.assessmentHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(doc.assessmentHash).toBe(computeAssessmentCommitment(record));

    const roundTrip = fromEncryptedAssessmentDoc(doc, "my-secret-key-123456");
    expect(roundTrip).toEqual(record);
    expect(fromEncryptedAssessmentDoc(doc, "wrong-key")).toBeNull();

    // Admin queue item exposes derived signals + commitment hash without decrypting raw finances
    const queueItem = toAdminQueueItem(doc, "doc-1");
    expect(queueItem.vulnerabilityIndex).toBe(assessment.vulnerabilityIndex);
    expect(queueItem.assessmentHash).toBe(doc.assessmentHash);
    expect(JSON.stringify(queueItem)).not.toContain("35000");

    // Demo store keeps the encrypted form at rest
    saveDemoAssessment(record);
    const rawDemo = getRawDemoEncryptedDoc({ userId: "student-42" });
    expect(rawDemo?.encryptedProfile.alg).toBe("AES-256-GCM");
    expect(getDemoAssessment({ userId: "student-42" })?.profile).toEqual(sampleProfile);
  });
});

describe("Donor & Admin wallet transaction preparation (FR02, FR06, FR09)", () => {
  it("validates and prepares createCampaign and topUpCampaign calls", () => {
    expect(prepareCreateCampaign({ title: "x", amountEth: "1" }).ok).toBe(false);
    expect(prepareCreateCampaign({ title: "SLIIT Bursary", amountEth: "0" }).ok).toBe(false);

    const created = prepareCreateCampaign({ title: "SLIIT Bursary", amountEth: "2.5" });
    expect(created.ok).toBe(true);
    if (created.ok) {
      expect(created.data.metadataHash).toMatch(/^0x[0-9a-f]{64}$/);
      expect(created.data.valueWei).toBe("2500000000000000000");
    }

    const topUp = prepareTopUpCampaign({ campaignId: 2, amountEth: "1.25" });
    expect(topUp.ok).toBe(true);
    if (topUp.ok) {
      expect(topUp.data.campaignId).toBe(2);
      expect(topUp.data.valueWei).toBe("1250000000000000000");
    }
  });

  it("validates and prepares verifyMilestone and awardScholarship calls", () => {
    expect(prepareVerifyMilestone({ awardId: 1, evidenceNote: "ok" }).ok).toBe(false);
    const verified = prepareVerifyMilestone({ awardId: 3, evidenceNote: "Semester 1 GPA 3.45 verified" });
    expect(verified.ok).toBe(true);
    if (verified.ok) {
      expect(verified.data.awardId).toBe(3);
      expect(verified.data.evidenceHash).toMatch(/^0x[0-9a-f]{64}$/);
    }

    const hashA = "0x" + "a".repeat(64);
    const hashB = "0x" + "b".repeat(64);
    expect(
      prepareAwardScholarship({
        campaignId: 1,
        beneficiary: "not-an-address",
        studentRef: hashA,
        assessmentHash: hashB,
        totalAmountEth: "2",
        milestoneCount: 4
      }).ok
    ).toBe(false);

    const awarded = prepareAwardScholarship({
      campaignId: 1,
      beneficiary: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      studentRef: hashA,
      assessmentHash: hashB,
      totalAmountEth: "2.0",
      milestoneCount: 4
    });
    expect(awarded.ok).toBe(true);
    if (awarded.ok) {
      expect(awarded.data.totalAmountWei).toBe("2000000000000000000");
      expect(awarded.data.milestoneCount).toBe(4);
    }
  });
});
