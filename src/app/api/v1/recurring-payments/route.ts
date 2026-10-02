import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import prisma from "@/lib/db/prisma";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session?.userId) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

    const candidates = await prisma.recurringPaymentCandidate.findMany({
      where: { userId: session.userId },
      include: {
        occurrences: {
          include: {
            transaction: {
              select: {
                id: true,
                transactionDate: true,
                amount: true,
                currency: true,
                originalDescription: true,
              },
            },
          },
          take: 5,
        },
      },
      orderBy: [{ reviewStatus: "asc" }, { expectedAmount: "desc" }],
    });

    return successResponse(candidates);
  } catch (err) {
    return handleApiError(err);
  }
}

