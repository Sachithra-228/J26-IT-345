/* User-requested demonstration catalog. Never writes the real counselor collection. */
const { loadEnvConfig } = require('@next/env');
const { MongoClient } = require('mongodb');
const fs = require('node:fs/promises');
const path = require('node:path');
const profiles = require('../../src/lib/c2/research-professionals.json');
loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const COLLECTION = 'c2_research_professionals';
async function main() {
  if (!process.env.MONGODB_URI) throw new Error('Database configuration is missing.');
  const client = new MongoClient(process.env.MONGODB_URI, {
    ...(process.env.MONGODB_FORCE_IPV4 === 'true' ? { family: 4 } : {}), serverSelectionTimeoutMS: 20000,
  });
  try {
    await client.connect();
    const collection = client.db(process.env.MONGODB_DB_NAME || process.env.MONGODB_DB || 'unicare_connect').collection(COLLECTION);
    const ids = profiles.map((p) => p._id);
    if (!process.argv.includes('--verify')) {
      for (const profile of profiles) {
        const existing = await collection.findOne({ _id: profile._id });
        if (existing && (existing.sourceType !== 'synthetic' || existing.isResearchProfile !== true)) throw new Error('Unexpected existing record; seed stopped.');
      }
      const now = new Date();
      await collection.bulkWrite(profiles.map(({ _id, ...profile }) => ({ updateOne: {
        filter: { _id, sourceType: 'synthetic', isResearchProfile: true },
        update: { $set: { ...profile, sourceType: 'synthetic', isResearchProfile: true, isActive: true,
          availability: 'Demonstration only — not available for appointments', updatedAt: now }, $setOnInsert: { createdAt: now } }, upsert: true,
      } })));
    }
    const rows = await collection.find({ _id: { $in: ids }, sourceType: 'synthetic', isResearchProfile: true }).toArray();
    if (rows.length !== 8) throw new Error('Expected all eight demonstration records.');
    for (const profile of profiles) {
      const row = rows.find((r) => r._id === profile._id);
      if (!row || Object.entries(profile).some(([key, value]) => JSON.stringify(row[key]) !== JSON.stringify(value))) throw new Error('Stored catalog differs from its checked-in definition.');
    }
    const report = { sourceType: 'synthetic', collection: COLLECTION, verifiedRecords: rows.length,
      professions: Object.fromEntries(['counselor','psychologist','psychiatrist'].map((key) => [key,rows.filter((r) => r.profession === key).length])),
      languageCoverage: Object.fromEntries(['en','si','ta'].map((key) => [key,rows.filter((r) => r.languages.includes(key)).length])),
      realCounselorCollectionChanged: false, bookingsCreated: 0, notificationsSent: 0 };
    await fs.writeFile(path.join(process.cwd(), 'docs/c2/evidence/research-directory-seed.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
  } finally { await client.close(); }
}
main().catch(() => { console.error('Research directory setup failed. No credentials are logged; check connectivity and the scoped seed inputs.'); process.exitCode = 1; });
