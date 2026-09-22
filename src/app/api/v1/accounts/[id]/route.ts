import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import prisma from "@/lib/db/prisma";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/response";
import { AccountType } from "@prisma/client";
import { z } from "zod";

const updateAccountSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.nativeEnum(AccountType).optional(),
  institutionName: z.string().optional(),
  accountNumberMask: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session?.userId) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

    const account = await prisma.financialAccount.findFirst({
      where: { id: params.id, userId: session.userId },
    });

    if (!account) return errorResponse("Account not found", 404, "NOT_FOUND");

    const body = await req.json();
    const data = updateAccountSchema.parse(body);

    const updated = await prisma.financialAccount.update({
      where: { id: params.id },
      data,
    });

    return successResponse(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session?.userId) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

    const account = await prisma.financialAccount.findFirst({
      where: { id: params.id, userId: session.userId },
    });

    if (!account) return errorResponse("Account not found", 404, "NOT_FOUND");

    // Soft archive to protect transaction history
    await prisma.financialAccount.update({
      where: { id: params.id },
      data: { isArchived: true },
    });

    return successResponse({ message: "Account archived successfully" });
  } catch (err) {
    return handleApiError(err);
  }
}

