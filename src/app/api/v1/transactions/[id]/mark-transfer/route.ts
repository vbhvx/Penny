import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import prisma from "@/lib/db/prisma";
import { TransactionType } from "@prisma/client";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/response";
import { z } from "zod";

const markTransferSchema = z.object({
  counterpartTransactionId: z.string().optional(),
  description: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session?.userId) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

    const tx = await prisma.transaction.findFirst({
      where: { id: params.id, userId: session.userId },
    });

    if (!tx) return errorResponse("Transaction not found", 404, "NOT_FOUND");

    const body = await req.json().catch(() => ({}));
    const { counterpartTransactionId, description } = markTransferSchema.parse(body);

    // Get transfers category
    const transferCat = await prisma.transactionCategory.findFirst({
      where: { slug: "transfers", isSystem: true },
    });

    const transferGroup = await prisma.transferGroup.create({
      data: {
        userId: session.userId,
        description: description || "Linked Internal Transfer",
      },
    });

    // Update current transaction
    await prisma.transaction.update({
      where: { id: tx.id },
      data: {
        transactionType: TransactionType.TRANSFER,
        transferGroupId: transferGroup.id,
        categoryId: transferCat?.id || tx.categoryId,
      },
    });

    // If counterpart provided, update it as well
    if (counterpartTransactionId) {
      await prisma.transaction.updateMany({
        where: { id: counterpartTransactionId, userId: session.userId },
        data: {
          transactionType: TransactionType.TRANSFER,
          transferGroupId: transferGroup.id,
          categoryId: transferCat?.id,
        },
      });
    }

    return successResponse({
      message: "Transaction marked as internal transfer",
      transferGroupId: transferGroup.id,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

