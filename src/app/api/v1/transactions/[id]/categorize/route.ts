import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import prisma from "@/lib/db/prisma";
import { CategorizationSource } from "@prisma/client";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/response";
import { z } from "zod";

const categorizeSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  createRule: z.boolean().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session?.userId) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

    const body = await req.json();
    const { categoryId, createRule } = categorizeSchema.parse(body);

    const tx = await prisma.transaction.findFirst({
      where: { id: params.id, userId: session.userId },
    });

    if (!tx) return errorResponse("Transaction not found", 404, "NOT_FOUND");

    const category = await prisma.transactionCategory.findFirst({
      where: {
        id: categoryId,
        OR: [{ userId: null }, { userId: session.userId }],
      },
    });

    if (!category) return errorResponse("Category not found", 404, "NOT_FOUND");

    // Update transaction
    const updated = await prisma.transaction.update({
      where: { id: params.id },
      data: {
        categoryId,
        categorizationSource: CategorizationSource.USER,
        needsReview: false,
      },
      include: { category: true },
    });

    // Optionally create user categorization rule
    let createdRule = null;
    if (createRule) {
      const pattern = tx.normalizedMerchant || tx.originalDescription.substring(0, 20);
      createdRule = await prisma.categorizationRule.create({
        data: {
          userId: session.userId,
          categoryId,
          merchantPattern: pattern,
          priority: 10,
        },
      });
    }

    return successResponse({
      transaction: updated,
      rule: createdRule,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

