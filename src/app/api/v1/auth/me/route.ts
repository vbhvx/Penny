import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import prisma from "@/lib/db/prisma";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session || !session.userId) {
      return errorResponse("Not authenticated", 401, "UNAUTHORIZED");
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        defaultCurrency: true,
        locale: true,
        timezone: true,
        isDemo: true,
        createdAt: true,
      },
    });

    if (!user) {
      return errorResponse("User not found", 404, "NOT_FOUND");
    }

    return successResponse({ user });
  } catch (err) {
    return handleApiError(err);
  }
}

