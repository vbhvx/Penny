import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { IngestionService } from "@/modules/ingestion/service";
import { RecurringService } from "@/modules/recurring/service";
import { InsightsService } from "@/modules/insights/service";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/response";
import { z } from "zod";

const commitSchema = z.object({
  forceIncludeRowIndexes: z.array(z.number()).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { batchId: string } }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session?.userId) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

    let forceIncludeRowIndexes: number[] = [];
    try {
      const body = await req.json();
      const parsed = commitSchema.parse(body);
      forceIncludeRowIndexes = parsed.forceIncludeRowIndexes || [];
    } catch {
      // Body is optional
    }

    const result = await IngestionService.commitImport(
      session.userId,
      params.batchId,
      forceIncludeRowIndexes
    );

    // Step 7: Recalculate recurring candidates and insights
    try {
      await RecurringService.detectCandidates(session.userId);
      await InsightsService.generateInsights(session.userId);
    } catch (e) {
      console.warn("Background recalculation notice:", e);
    }

    return successResponse(result);
  } catch (err) {
    return handleApiError(err);
  }
}

