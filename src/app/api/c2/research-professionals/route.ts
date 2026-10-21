import { NextRequest } from "next/server";
import { jsonResponse } from "@/lib/api";
import { getMongoDatabase } from "@/lib/mongodb";
import { requireSession } from "@/lib/session-auth";

/** Read-only, separately stored synthetic catalog. No real professional records. */
export async function GET(request: NextRequest) {
  const auth = await requireSession(request);
  if (auth.error) return auth.error;
  const database = await getMongoDatabase();
  const rows = await database
    .collection("c2_research_professionals")
    .find({ isActive: true, sourceType: "synthetic", isResearchProfile: true })
    .project({
      _id: 1,
      name: 1,
      profession: 1,
      gender: 1,
      languages: 1,
      supportAreas: 1,
      specialization: 1,
      mode: 1,
      availability: 1,
      profileSummary: 1,
      location: 1,
      sampleHours: 1,
      contactEmail: 1,
      sourceType: 1,
      isResearchProfile: 1,
    })
    .sort({ _id: 1 })
    .toArray();
  return jsonResponse(rows);
}
