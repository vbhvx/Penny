import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { AnalyticsService } from "@/modules/analytics/service";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session?.userId) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

    const url = new URL(req.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const accountId = url.searchParams.get("accountId") || undefined;
    const currency = url.searchParams.get("currency") || undefined;
    const limit = parseInt(url.searchParams.get("limit") || "10", 10);

    const merchants = await AnalyticsService.getMerchantBreakdown(
      session.userId,
      {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        accountId,
        reportingCurrency: currency,
      },
      limit
    );

    return successResponse(merchants);
  } catch (err) {
    return handleApiError(err);
  }
}

