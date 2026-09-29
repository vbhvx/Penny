import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import prisma from "@/lib/db/prisma";
import { ImportStatus } from "@prisma/client";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/response";

export async function POST(
  req: NextRequest,
  { params }: { params: { batchId: string } }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session?.userId) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

    const batch = await prisma.importBatch.findFirst({
      where: { id: params.batchId, userId: session.userId },
    });

    if (!batch) return errorResponse("Import batch not found", 404, "NOT_FOUND");

    await prisma.importBatch.update({
      where: { id: batch.id },
      data: { status: ImportStatus.CANCELLED },
    });

    return successResponse({ message: "Import batch cancelled" });
  } catch (err) {
    return handleApiError(err);
  }
}

