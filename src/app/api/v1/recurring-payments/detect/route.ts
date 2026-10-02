import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { RecurringService } from "@/modules/recurring/service";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/response";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session?.userId) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

    const detected = await RecurringService.detectCandidates(session.userId);
    return successResponse({ detectedCount: detected, message: "Scan completed" });
  } catch (err) {
    return handleApiError(err);
  }
}

