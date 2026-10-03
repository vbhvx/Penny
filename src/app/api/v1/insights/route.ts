import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { InsightsService } from "@/modules/insights/service";
import prisma from "@/lib/db/prisma";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session?.userId) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

    // Generate fresh insights
    const fresh = await InsightsService.generateInsights(session.userId);

    // Also fetch persisted active insights
    const persisted = await prisma.spendingInsight.findMany({
      where: { userId: session.userId, isDismissed: false },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return successResponse({
      insights: fresh.length > 0 ? fresh : persisted,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

