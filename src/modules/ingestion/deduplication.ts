import crypto from "crypto";
import prisma from "@/lib/db/prisma";
import { RowValidationStatus, TransactionStatus } from "@prisma/client";

export function generateContentHash(
  accountId: string,
  date: Date,
  amountFixed: string,
  normalizedDescription: string
): string {
  const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD
  const cleanDesc = normalizedDescription.trim().toLowerCase().replace(/\s+/g, " ");
  const raw = `${accountId}|${dateStr}|${amountFixed}|${cleanDesc}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function computeFileHash(fileBufferOrString: Buffer | string): string {
  return crypto.createHash("sha256").update(fileBufferOrString).digest("hex");
}

export interface DuplicateCheckResult {
  status: RowValidationStatus;
  matchedTransactionId?: string;
  reason?: string;
  confidence: number;
}

export async function checkDuplicate(
  userId: string,
  accountId: string,
  date: Date,
  amountFixed: string,
  normalizedDescription: string,
  externalId?: string
): Promise<DuplicateCheckResult> {
  // 1. External ID match (Highest confidence)
  if (externalId && externalId.trim().length > 0) {
    const existingByExternalId = await prisma.transaction.findFirst({
      where: {
        accountId,
        externalId: externalId.trim(),
      },
    });

    if (existingByExternalId) {
      return {
        status: RowValidationStatus.DUPLICATE_CONFIRMED,
        matchedTransactionId: existingByExternalId.id,
        reason: `Matches existing transaction with identical external reference (${externalId})`,
        confidence: 1.0,
      };
    }
  }

  // 2. Exact content signature match (Same account, same date, same amount, same description)
  const contentHash = generateContentHash(accountId, date, amountFixed, normalizedDescription);
  const existingByHash = await prisma.transaction.findFirst({
    where: {
      userId,
      accountId,
      contentHash,
    },
  });

  if (existingByHash) {
    return {
      status: RowValidationStatus.DUPLICATE_CONFIRMED,
      matchedTransactionId: existingByHash.id,
      reason: "Matches an existing recorded transaction with identical date, amount, and payee",
      confidence: 0.98,
    };
  }

  // 3. Pending-to-Posted replacement match
  // Check if there is an existing PENDING transaction with the exact same amount and similar description within +/- 3 days
  const startDate = new Date(date);
  startDate.setDate(startDate.getDate() - 3);
  const endDate = new Date(date);
  endDate.setDate(endDate.getDate() + 3);

  const pendingCandidate = await prisma.transaction.findFirst({
    where: {
      userId,
      accountId,
      status: TransactionStatus.PENDING,
      amount: amountFixed,
      transactionDate: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  if (pendingCandidate) {
    return {
      status: RowValidationStatus.DUPLICATE_PROBABLE,
      matchedTransactionId: pendingCandidate.id,
      reason: `Likely settled replacement for pending transaction #${pendingCandidate.id.substring(0, 8)}`,
      confidence: 0.85,
    };
  }

  // 4. Probabilistic duplicate check:
  // Same account, exact same amount, same day or +/- 1 day, fuzzy description match
  const nearStartDate = new Date(date);
  nearStartDate.setDate(nearStartDate.getDate() - 1);
  const nearEndDate = new Date(date);
  nearEndDate.setDate(nearEndDate.getDate() + 1);

  const probableMatches = await prisma.transaction.findMany({
    where: {
      userId,
      accountId,
      amount: amountFixed,
      transactionDate: {
        gte: nearStartDate,
        lte: nearEndDate,
      },
    },
    take: 3,
  });

  for (const match of probableMatches) {
    const descA = normalizedDescription.toLowerCase();
    const descB = match.originalDescription.toLowerCase();
    // Check if one description contains the other or identical first 8 chars
    if (
      descA.includes(descB.substring(0, 10)) ||
      descB.includes(descA.substring(0, 10)) ||
      descA === descB
    ) {
      return {
        status: RowValidationStatus.DUPLICATE_PROBABLE,
        matchedTransactionId: match.id,
        reason: `Probable duplicate of transaction on ${match.transactionDate.toISOString().split("T")[0]} (${match.originalDescription})`,
        confidence: 0.75,
      };
    }
  }

  return {
    status: RowValidationStatus.VALID,
    confidence: 0,
  };
}

