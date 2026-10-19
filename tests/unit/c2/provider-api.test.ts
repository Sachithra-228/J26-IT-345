/** @jest-environment node */
import { NextRequest } from "next/server";
import { POST } from "@/app/api/wellness-counselors/route";
import { requireSession } from "@/lib/session-auth";
import { getMongoDatabase } from "@/lib/mongodb";
import { jsonResponse } from "@/lib/api";
jest.mock("@/lib/api", () => ({
  ...jest.requireActual("@/lib/api"),
  isDemoMode: () => false,
}));
jest.mock("@/lib/session-auth", () => ({
  ...jest.requireActual("@/lib/session-auth"),
  requireSession: jest.fn(),
}));
jest.mock("@/lib/mongodb", () => ({ getMongoDatabase: jest.fn() }));
jest.mock("@/lib/notifications", () => ({ createNotification: jest.fn() }));
const session = jest.mocked(requireSession),
  database = jest.mocked(getMongoDatabase),
  insert = jest.fn();
const environment = { ...process.env };
beforeEach(() => {
  jest.clearAllMocks();
  process.env.NEXT_PUBLIC_DEMO_MODE = "false";
  insert.mockResolvedValue({ insertedId: { toString: () => "id1" } });
  database.mockResolvedValue({
    collection: () => ({ insertOne: insert }),
  } as unknown as Awaited<ReturnType<typeof getMongoDatabase>>);
  session.mockResolvedValue({
    session: {
      firebase: { uid: "staff" },
      user: { _id: "staff", role: "admin" },
    },
  } as Awaited<ReturnType<typeof requireSession>>);
});
afterAll(() => {
  process.env = environment;
});
const payload = {
  name: "Service professional",
  specialization: "Anxiety",
  availability: "By arrangement",
  gender: "female",
  profession: "psychologist",
  languages: ["en", "si"],
  supportAreas: ["worry"],
};
const req = (data: unknown) =>
  new NextRequest("http://localhost/api/wellness-counselors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
it("persists only validated explicit professional metadata", async () => {
  expect((await POST(req(payload))).status).toBe(201);
  expect(insert).toHaveBeenCalledWith(
    expect.objectContaining({
      gender: "female",
      profession: "psychologist",
      languages: ["en", "si"],
      supportAreas: ["worry"],
    }),
  );
});
it("rejects malformed profile metadata without a database write", async () => {
  expect(
    (await POST(req({ ...payload, gender: "guess", languages: ["unknown"] })))
      .status,
  ).toBe(400);
  expect(insert).not.toHaveBeenCalled();
});
it("does not widen staff-only profile creation to a student", async () => {
  session.mockResolvedValue({
    session: {
      firebase: { uid: "student" },
      user: { _id: "student", role: "student" },
    },
  } as Awaited<ReturnType<typeof requireSession>>);
  expect((await POST(req(payload))).status).toBe(403);
  expect(insert).not.toHaveBeenCalled();
});
it("requires sign-in before writing a profile", async () => {
  session.mockResolvedValue({
    error: jsonResponse({ message: "Unauthorized" }, 401),
  } as Awaited<ReturnType<typeof requireSession>>);
  expect((await POST(req(payload))).status).toBe(401);
  expect(insert).not.toHaveBeenCalled();
});
