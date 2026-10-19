/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { GET } from "@/app/api/notifications/route";

const originalEnv = { ...process.env };
beforeAll(() => {
  process.env.NEXT_PUBLIC_DEMO_MODE = "true";
  delete process.env.C1_RPC_URL;
  delete process.env.C1_ESCROW_ADDRESS;
});
afterAll(() => {
  process.env = originalEnv;
});

describe("GET /api/notifications (demo student)", () => {
  it("includes the student's scholarship events from the ledger, newest first, alongside other notifications", async () => {
    const res = await GET(new NextRequest("http://localhost/api/notifications"));
    expect(res.status).toBe(200);
    const { notifications } = (await res.json()) as {
      notifications: Array<{ type?: string; kind?: string; sectionId?: string; createdAt?: string; date?: string }>;
    };

    const chain = notifications.filter((n) => n.type === "c1-chain");
    expect(chain).toHaveLength(7);
    expect(chain.every((n) => n.sectionId === "financial-aid")).toBe(true);
    expect(notifications.some((n) => n.type !== "c1-chain")).toBe(true); // existing notifications kept

    const keys = notifications.map((n) => String(n.createdAt ?? n.date));
    expect(keys).toEqual([...keys].sort().reverse());
  });
});
