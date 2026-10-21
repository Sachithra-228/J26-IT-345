/** @jest-environment node */
import { NextRequest } from "next/server";
import { GET } from "@/app/api/c2/research-professionals/route";
import { POST } from "@/app/api/counselor-bookings/route";
import { requireSession } from "@/lib/session-auth";
import { getMongoDatabase } from "@/lib/mongodb";
import { jsonResponse } from "@/lib/api";
jest.mock("@/lib/session-auth", () => ({ ...jest.requireActual("@/lib/session-auth"), requireSession: jest.fn() }));
jest.mock("@/lib/mongodb", () => ({ getMongoDatabase: jest.fn() }));
jest.mock("@/lib/notifications", () => ({ createNotification: jest.fn() }));
const session = jest.mocked(requireSession), database = jest.mocked(getMongoDatabase);
beforeEach(() => {
  jest.clearAllMocks();
  session.mockResolvedValue({ session: { firebase: { uid: "student" }, user: { _id: "student", role: "student" } } } as Awaited<ReturnType<typeof requireSession>>);
});
it("requires sign-in without reading any database collection", async () => {
  session.mockResolvedValue({ error: jsonResponse({ message: "Unauthorized" }, 401) } as Awaited<ReturnType<typeof requireSession>>);
  expect((await GET(new NextRequest("http://localhost/api/c2/research-professionals"))).status).toBe(401);
  expect(database).not.toHaveBeenCalled();
});
it("reads only marked synthetic profiles from the separate research collection", async () => {
  const find = jest.fn(), project = jest.fn(), sort = jest.fn(), collection = jest.fn();
  find.mockReturnValue({ project }); project.mockReturnValue({ sort }); sort.mockReturnValue({ toArray: async () => [{ _id: "c2-research-01", isResearchProfile: true }] });
  collection.mockReturnValue({ find });
  database.mockResolvedValue({ collection } as unknown as Awaited<ReturnType<typeof getMongoDatabase>>);
  const result = await GET(new NextRequest("http://localhost/api/c2/research-professionals"));
  expect(result.status).toBe(200);
  expect(collection).toHaveBeenCalledWith("c2_research_professionals");
  expect(find).toHaveBeenCalledWith({ isActive: true, sourceType: "synthetic", isResearchProfile: true });
  expect((await result.json())[0]._id).toBe("c2-research-01");
});
it("rejects a real appointment request to a research profile before any database write", async () => {
  const response = await POST(new NextRequest("http://localhost/api/counselor-bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ counselorId: "c2-research-05", preferredDate: "2026-10-22", preferredTime: "10:00" }) }));
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ message: expect.stringContaining("Demonstration profiles cannot receive real appointment requests") });
  expect(database).not.toHaveBeenCalled();
});
