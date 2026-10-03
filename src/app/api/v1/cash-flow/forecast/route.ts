import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { ForecastingService } from "@/modules/forecasting/service";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session?.userId) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

    const url = new URL(req.url);
    const horizon = parseInt(url.searchParams.get("horizon") || "30", 10);

    const forecast = await ForecastingService.generateForecast(session.userId, horizon);
    return successResponse(forecast);
  } catch (err) {
    return handleApiError(err);
  }
}

