/** @jest-environment node */
import { GET } from "@/app/api/c2/research-communities/route";
import { getMongoDatabase } from "@/lib/mongodb";
import catalog from "@/lib/c2/research-communities.json";
jest.mock("@/lib/mongodb", () => ({ getMongoDatabase: jest.fn() }));
const database = jest.mocked(getMongoDatabase);
beforeEach(() => jest.clearAllMocks());
it("reads only the versioned synthetic catalog, with no student lookup or forum writes", async () => {
  const find = jest.fn(),
    project = jest.fn(),
    sort = jest.fn(),
    collection = jest.fn();
  find.mockReturnValue({ project });
  project.mockReturnValue({ sort });
  sort.mockReturnValue({ toArray: async () => catalog.communities });
  collection.mockReturnValue({ find });
  database.mockResolvedValue({ collection } as unknown as Awaited<
    ReturnType<typeof getMongoDatabase>
  >);
  const response = await GET();
  expect(response.status).toBe(200);
  expect(collection.mock.calls).toEqual([["c2_research_communities"]]);
  expect(find).toHaveBeenCalledWith({
    sourceType: "synthetic",
    isSample: true,
    isActive: true,
    catalogVersion: "c2-community-circles-v1",
  });
  expect(project).toHaveBeenCalledWith(
    expect.objectContaining({
      conversationStarters: 1,
      topics: 1,
      isSample: 1,
    }),
  );
  expect((await response.json()).communities).toHaveLength(13);
});
it("returns a generic recoverable error without credentials or database diagnostics", async () => {
  database.mockRejectedValue(new Error("private connection diagnostic"));
  const response = await GET();
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({
    message: "Sample community catalog is unavailable.",
  });
});
