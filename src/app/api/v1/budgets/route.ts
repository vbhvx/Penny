import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { BudgetService } from "@/modules/budgets/service";
import prisma from "@/lib/db/prisma";
import { BudgetPeriod } from "@prisma/client";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/response";
import { z } from "zod";
import Decimal from "decimal.js";

const createBudgetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  categoryId: z.string().nullable().optional(),
  period: z.nativeEnum(BudgetPeriod).default(BudgetPeriod.MONTHLY),
  limitAmount: z.number().positive("Limit must be greater than zero"),
  currency: z.string().length(3).default("USD"),
  alertThreshold: z.number().min(0.1).max(1.0).default(0.8),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session?.userId) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

    const statuses = await BudgetService.getBudgetStatuses(session.userId);
    return successResponse(statuses);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session?.userId) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

    const body = await req.json();
    const data = createBudgetSchema.parse(body);

    const now = new Date();
    const startDate = data.startDate ? new Date(data.startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = data.endDate ? new Date(data.endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const budget = await prisma.budget.create({
      data: {
        userId: session.userId,
        name: data.name,
        categoryId: data.categoryId || null,
        period: data.period,
        limitAmount: new Decimal(data.limitAmount),
        currency: data.currency.toUpperCase(),
        alertThreshold: new Decimal(data.alertThreshold),
        startDate,
        endDate,
      },
      include: { category: true },
    });

    return successResponse(budget, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

