/**
 * @jest-environment node
 *
 * C3 API against a mocked MongoDB (the non-demo code path): what is stored, what staff see,
 * erasure and database outages.
 */
import { NextRequest } from "next/server";
import { DELETE, GET, POST } from "@/app/api/c3/assessment/route";
import { resetRateLimits } from "@/lib/c3/rate-limit";
import { getMongoDatabase } from "@/lib/mongodb";
import { requireSession } from "@/lib/session-auth";

jest.mock("@/lib/session-auth", () => {
  const actual = jest.requireActual("@/lib/session-auth");
  return { ...actual, requireSession: jest.fn() };
});
jest.mock("@/lib/mongodb", () => ({ getMongoDatabase: jest.fn() }));

type Doc = Record<string, unknown>;
const docs: Doc[] = [];
const matches = (d: Doc, filter: Doc): boolean => {
  if (Array.isArray(filter.$or)) return (filter.$or as Doc[]).some((f) => matches(d, f));
  return Object.entries(filter).every(([k, v]) => d[k] === v);
};
const collection = {
  findOne: jest.fn(async (filter: Doc) => docs.find((d) => matches(d, filter)) ?? null),
  replaceOne: jest.fn(async (filter: Doc, doc: Doc) => {
    const i = docs.findIndex((d) => matches(d, filter));
    if (i >= 0) docs[i] = { ...doc };
    else docs.push({ ...doc });
  }),
  deleteMany: jest.fn(async (filter: Doc) => {
    for (let i = docs.length - 1; i >= 0; i--) if (matches(docs[i], filter)) docs.splice(i, 1);
  }),
  find: jest.fn((_q: Doc, opts?: { projection?: Doc }) => ({
    limit: () => ({
      toArray: async () =>
        docs.map((d) => (opts?.projection ? Object.fromEntries(Object.keys(opts.projection).map((k) => [k, d[k]])) : d))
    })
  }))
};

const mockedSession = requireSession as jest.MockedFunction<typeof requireSession>;
const mockedDb = getMongoDatabase as jest.MockedFunction<typeof getMongoDatabase>;
function signInAs(role: string, id: string) {
  mockedSession.mockResolvedValue({
    session: { idToken: "t", firebase: { uid: `fb-${id}`, email: null, displayName: null, emailVerified: true }, user: { _id: id, role, name: `Name ${id}`, email: `${id}@example.com` } }
  } as unknown as Awaited<ReturnType<typeof requireSession>>);
}

const originalEnv = { ...process.env };
beforeAll(() => {
  process.env.NEXT_PUBLIC_DEMO_MODE = "false";
  process.env.MONGODB_URI = "mongodb://mocked";
});
afterAll(() => {
  process.env = originalEnv;
});
beforeEach(() => {
  docs.length = 0;
  resetRateLimits();
  mockedDb.mockResolvedValue({ collection: () => collection } as never);
});

const profile = { yearOfStudy: 4, targetRoleIds: ["software_engineer"], skills: { prog_oop: 2, databases_sql: 2, communication: 2 } };
const req = (url: string, init?: ConstructorParameters<typeof NextRequest>[1]) => new NextRequest(`http://localhost${url}`, init);
const saveReq = (body: unknown) => req("/api/c3/assessment", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });

describe("C3 assessment route with MongoDB", () => {
  it("stores only answers, model version and timestamps - no name, e-mail or CV text", async () => {
    signInAs("student", "s1");
    expect((await POST(saveReq({ profile, consent: true }))).status).toBe(201);
    expect(docs).toHaveLength(1);
    expect(Object.keys(docs[0]).sort()).toEqual(["consentAt", "firebaseUid", "modelVersion", "profile", "syntheticTraining", "updatedAt", "userId"]);
    expect(JSON.stringify(docs[0])).not.toMatch(/Name s1|s1@example\.com/);
    const mine = await (await GET(req("/api/c3/assessment"))).json();
    expect(mine.profile.skills.prog_oop).toBe(2);
    expect(mine.assessment.targets[0].roleId).toBe("software_engineer");
  });

  it("re-saving replaces the record and erasing removes it", async () => {
    signInAs("student", "s1");
    await POST(saveReq({ profile, consent: true }));
    await POST(saveReq({ profile: { ...profile, skills: { prog_oop: 3 } }, consent: true }));
    expect(docs).toHaveLength(1);
    expect((docs[0].profile as { skills: Record<string, number> }).skills.prog_oop).toBe(3);
    expect((await DELETE(req("/api/c3/assessment", { method: "DELETE" }))).status).toBe(200);
    expect(docs).toHaveLength(0);
    expect((await (await GET(req("/api/c3/assessment"))).json()).assessment).toBeNull();
  });

  it("gives staff aggregates only, and hides everything below five students", async () => {
    for (let i = 0; i < 4; i++) {
      signInAs("student", `s${i}`);
      await POST(saveReq({ profile, consent: true }));
    }
    signInAs("admin", "a1");
    const few = await (await GET(req("/api/c3/assessment?scope=aggregate"))).json();
    expect(few).toMatchObject({ source: "stored", students: 4, suppressed: true, roles: [] });

    signInAs("student", "s4");
    await POST(saveReq({ profile, consent: true }));
    signInAs("admin", "a1");
    const res = await GET(req("/api/c3/assessment?scope=aggregate"));
    const agg = await res.json();
    expect(agg.suppressed).toBe(false);
    expect(agg.roles.find((r: { roleId: string }) => r.roleId === "software_engineer").targetedBy).toBe(5);
    expect(agg.roles.find((r: { roleId: string }) => r.roleId === "qa_engineer").targetedBy).toBeNull();
    expect(JSON.stringify(agg)).not.toMatch(/s[0-4]|userId|firebaseUid|Name /);
    expect(collection.find).toHaveBeenLastCalledWith({}, { projection: { profile: 1 } });
  });

  it("ignores stored records that no longer validate", async () => {
    docs.push({ userId: "s9", profile: { yearOfStudy: 7, targetRoleIds: [], skills: {} } });
    signInAs("student", "s9");
    expect((await (await GET(req("/api/c3/assessment"))).json()).assessment).toBeNull();
  });

  it("answers 503 when the database is unreachable", async () => {
    const outage = Object.assign(new Error("connect timeout"), { name: "MongoServerSelectionError" });
    mockedDb.mockRejectedValue(outage);
    signInAs("student", "s1");
    expect((await GET(req("/api/c3/assessment"))).status).toBe(503);
    expect((await POST(saveReq({ profile, consent: true }))).status).toBe(503);
    expect((await DELETE(req("/api/c3/assessment", { method: "DELETE" }))).status).toBe(503);
    signInAs("faculty", "f1");
    expect((await GET(req("/api/c3/assessment?scope=aggregate"))).status).toBe(503);
  });
});
