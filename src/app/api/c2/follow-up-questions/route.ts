import { jsonResponse } from "@/lib/api";
import { getMongoDatabase } from "@/lib/mongodb";
import { BUNDLED_FOLLOWUP_BANK, validateFollowupBank } from "@/lib/c2/followup-bank";

/** Public, read-only authored question text. No student answers or identifiers. */
export async function GET() {
  try {
    const database = await getMongoDatabase();
    const rows = await database.collection("c2_followup_questions")
      .find({ bankVersion: BUNDLED_FOLLOWUP_BANK.version, sourceType: "authored-support", isActive: true })
      .project({ _id: 0, bankVersion: 0, sourceType: 0, isActive: 0, createdAt: 0, updatedAt: 0 })
      .sort({ order: 1 }).toArray();
    const questions = rows.map(({ order, ...question }, index) => Object.fromEntries(
      Object.keys(BUNDLED_FOLLOWUP_BANK.questions[index] ?? {}).map((key) => [key, question[key]]),
    ));
    const bank = validateFollowupBank({ ...BUNDLED_FOLLOWUP_BANK, questions });
    if (JSON.stringify(bank) !== JSON.stringify(BUNDLED_FOLLOWUP_BANK)) throw new Error("Stored question bank differs from checked-in revision");
    return jsonResponse(bank);
  } catch {
    return jsonResponse({ message: "Question bank unavailable" }, 503);
  }
}
