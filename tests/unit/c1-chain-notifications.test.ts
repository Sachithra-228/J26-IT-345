/**
 * @jest-environment node
 */
import {
  chainNotificationsFor,
  deadlineNotificationsFor,
  DEMO_STUDENT_ID,
  DEMO_STUDENT_SALT,
  isChainNotificationId,
  studentRefFor
} from "@/lib/c1/chain-notifications";
import { chainIdentity } from "@/lib/c1/chain-notifications-server";
import demoLedger from "@/lib/c1/demo-ledger.json";
import { illustrativeScholarships } from "@/lib/c1/demo-scholarships";
import type { LedgerFile } from "@/lib/c1/ledger";

const ledger = demoLedger as unknown as LedgerFile;
const refOf = (id: string) => studentRefFor(id, DEMO_STUDENT_SALT);
const kinds = (list: { kind: string }[]) => list.map((n) => n.kind);

describe("studentRefFor", () => {
  it("reproduces the pseudonymous ref the simulation wrote on-chain", () => {
    const award1 = ledger.events.find((e) => e.type === "ScholarshipAwarded" && e.args.awardId === "1");
    expect(refOf(DEMO_STUDENT_ID)).toBe(award1?.args.studentRef);
  });
});

describe("chainNotificationsFor", () => {
  const demo = chainNotificationsFor(ledger.events, refOf(DEMO_STUDENT_ID), ledger.meta.chainId);

  it("turns the demo student's award, milestones and payments into notifications", () => {
    expect(demo).toHaveLength(7);
    expect(kinds(demo).filter((k) => k === "awarded")).toHaveLength(1);
    expect(kinds(demo).filter((k) => k === "verified")).toHaveLength(3);
    expect(kinds(demo).filter((k) => k === "released")).toHaveLength(3);
    const awarded = demo.find((n) => n.kind === "awarded");
    expect(awarded?.values).toEqual({ amount: "4", milestones: 4, campaignId: "1" });
    expect(awarded?.message).toBe("You were awarded 4 test ETH from campaign #1, paid in 4 milestone payments.");
  });

  it("lists newest first, with stable ids and a financial-aid section", () => {
    const times = demo.map((n) => n.createdAt);
    expect(times).toEqual([...times].sort().reverse());
    expect(demo[demo.length - 1].kind).toBe("awarded");
    for (const n of demo) {
      expect(isChainNotificationId(n.id)).toBe(true);
      expect(n.sectionId).toBe("financial-aid");
    }
  });

  it("shows nobody else's events", () => {
    const awardIds = new Set(demo.flatMap((n) => (n.values.awardId ? [n.values.awardId] : [])));
    expect([...awardIds]).toEqual(["1"]);
    expect(chainNotificationsFor(ledger.events, refOf("someone-else"), ledger.meta.chainId)).toEqual([]);
  });

  it("covers revoked and completed awards for the students they belong to", () => {
    expect(kinds(chainNotificationsFor(ledger.events, refOf("demo-student-002"), 31337))).toContain("revoked");
    expect(kinds(chainNotificationsFor(ledger.events, refOf("demo-student-003"), 31337))).toContain("completed");
  });

  it("keeps read state and links to Etherscan only on Sepolia", () => {
    const readIds = new Set([demo[0].id]);
    const again = chainNotificationsFor(ledger.events, refOf(DEMO_STUDENT_ID), ledger.meta.chainId, readIds);
    expect(again[0].read).toBe(true);
    expect(again[1].read).toBe(false);
    expect(again[0].explorerUrl).toBeNull();
    const sepolia = chainNotificationsFor(ledger.events, refOf(DEMO_STUDENT_ID), 11155111);
    expect(sepolia[0].explorerUrl).toBe(`https://sepolia.etherscan.io/tx/${sepolia[0].txHash}`);
  });
});

describe("deadlineNotificationsFor (FR11)", () => {
  it("surfaces scholarships closing within 14 days in urgency order", () => {
    const fixedNow = new Date("2026-10-20T00:00:00.000Z");
    const reminders = deadlineNotificationsFor(illustrativeScholarships, { now: fixedNow });
    // ILL-07 (7 days) and ILL-05 (14 days) close within 14 days
    expect(reminders.map((r) => r.id)).toEqual(["c1-deadline:ILL-07", "c1-deadline:ILL-05"]);
    expect(reminders[0].values.days).toBe(7);
    expect(reminders[1].values.days).toBe(14);
    expect(reminders.every((r) => isChainNotificationId(r.id))).toBe(true);
  });

  it("filters deadline reminders by eligibility when the student has a saved profile", () => {
    // Year 3 student with high income (200,000 LKR): ineligible for ILL-07 (max 60k) and ILL-05 (year 4 only)
    const highIncomeYear3 = {
      monthlyHouseholdIncomeLkr: 200_000,
      householdSize: 4,
      dependents: 1,
      siblingsInEducation: 0,
      guardianEmployment: "formal" as const,
      singleParent: false,
      hasEducationLoan: false,
      loanAmountLkr: 0,
      monthlyExpensesLkr: 30_000,
      accommodation: "home" as const,
      ruralDistrict: false,
      financialShockLastYear: false,
      currentScholarship: false,
      gpa: 3.5,
      yearOfStudy: 3
    };
    expect(deadlineNotificationsFor(illustrativeScholarships, { profile: highIncomeYear3 })).toEqual([]);
  });
});

describe("chainIdentity", () => {
  const originalEnv = { ...process.env };
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("uses the simulation's demo student in demo mode", () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = "true";
    expect(chainIdentity("u1")).toEqual({ studentId: DEMO_STUDENT_ID, salt: DEMO_STUDENT_SALT });
  });

  it("links real students only when the server holds the salt", () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = "false";
    process.env.MONGODB_URI = "mongodb://example.invalid/test";
    delete process.env.C1_STUDENT_REF_SALT;
    expect(chainIdentity("user-123")).toBeNull();
    process.env.C1_STUDENT_REF_SALT = "secret";
    expect(chainIdentity("user-123")).toEqual({ studentId: "user-123", salt: "secret" });
    expect(chainIdentity(undefined)).toBeNull();
  });
});
