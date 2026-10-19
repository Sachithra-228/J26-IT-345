/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { GET as getLedger } from "@/app/api/c1/ledger/route";
import { GET as getReport } from "@/app/api/c1/ledger/report/route";
import { DELETE, GET, POST } from "@/app/api/c1/assessments/route";
import { demoUsers } from "@/lib/demo-data";

// In demo mode the session is always demoUsers[0], a student.
const originalEnv = { ...process.env };
beforeAll(() => {
  process.env.NEXT_PUBLIC_DEMO_MODE = "true";
  delete process.env.C1_RPC_URL;
  delete process.env.C1_ESCROW_ADDRESS;
});
afterAll(() => {
  process.env = originalEnv;
});

const validProfile = {
  monthlyHouseholdIncomeLkr: 35_000,
  householdSize: 5,
  dependents: 3,
  siblingsInEducation: 1,
  guardianEmployment: "informal",
  singleParent: false,
  hasEducationLoan: false,
  loanAmountLkr: 0,
  monthlyExpensesLkr: 38_000,
  accommodation: "boarding",
  ruralDistrict: true,
  financialShockLastYear: false,
  currentScholarship: false,
  gpa: 3.1,
  yearOfStudy: 3
};

const req = (url: string, init?: ConstructorParameters<typeof NextRequest>[1]) =>
  new NextRequest(`http://localhost${url}`, init);
const post = (body: unknown) =>
  req("/api/c1/assessments", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });

describe("GET /api/c1/ledger", () => {
  it("serves the simulated ledger with a digest, summary and recent events", async () => {
    const res = await getLedger(req("/api/c1/ledger?limit=5"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.meta.source).toBe("simulation");
    expect(data.events).toHaveLength(5);
    expect(data.digest).toMatch(/^[0-9a-f]{64}$/);
    expect(BigInt(data.summary.totals.funded)).toBe(35n * 10n ** 18n);
  });

  it("is stable: the same ledger always gives the same digest", async () => {
    const a = await (await getLedger(req("/api/c1/ledger"))).json();
    const b = await (await getLedger(req("/api/c1/ledger"))).json();
    expect(a.digest).toBe(b.digest);
  });

  it("clamps the limit parameter", async () => {
    const res = await getLedger(req("/api/c1/ledger?limit=100000"));
    const data = await res.json();
    expect(data.events.length).toBeLessThanOrEqual(500);
    const bad = await (await getLedger(req("/api/c1/ledger?limit=abc"))).json();
    expect(bad.events.length).toBeGreaterThan(0);
  });

  it("exposes no personal data - only hashes and addresses", async () => {
    const data = await (await getLedger(req("/api/c1/ledger"))).json();
    const text = JSON.stringify(data);
    for (const user of demoUsers) {
      expect(text).not.toContain(user.email);
      expect(text).not.toContain(user.name);
    }
  });
});

describe("GET /api/c1/ledger/report", () => {
  it("downloads a CSV audit report by default", async () => {
    const res = await getReport(req("/api/c1/ledger/report"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("content-disposition")).toMatch(/^attachment; filename="unicare-c1-audit-.+\.csv"$/);
    const text = await res.text();
    expect(text).toContain("UniCare Connect - C1 scholarship audit report");
    expect(text).toContain("Date (UTC),Event,");
  });

  it("gives the same fingerprint as the public ledger, in CSV and JSON", async () => {
    const ledgerData = await (await getLedger(req("/api/c1/ledger"))).json();
    const csv = await (await getReport(req("/api/c1/ledger/report?format=csv"))).text();
    const json = await (await getReport(req("/api/c1/ledger/report?format=json"))).json();
    expect(csv).toContain(ledgerData.digest);
    expect(json.integrity.digest).toBe(ledgerData.digest);
    expect(json.events).toHaveLength(ledgerData.meta.eventCount);
  });

  it("contains no personal data", async () => {
    const text = await (await getReport(req("/api/c1/ledger/report?format=json"))).text();
    for (const user of demoUsers) {
      expect(text).not.toContain(user.email);
      expect(text).not.toContain(user.name);
    }
  });
});

describe("/api/c1/assessments (student, demo mode)", () => {
  it("rejects a save without explicit consent", async () => {
    const res = await POST(post({ profile: validProfile, consent: false }));
    expect(res.status).toBe(400);
  });

  it("rejects out-of-range or inconsistent values", async () => {
    expect((await POST(post({ profile: { ...validProfile, gpa: 7 }, consent: true }))).status).toBe(400);
    expect((await POST(post({ profile: { ...validProfile, dependents: 9 }, consent: true }))).status).toBe(400);
    expect((await POST(post({ profile: { ...validProfile, loanAmountLkr: 5000 }, consent: true }))).status).toBe(400);
    expect((await POST(post({ profile: { ...validProfile, yearOfStudy: 1 }, consent: true }))).status).toBe(400);
  });

  it("recomputes the score on the server and stores it", async () => {
    const res = await POST(post({ profile: validProfile, consent: true, vulnerabilityIndex: 1 }));
    expect(res.status).toBe(201);
    const saved = await res.json();
    // a client-supplied index must be ignored
    expect(saved.assessment.vulnerabilityIndex).toBeGreaterThan(50);
    expect(saved.recommendations.length).toBeGreaterThan(0);

    const mine = await (await GET(req("/api/c1/assessments"))).json();
    expect(mine.assessment.vulnerabilityIndex).toBe(saved.assessment.vulnerabilityIndex);
    expect(mine.profile.monthlyHouseholdIncomeLkr).toBe(35_000);
  });

  it("forbids students from reading the admin queue", async () => {
    const res = await GET(req("/api/c1/assessments?scope=queue"));
    expect(res.status).toBe(403);
  });

  it("serves a rankable catalogue to students", async () => {
    const data = await (await GET(req("/api/c1/assessments?scope=catalogue"))).json();
    expect(data.scholarships.length).toBeGreaterThan(0);
    expect(data.illustrative).toBe(true);
  });

  it("lets a student erase their saved assessment", async () => {
    await POST(post({ profile: validProfile, consent: true }));
    const del = await DELETE(req("/api/c1/assessments", { method: "DELETE" }));
    expect(del.status).toBe(200);
    const after = await (await GET(req("/api/c1/assessments"))).json();
    expect(after.assessment).toBeNull();
  });
});
