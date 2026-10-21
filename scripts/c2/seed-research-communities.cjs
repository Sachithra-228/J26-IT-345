/* Only the user-requested fictional catalog; no forum posts or notifications. */
const { loadEnvConfig } = require("@next/env");
const { MongoClient } = require("mongodb");
const fs = require("node:fs/promises");
const path = require("node:path");
const catalog = require("../../src/lib/c2/research-communities.json");
loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
async function main() {
  if (!process.env.MONGODB_URI)
    throw new Error("Missing database configuration");
  const client = new MongoClient(process.env.MONGODB_URI, {
    ...(process.env.MONGODB_FORCE_IPV4 === "true" ? { family: 4 } : {}),
    serverSelectionTimeoutMS: 20000,
  });
  try {
    await client.connect();
    const collection = client
      .db(
        process.env.MONGODB_DB_NAME ||
          process.env.MONGODB_DB ||
          "unicare_connect",
      )
      .collection("c2_research_communities");
    if (!process.argv.includes("--verify")) {
      for (const row of catalog.communities) {
        const existing = await collection.findOne({ _id: row._id });
        if (
          existing &&
          (existing.sourceType !== "synthetic" || existing.isSample !== true)
        )
          throw new Error("Unexpected record");
      }
      await collection.bulkWrite(
        catalog.communities.map(({ _id, ...row }) => ({
          updateOne: {
            filter: { _id, sourceType: "synthetic", isSample: true },
            update: {
              $set: { ...row, catalogVersion: catalog.version, isActive: true },
            },
            upsert: true,
          },
        })),
      );
    }
    const rows = await collection
      .find({
        _id: { $in: catalog.communities.map((row) => row._id) },
        sourceType: "synthetic",
        isSample: true,
        catalogVersion: catalog.version,
        isActive: true,
      })
      .toArray();
    if (
      rows.length !== catalog.communities.length ||
      catalog.communities.some((expected) => {
        const row = rows.find((item) => item._id === expected._id);
        return (
          !row ||
          Object.entries(expected).some(
            ([key, value]) =>
              JSON.stringify(row[key]) !== JSON.stringify(value),
          )
        );
      })
    )
      throw new Error("Catalog verification failed");
    const report = {
      collection: "c2_research_communities",
      catalogVersion: catalog.version,
      verifiedCommunities: rows.length,
      coveredTopics: [...new Set(rows.flatMap((row) => row.topics))].sort(),
      realForumCollectionsChanged: false,
      membershipsCreated: 0,
      notificationsSent: 0,
    };
    await fs.writeFile(
      path.join(process.cwd(), "docs/c2/evidence/community-catalog-seed.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(JSON.stringify(report));
  } finally {
    await client.close();
  }
}
main().catch(() => {
  console.error(
    "Sample community setup failed. Check connectivity and scoped catalog inputs; no credentials are logged.",
  );
  process.exitCode = 1;
});
