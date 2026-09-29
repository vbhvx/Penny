import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { IngestionService } from "@/modules/ingestion/service";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/response";

export async function POST(
  req: NextRequest,
  { params }: { params: { batchId: string } }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session?.userId) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

    const deletedCount = await IngestionService.undoImport(session.userId, params.batchId);

    return successResponse({
      message: `Successfully rolled back ${deletedCount} transaction(s)`,
      deletedCount,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

