/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { jsonResponse } from "@/lib/api";
import { POST } from "@/app/api/c4/matches/route";
import { requireSession } from "@/lib/session-auth";

jest.mock("@/lib/session-auth", () => {
  const actual = jest.requireActual("@/lib/session-auth");
  return { ...actual, requireSession: jest.fn() };
});

const mockedSession = requireSession as jest.MockedFunction<typeof requireSession>;
type SessionResult = Awaited<ReturnType<typeof requireSession>>;

function signInAs(role: string | null) {
  if (role === null) {
    mockedSession.mockResolvedValue({ error: jsonResponse({ message: "Unauthorized" }, 401) } as SessionResult);
    return;
  }
  mockedSession.mockResolvedValue({
    session: { idToken: "t", firebase: { uid: "fb-c4", email: null, displayName: null, emailVerified: true }, user: { _id: "u-c4", role, name: "Test", email: "t@example.com" } }
  } as unknown as SessionResult);
}

const body = {
  needs: { web_backend: 2, databases: 1 },
  interests: ["startups"],
  preferredLanguage: "si",
  languages: ["si", "en"],
  slots: ["saturday", "weekday_evening"]
};
const post = (payload: unknown) =>
  POST(new NextRequest("http://localhost/api/c4/matches", { method: "POST", body: JSON.stringify(payload) }));

describe("POST /api/c4/matches", () => {
  it("rejects anonymous users", async () => {
    signInAs(null);
    expect((await post(body)).status).toBe(401);
  });

  it("is student-only", async () => {
    signInAs("mentor");
    expect((await post(body)).status).toBe(403);
  });

  it("validates input and rejects unknown fields", async () => {
    signInAs("student");
    expect((await post({ ...body, needs: { not_a_skill: 2 } })).status).toBe(400);
    expect((await post({ ...body, needs: {} })).status).toBe(400);
    expect((await post({ ...body, studentName: "Someone" })).status).toBe(400);
  });

  it("returns three explained matches and the synthetic warning", async () => {
    signInAs("student");
    const res = await post(body);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.matches).toHaveLength(3);
    expect(data.matches[0].score).toBeGreaterThanOrEqual(data.matches[1].score);
    expect(data.matches[0].reasons.length).toBeGreaterThan(0);
    expect(Object.keys(data.matches[0].criteria)).toEqual(["skill", "interest", "language", "availability", "capacity"]);
    expect(data.syntheticTraining).toBe(true);
    expect(data.warning).toMatch(/SYNTHETIC DATA/);
  });
});
