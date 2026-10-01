import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import prisma from "@/lib/db/prisma";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/response";
import { z } from "zod";
import Decimal from "decimal.js";

const updateBudgetSchema = z.object({
  name: z.string().min(1).optional(),
  limitAmount: z.number().positive().optional(),
  alertThreshold: z.number().min(0.1).max(1.0).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session?.userId) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

    const existing = await prisma.budget.findFirst({
      where: { id: params.id, userId: session.userId },
    });

    if (!existing) return errorResponse("Budget not found", 404, "NOT_FOUND");

    const body = await req.json();
    const data = updateBudgetSchema.parse(body);

    const updated = await prisma.budget.update({
      where: { id: params.id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.limitAmount ? { limitAmount: new Decimal(data.limitAmount) } : {}),
        ...(data.alertThreshold ? { alertThreshold: new Decimal(data.alertThreshold) } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
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

    const existing = await prisma.budget.findFirst({
      where: { id: params.id, userId: session.userId },
    });

    if (!existing) return errorResponse("Budget not found", 404, "NOT_FOUND");

    await prisma.budget.delete({
      where: { id: params.id },
    });

    return successResponse({ message: "Budget deleted successfully" });
  } catch (err) {
    return handleApiError(err);
  }
}

