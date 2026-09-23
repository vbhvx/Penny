import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import prisma from "@/lib/db/prisma";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/response";
import { Prisma, TransactionStatus, TransactionType, CategorizationSource } from "@prisma/client";
import { z } from "zod";
import Decimal from "decimal.js";

const updateSchema = z.object({
  description: z.string().min(1).optional(),
  amount: z.number().optional(),
  transactionDate: z.string().optional(),
  status: z.nativeEnum(TransactionStatus).optional(),
  transactionType: z.nativeEnum(TransactionType).optional(),
  categoryId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  needsReview: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session?.userId) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

    const tx = await prisma.transaction.findFirst({
      where: { id: params.id, userId: session.userId },
      include: {
        account: true,
        category: true,
        transferGroup: true,
        auditEvents: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!tx) return errorResponse("Transaction not found", 404, "NOT_FOUND");
    return successResponse(tx);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session?.userId) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

    const existing = await prisma.transaction.findFirst({
      where: { id: params.id, userId: session.userId },
    });

    if (!existing) return errorResponse("Transaction not found", 404, "NOT_FOUND");

    const body = await req.json();
    const data = updateSchema.parse(body);

    const updateData: Prisma.TransactionUncheckedUpdateInput = {};

    if (data.description !== undefined) updateData.originalDescription = data.description;
    if (data.amount !== undefined) updateData.amount = new Decimal(data.amount);
    if (data.transactionDate !== undefined) updateData.transactionDate = new Date(data.transactionDate);
    if (data.status !== undefined) updateData.status = data.status;
    if (data.transactionType !== undefined) updateData.transactionType = data.transactionType;
    if (data.categoryId !== undefined) {
      updateData.categoryId = data.categoryId;
      updateData.categorizationSource = CategorizationSource.USER;
      updateData.needsReview = false;
    }
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.needsReview !== undefined) updateData.needsReview = data.needsReview;

    const updated = await prisma.transaction.update({
      where: { id: params.id },
      data: updateData,
      include: { category: true, account: true },
    });

    // Record audit event
    await prisma.transactionAuditEvent.create({
      data: {
        transactionId: params.id,
        userId: session.userId,
        action: "UPDATED",
        previousState: {
          description: existing.originalDescription,
          amount: existing.amount.toString(),
          status: existing.status,
          categoryId: existing.categoryId,
        },
        newState: {
          description: updated.originalDescription,
          amount: updated.amount.toString(),
          status: updated.status,
          categoryId: updated.categoryId,
        },
        reason: "User edit",
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

    const existing = await prisma.transaction.findFirst({
      where: { id: params.id, userId: session.userId },
    });

    if (!existing) return errorResponse("Transaction not found", 404, "NOT_FOUND");

    await prisma.transaction.delete({
      where: { id: params.id },
    });

    return successResponse({ message: "Transaction deleted successfully" });
  } catch (err) {
    return handleApiError(err);
  }
}
