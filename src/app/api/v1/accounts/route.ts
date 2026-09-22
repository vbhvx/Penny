import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import prisma from "@/lib/db/prisma";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/response";
import { AccountType, AccountSourceType } from "@prisma/client";
import { z } from "zod";
import Decimal from "decimal.js";

const createAccountSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  type: z.nativeEnum(AccountType).default(AccountType.CHECKING),
  currency: z.string().length(3).default("USD"),
  institutionName: z.string().optional(),
  accountNumberMask: z.string().optional(),
  initialBalance: z.number().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session?.userId) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

    const accounts = await prisma.financialAccount.findMany({
      where: { userId: session.userId, isArchived: false },
      include: {
        balanceObservations: {
          orderBy: { observationDate: "desc" },
          take: 1,
        },
        _count: {
          select: { transactions: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const formatted = accounts.map((acc) => ({
      id: acc.id,
      name: acc.name,
      type: acc.type,
      currency: acc.currency,
      institutionName: acc.institutionName,
      accountNumberMask: acc.accountNumberMask,
      sourceType: acc.sourceType,
      transactionCount: acc._count.transactions,
      lastObservedBalance: acc.balanceObservations[0]?.observedBalance.toString() || null,
      lastObservationDate: acc.balanceObservations[0]?.observationDate.toISOString() || null,
    }));

    return successResponse(formatted);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session?.userId) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

    const body = await req.json();
    const data = createAccountSchema.parse(body);

    const account = await prisma.financialAccount.create({
      data: {
        userId: session.userId,
        name: data.name,
        type: data.type,
        currency: data.currency.toUpperCase(),
        institutionName: data.institutionName,
        accountNumberMask: data.accountNumberMask,
        sourceType: AccountSourceType.MANUAL,
        ...(data.initialBalance !== undefined
          ? {
              balanceObservations: {
                create: {
                  observedBalance: new Decimal(data.initialBalance),
                  currency: data.currency.toUpperCase(),
                  observationDate: new Date(),
                  source: "MANUAL_INITIAL",
                },
              },
            }
          : {}),
      },
    });

    return successResponse(account, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

