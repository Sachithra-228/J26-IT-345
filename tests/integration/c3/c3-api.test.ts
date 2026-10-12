/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { jsonResponse } from "@/lib/api";
import { DELETE, GET, POST } from "@/app/api/c3/assessment/route";
import { POST as postPlan } from "@/app/api/c3/plan/route";
import { GET as getRoles } from "@/app/api/c3/roles/route";
import { buildAggregate } from "@/lib/c3/assessment-store";
import { resetRateLimits } from "@/lib/c3/rate-limit";
import { requireSession } from "@/lib/session-auth";

jest.mock("@/lib/session-auth", () => {
  const actual = jest.requireActual("@/lib/session-auth");
  return { ...actual, requireSession: jest.fn() };
});

const mockedSession = requireSession as jest.MockedFunction<typeof requireSession>;
type SessionResult = Awaited<ReturnType<typeof requireSession>>;

function signInAs(role: string | null, id = "u-c3-test") {
  if (role === null) {
    mockedSession.mockResolvedValue({ error: jsonResponse({ message: "Unauthorized" }, 401) } as SessionResult);
    return;
  }
  mockedSession.mockResolvedValue({
    session: { idToken: "t", firebase: { uid: `fb-${id}`, email: null, displayName: null, emailVerified: true }, user: { _id: id, role, name: "Test Person", email: "t@example.com" } }
  } as unknown as SessionResult);
}

const originalEnv = { ...process.env };
beforeAll(() => {
  process.env.NEXT_PUBLIC_DEMO_MODE = "true";
});
afterAll(() => {
  process.env = originalEnv;
});
beforeEach(() => {
  resetRateLimits();
  delete process.env.NEXT_PUBLIC_C3_CV_ENABLED;
  signInAs("student");
});

const profile = {
  yearOfStudy: 3,
  targetRoleIds: ["qa_engineer", "business_analyst"],
  skills: { testing_manual: 2, communication: 2, agile: 1, databases_sql: 1 }
};
const req = (url: string, init?: ConstructorParameters<typeof NextRequest>[1]) => new NextRequest(`http://localhost${url}`, init);
const json = (url: string, method: string, body: unknown) =>
  req(url, { method, body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });

