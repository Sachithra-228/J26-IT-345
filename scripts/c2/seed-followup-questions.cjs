/* Idempotent, scoped seed for the C2 custom follow-up question bank. */
const { loadEnvConfig } = require('@next/env');
const { MongoClient } = require('mongodb');
const bank = require('../../src/lib/c2/followup-bank.json');
loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const COLLECTION = 'c2_followup_questions';
async function main() {
  if (!process.env.MONGODB_URI || bank.version !== 'c2-adaptive-followups-v2' || bank.questions.length !== 270) throw new Error('Question bank or database configuration is missing.');
  const client = new MongoClient(process.env.MONGODB_URI, { ...(process.env.MONGODB_FORCE_IPV4 === 'true' ? { family: 4 } : {}), serverSelectionTimeoutMS: 20000 });
  try {
    await client.connect();
    const collection = client.db(process.env.MONGODB_DB_NAME || process.env.MONGODB_DB || 'unicare_connect').collection(COLLECTION);
    const ids = bank.questions.map((q) => `${bank.version}:${q.id}`);
    for (const _id of ids) {
      const existing = await collection.findOne({ _id });
      if (existing && (existing.bankVersion !== bank.version || existing.sourceType !== 'authored-support')) throw new Error('Unexpected existing question record; seed stopped.');
    }
    if (!process.argv.includes('--verify')) {
      const now = new Date();
      await collection.bulkWrite(bank.questions.map((question, order) => ({ updateOne: {
        filter: { _id: ids[order], bankVersion: bank.version, sourceType: 'authored-support' },
        update: { $set: { ...question, order, bankVersion: bank.version, sourceType: 'authored-support', isActive: true, updatedAt: now }, $setOnInsert: { createdAt: now } }, upsert: true,
      } })));
    }
    const rows = await collection.find({ _id: { $in: ids }, bankVersion: bank.version, sourceType: 'authored-support', isActive: true }).sort({ order: 1 }).toArray();
    if (rows.length !== 270 || rows.some((row, index) => Object.entries(bank.questions[index]).some(([key, value]) => JSON.stringify(row[key]) !== JSON.stringify(value)))) throw new Error('Stored question bank differs from checked-in definition.');
    console.log(JSON.stringify({ collection: COLLECTION, bankVersion: bank.version, verifiedQuestions: rows.length, generalQuestions: rows.filter((q) => !q.topics.length).length, topicQuestions: rows.filter((q) => q.topics.length).length }));
  } finally { await client.close(); }
}
main().catch(() => { console.error('Question bank setup failed; check the scoped data and database connectivity.'); process.exitCode = 1; });
