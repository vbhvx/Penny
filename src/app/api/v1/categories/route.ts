import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getUserCategories } from "@/modules/categorization/categories";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session?.userId) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

    const categories = await getUserCategories(session.userId);
    return successResponse(categories);
  } catch (err) {
    return handleApiError(err);
  }
}