describe("authentication and role gates", () => {
  it("rejects every C3 endpoint without a session", async () => {
    signInAs(null);
    expect((await getRoles(req("/api/c3/roles"))).status).toBe(401);
    expect((await GET(req("/api/c3/assessment"))).status).toBe(401);
    expect((await POST(json("/api/c3/assessment", "POST", { profile, consent: true }))).status).toBe(401);
    expect((await DELETE(req("/api/c3/assessment", { method: "DELETE" }))).status).toBe(401);
    expect((await postPlan(json("/api/c3/plan", "POST", { profile, roleId: "qa_engineer" }))).status).toBe(401);
  });

  it("allows students and staff to read role profiles, but not unrelated roles", async () => {
    const res = await getRoles(req("/api/c3/roles"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.roles).toHaveLength(12);
    expect(data.model.syntheticTraining).toBe(true);
    expect(data.model.warning).toMatch(/SYNTHETIC/);
    signInAs("admin");
    expect((await getRoles(req("/api/c3/roles"))).status).toBe(200);
    signInAs("parent");
    expect((await getRoles(req("/api/c3/roles"))).status).toBe(403);
  });

  it("keeps individual assessments and plans student-only", async () => {
    signInAs("admin");
    expect((await GET(req("/api/c3/assessment"))).status).toBe(403);
    expect((await POST(json("/api/c3/assessment", "POST", { profile, consent: true }))).status).toBe(403);
    expect((await postPlan(json("/api/c3/plan", "POST", { profile, roleId: "qa_engineer" }))).status).toBe(403);
  });

  it("keeps the aggregate staff-only", async () => {
    expect((await GET(req("/api/c3/assessment?scope=aggregate"))).status).toBe(403);
    signInAs("mentor");
    expect((await GET(req("/api/c3/assessment?scope=aggregate"))).status).toBe(403);
  });
});

describe("/api/c3/assessment (student, demo mode)", () => {
  it("requires explicit consent and valid values", async () => {
    expect((await POST(json("/api/c3/assessment", "POST", { profile }))).status).toBe(400);
    expect((await POST(json("/api/c3/assessment", "POST", { profile, consent: false }))).status).toBe(400);
    expect((await POST(json("/api/c3/assessment", "POST", { profile: { ...profile, yearOfStudy: 1 }, consent: true }))).status).toBe(400);
    expect((await POST(json("/api/c3/assessment", "POST", { profile: { ...profile, skills: { python: 9 } }, consent: true }))).status).toBe(400);
    expect((await POST(json("/api/c3/assessment", "POST", { profile: { ...profile, targetRoleIds: ["ceo"] }, consent: true }))).status).toBe(400);
    const bad = await POST(req("/api/c3/assessment", { method: "POST", body: "not json" }));
    expect(bad.status).toBe(400);
  });

  it("rejects client-supplied scores instead of trusting them", async () => {
    const res = await POST(json("/api/c3/assessment", "POST", { profile, consent: true, readiness: { qa_engineer: 100 } }));
    expect(res.status).toBe(400);
  });

  it("recomputes on the server, stores the answers and lets the student read them back", async () => {
    const res = await POST(json("/api/c3/assessment", "POST", { profile, consent: true }));
    expect(res.status).toBe(201);
    const saved = await res.json();
    expect(saved.assessment.roles).toHaveLength(12);
    expect(saved.assessment.targets.map((t: { roleId: string }) => t.roleId)).toEqual(["qa_engineer", "business_analyst"]);
    expect(saved.assessment.syntheticTraining).toBe(true);
    const mine = await (await GET(req("/api/c3/assessment"))).json();
    expect(mine.profile.skills.testing_manual).toBe(2);
    expect(mine.assessment.targets[0].readiness.score).toBeCloseTo(saved.assessment.targets[0].readiness.score, 10);
  });

  it("lets the student erase their saved answers", async () => {
    await POST(json("/api/c3/assessment", "POST", { profile, consent: true }));
    expect((await DELETE(req("/api/c3/assessment", { method: "DELETE" }))).status).toBe(200);
    expect((await (await GET(req("/api/c3/assessment"))).json()).assessment).toBeNull();
  });
});

describe("CV text handling", () => {
  const cvText = "Name: Kamal Perera\nkamal@example.com 077 123 4567\nSkills: Selenium, Figma";

  it("is refused while the CV feature flag is off (the default)", async () => {
    const res = await POST(json("/api/c3/assessment", "POST", { profile, consent: true, cvText, cvConsent: true }));
    expect(res.status).toBe(400);
  });

  it("needs its own consent", async () => {
    process.env.NEXT_PUBLIC_C3_CV_ENABLED = "true";
    expect((await POST(json("/api/c3/assessment", "POST", { profile, consent: true, cvText }))).status).toBe(400);
  });

  it("contributes skill ids only and is never stored or echoed", async () => {
    process.env.NEXT_PUBLIC_C3_CV_ENABLED = "true";
    const res = await POST(json("/api/c3/assessment", "POST", { profile, consent: true, cvText, cvConsent: true }));
    expect(res.status).toBe(201);
    const body = JSON.stringify(await res.json());
    const stored = JSON.stringify(await (await GET(req("/api/c3/assessment"))).json());
    for (const text of [body, stored]) {
      expect(text).not.toMatch(/Kamal|kamal@example\.com|4567|Selenium/);
    }
    const mine = JSON.parse(stored);
    expect(mine.profile.skills.test_automation).toBe(1);
    expect(mine.profile.skills.ui_ux).toBe(1);
  });
});

describe("staff aggregate", () => {
  it("returns anonymous cohort statistics only", async () => {
    await POST(json("/api/c3/assessment", "POST", { profile, consent: true }));
    signInAs("faculty");
    const res = await GET(req("/api/c3/assessment?scope=aggregate"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.source).toBe("synthetic-demo");
    expect(data.suppressed).toBe(false);
    expect(data.students).toBeGreaterThanOrEqual(150);
    expect(data.roles).toHaveLength(12);
    const text = JSON.stringify(data);
    expect(text).not.toMatch(/u-c3-test|fb-u-c3-test|Test Person|userId|firebaseUid/);
    for (const r of data.roles) if (r.targetedBy !== null) expect(r.targetedBy).toBeGreaterThanOrEqual(data.minGroupSize);
  });

  it("hides everything when fewer than the minimum group size have saved", () => {
    const agg = buildAggregate([profile, profile, profile] as never, "stored");
    expect(agg.suppressed).toBe(true);
    expect(agg.roles).toEqual([]);
    expect(agg.commonGaps).toEqual([]);
  });
});

describe("/api/c3/plan", () => {
  it("returns a readiness breakdown, ranked gaps and an explained plan without storing anything", async () => {
    await DELETE(req("/api/c3/assessment", { method: "DELETE" }));
    const res = await postPlan(json("/api/c3/plan", "POST", { profile, roleId: "data_scientist" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.readiness.contributions.length).toBeGreaterThan(0);
    expect(data.gaps.length).toBeGreaterThan(0);
    expect(data.plan.steps.length).toBeGreaterThan(0);
    expect(data.plan.steps[0].reasons.length).toBeGreaterThan(0);
    expect(data.warning).toMatch(/SYNTHETIC/);
    expect((await (await GET(req("/api/c3/assessment"))).json()).assessment).toBeNull();
  });

  it("validates the role id", async () => {
    expect((await postPlan(json("/api/c3/plan", "POST", { profile, roleId: "astronaut" }))).status).toBe(400);
  });
});

describe("rate limiting", () => {
  it("answers 429 with Retry-After once a client exceeds the limit", async () => {
    let last = 0;
    let retryAfter: string | null = null;
    for (let i = 0; i < 11; i++) {
      const res = await POST(json("/api/c3/assessment", "POST", { profile, consent: true }));
      last = res.status;
      retryAfter = res.headers.get("Retry-After");
    }
    expect(last).toBe(429);
    expect(Number(retryAfter)).toBeGreaterThan(0);
    signInAs("student", "another-student");
    expect((await POST(json("/api/c3/assessment", "POST", { profile, consent: true }))).status).toBe(201);
  });
});
