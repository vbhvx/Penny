import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { PrivacyService } from "@/modules/privacy/service";
import { errorResponse, handleApiError } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session?.userId) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

    const jsonData = await PrivacyService.exportFullJson(session.userId);
    const dateStr = new Date().toISOString().split("T")[0];

    return new NextResponse(JSON.stringify(jsonData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="penny-export-${dateStr}.json"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

