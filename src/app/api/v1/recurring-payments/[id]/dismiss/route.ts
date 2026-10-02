import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { RecurringService } from "@/modules/recurring/service";
import { RecurringStatus } from "@prisma/client";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/response";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session?.userId) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

    await RecurringService.updateCandidateStatus(
      session.userId,
      params.id,
      RecurringStatus.DISMISSED
    );

    return successResponse({ message: "Recurring candidate dismissed" });
  } catch (err) {
    return handleApiError(err);
  }
}

