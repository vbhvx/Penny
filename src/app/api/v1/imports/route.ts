import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import prisma from "@/lib/db/prisma";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session?.userId) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

    const batches = await prisma.importBatch.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { transactions: true, rowResults: true },
        },
      },
    });

    return successResponse(batches);
  } catch (err) {
    return handleApiError(err);
  }
}

