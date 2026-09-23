import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import prisma from "@/lib/db/prisma";
import { Prisma, TransactionSourceType, TransactionStatus, TransactionType, CategorizationSource } from "@prisma/client";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/response";
import { generateContentHash } from "@/modules/ingestion/deduplication";
import { categorizeTransaction } from "@/modules/categorization/engine";
import { z } from "zod";
import Decimal from "decimal.js";

const manualTransactionSchema = z.object({
  accountId: z.string().min(1, "Account ID is required"),
  transactionDate: z.string().min(1, "Date is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.number().refine((val) => val !== 0, "Amount cannot be zero"),
  currency: z.string().length(3).default("USD"),
  categoryId: z.string().optional(),
  transactionType: z.nativeEnum(TransactionType).optional(),
  status: z.nativeEnum(TransactionStatus).default(TransactionStatus.POSTED),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session?.userId) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "25", 10)));
    const search = url.searchParams.get("search")?.trim();
    const accountId = url.searchParams.get("accountId");
    const categoryId = url.searchParams.get("categoryId");
    const status = url.searchParams.get("status") as TransactionStatus | null;
    const type = url.searchParams.get("type") as TransactionType | null;
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const needsReview = url.searchParams.get("needsReview");

    const where: Prisma.TransactionWhereInput = {
      userId: session.userId,
    };

    if (search) {
      where.OR = [
        { originalDescription: { contains: search, mode: "insensitive" } },
        { normalizedMerchant: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
      ];
    }

    if (accountId) where.accountId = accountId;
    if (categoryId) {
      if (categoryId === "uncategorized") {
        where.categoryId = null;
      } else {
        where.categoryId = categoryId;
      }
    }
    if (status) where.status = status;
    if (type) where.transactionType = type;
    if (needsReview === "true") where.needsReview = true;

    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) where.transactionDate.gte = new Date(startDate);
      if (endDate) where.transactionDate.lte = new Date(endDate);
    }

    const [total, transactions] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        include: {
          account: { select: { id: true, name: true, type: true } },
          category: { select: { id: true, name: true, slug: true, icon: true, color: true } },
          transferGroup: true,
        },
        orderBy: { transactionDate: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const formatted = transactions.map((t) => ({
      id: t.id,
      accountId: t.accountId,
      accountName: t.account.name,
      accountType: t.account.type,
      date: t.transactionDate.toISOString().split("T")[0],
      description: t.originalDescription,
      merchant: t.normalizedMerchant,
      amount: t.amount.toString(),
      currency: t.currency,
      type: t.transactionType,
      status: t.status,
      category: t.category,
      categorizationSource: t.categorizationSource,
      needsReview: t.needsReview,
      transferGroupId: t.transferGroupId,
      notes: t.notes,
      isDemo: t.isDemo,
    }));

    return successResponse({
      transactions: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session?.userId) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

    const body = await req.json();
    const data = manualTransactionSchema.parse(body);

    const txDate = new Date(data.transactionDate);
    const amountDec = new Decimal(data.amount);

    let categoryId = data.categoryId;
    let catSource: CategorizationSource = CategorizationSource.USER;
    let needsReview = false;

    // If no category selected, run deterministic categorization
    if (!categoryId) {
      const cat = await categorizeTransaction(session.userId, data.description, null, data.amount);
      categoryId = cat.categoryId || undefined;
      catSource = cat.source;
      needsReview = cat.needsReview;
    }

    let defaultType = data.transactionType;
    if (!defaultType) {
      if (data.amount > 0) {
        defaultType = TransactionType.INCOME;
      } else {
        defaultType = TransactionType.PURCHASE;
      }
    }

    const hash = generateContentHash(data.accountId, txDate, amountDec.toFixed(4), data.description);

    const created = await prisma.transaction.create({
      data: {
        userId: session.userId,
        accountId: data.accountId,
        sourceType: TransactionSourceType.MANUAL,
        contentHash: hash,
        transactionDate: txDate,
        originalDescription: data.description,
        amount: amountDec,
        currency: data.currency.toUpperCase(),
        transactionType: defaultType,
        status: data.status,
        categoryId: categoryId || null,
        categorizationSource: catSource,
        needsReview,
        notes: data.notes,
        isDemo: session.isDemo,
      },
      include: {
        account: true,
        category: true,
      },
    });

    // Audit log
    await prisma.transactionAuditEvent.create({
      data: {
        transactionId: created.id,
        userId: session.userId,
        action: "MANUAL_CREATE",
        newState: {
          amount: created.amount.toString(),
          currency: created.currency,
          description: created.originalDescription,
        },
        reason: "Manual transaction entry",
      },
    });

    return successResponse(created, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
