/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { GET as getMentees } from "@/app/api/mentor/mentees/route";
import { GET as getSessions } from "@/app/api/mentorship-sessions/route";

describe("demo mentorship identity", () => {
  const oldDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE;
  const oldMongoUri = process.env.MONGODB_URI;

  beforeAll(() => {
    process.env.NEXT_PUBLIC_DEMO_MODE = "true";
    delete process.env.MONGODB_URI;
  });

  afterAll(() => {
    if (oldDemoMode === undefined) delete process.env.NEXT_PUBLIC_DEMO_MODE;
    else process.env.NEXT_PUBLIC_DEMO_MODE = oldDemoMode;
    if (oldMongoUri === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = oldMongoUri;
  });

  it("uses the dashboard's demo mentor identity to load sessions and current mentees", async () => {
    const request = (url: string) => new NextRequest(url, { headers: { "x-unicare-demo-user-id": "u2" } });
    const menteesResponse = await getMentees(request("http://localhost/api/mentor/mentees"));
    expect(menteesResponse.status).toBe(200);
    expect((await menteesResponse.json()).items).toEqual([
      { studentId: "u1", name: "Sajini Perera", activeSessions: 1, lastTopic: "Career planning" }
    ]);

    const sessionsResponse = await getSessions(request("http://localhost/api/mentorship-sessions"));
    const sessions = await sessionsResponse.json();
    expect(sessions.map((session: { _id: string }) => session._id)).toEqual(["m1", "m2", "m3"]);
    expect(sessions[0]).toMatchObject({ mentorId: "u2", studentId: "u1", mentorName: "Ravindu Fernando" });
  });

  it("does not grant mentor-only demo endpoints to the default student identity", async () => {
    const response = await getMentees(new NextRequest("http://localhost/api/mentor/mentees"));
    expect(response.status).toBe(403);
  });
});
