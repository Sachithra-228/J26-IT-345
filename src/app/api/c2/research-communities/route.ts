import { jsonResponse } from "@/lib/api";
import { getMongoDatabase } from "@/lib/mongodb";
import {
  COMMUNITY_VERSION,
  validateCommunityCatalog,
} from "@/lib/c2/communities";

/** Public synthetic content only. No private student records or forum writes. */
export async function GET() {
  try {
    const database = await getMongoDatabase();
    const communities = await database
      .collection("c2_research_communities")
      .find({
        sourceType: "synthetic",
        isSample: true,
        isActive: true,
        catalogVersion: COMMUNITY_VERSION,
      })
      .project({
        _id: 1,
        name: 1,
        tagline: 1,
        description: 1,
        topics: 1,
        languages: 1,
        focusKeys: 1,
        sourceType: 1,
        isSample: 1,
        conversationStarters: 1,
      })
      .sort({ _id: 1 })
      .toArray();
    return jsonResponse(
      validateCommunityCatalog({
        version: COMMUNITY_VERSION,
        sourceType: "synthetic",
        communities,
      }),
    );
  } catch {
    return jsonResponse(
      { message: "Sample community catalog is unavailable." },
      503,
    );
  }
}
