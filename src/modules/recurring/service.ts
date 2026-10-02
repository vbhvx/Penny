import prisma from "@/lib/db/prisma";
import Decimal from "decimal.js";
import { RecurringFrequency, RecurringStatus, TransactionStatus, TransactionType } from "@prisma/client";

interface IntervalAnalysis {
  frequency: RecurringFrequency;
  intervalDays: number;
  regularityScore: number; // 0 to 1
  nextExpectedDate: Date;
}

export class RecurringService {
  /**
   * Scan user's transactions to detect recurring payment candidates
   */
  public static async detectCandidates(userId: string): Promise<number> {
    // Look at past 12 months of posted expenses
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        status: TransactionStatus.POSTED,
        transactionType: { in: [TransactionType.PURCHASE, TransactionType.FEE] },
        amount: { lt: 0 },
        transactionDate: { gte: oneYearAgo },
      },
      orderBy: { transactionDate: "asc" },
    });

    // Group transactions by normalized merchant name (or fallback to clean description)
    const groups = new Map<string, typeof transactions>();

    for (const tx of transactions) {
      const merchant = (tx.normalizedMerchant || tx.originalDescription).trim().toLowerCase();
      if (!merchant || merchant.length < 3) continue;

      if (!groups.has(merchant)) {
        groups.set(merchant, []);
      }
      groups.get(merchant)!.push(tx);
    }

    let detectedCount = 0;

    for (const [merchant, groupTxs] of groups.entries()) {
      if (groupTxs.length < 2) continue; // Need at least 2 occurrences

      // Analyze intervals between consecutive occurrences
      const dates = groupTxs.map((t) => t.transactionDate.getTime());
      const amounts = groupTxs.map((t) => new Decimal(t.amount).abs());

      // Check amount similarity: maximum deviation < 20%
      const firstAmount = amounts[0];
      const allSimilarAmounts = amounts.every((a) => {
        const diff = a.minus(firstAmount).abs();
        return diff.dividedBy(firstAmount).lessThan(0.25);
      });

      if (!allSimilarAmounts) continue;

      const intervals: number[] = [];
      for (let i = 1; i < dates.length; i++) {
        const diffDays = Math.round((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24));
        intervals.push(diffDays);
      }

      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const intervalAnalysis = this.classifyFrequency(avgInterval, dates[dates.length - 1]);

      if (!intervalAnalysis) continue;

      const lastObservedDate = new Date(dates[dates.length - 1]);
      const firstObservedDate = new Date(dates[0]);
      const avgAmount = amounts.reduce((acc, val) => acc.plus(val), new Decimal(0)).dividedBy(amounts.length);
      const currency = groupTxs[0].currency;

      // Check if candidate already exists in database
      const existing = await prisma.recurringPaymentCandidate.findFirst({
        where: {
          userId,
          merchant: { equals: merchant, mode: "insensitive" },
        },
      });

      const evidence = {
        occurrenceCount: groupTxs.length,
        averageIntervalDays: Math.round(avgInterval),
        observedIntervals: intervals,
        detectedFrequency: intervalAnalysis.frequency,
        amountDeviation: "Low",
      };

      const confidence = new Decimal(Math.min(0.95, 0.6 + groupTxs.length * 0.08));

      if (!existing) {
        const candidate = await prisma.recurringPaymentCandidate.create({
          data: {
            userId,
            merchant,
            expectedAmount: avgAmount,
            currency,
            frequency: intervalAnalysis.frequency,
            confidenceScore: confidence,
            confidenceExplanation: `Observed ${groupTxs.length} consistent payments every ~${Math.round(avgInterval)} days for ${merchant}.`,
            detectionEvidence: evidence,
            reviewStatus: RecurringStatus.DETECTED,
            firstObservedDate,
            lastObservedDate,
            nextExpectedDate: intervalAnalysis.nextExpectedDate,
          },
        });

        // Link occurrences
        for (const tx of groupTxs) {
          await prisma.recurringPaymentOccurrence.upsert({
            where: {
              recurringCandidateId_transactionId: {
                recurringCandidateId: candidate.id,
                transactionId: tx.id,
              },
            },
            create: {
              recurringCandidateId: candidate.id,
              transactionId: tx.id,
            },
            update: {},
          });
        }

        detectedCount++;
      } else {
        // Update existing record if new occurrences arrived
        await prisma.recurringPaymentCandidate.update({
          where: { id: existing.id },
          data: {
            lastObservedDate,
            expectedAmount: avgAmount,
            nextExpectedDate: intervalAnalysis.nextExpectedDate,
            detectionEvidence: evidence,
          },
        });
      }
    }

    return detectedCount;
  }

  private static classifyFrequency(
    avgDays: number,
    lastDateMs: number
  ): IntervalAnalysis | null {
    let freq: RecurringFrequency | null = null;
    let daysToAdd = 30;

    if (avgDays >= 5 && avgDays <= 9) {
      freq = RecurringFrequency.WEEKLY;
      daysToAdd = 7;
    } else if (avgDays >= 12 && avgDays <= 16) {
      freq = RecurringFrequency.BIWEEKLY;
      daysToAdd = 14;
    } else if (avgDays >= 25 && avgDays <= 35) {
      freq = RecurringFrequency.MONTHLY;
      daysToAdd = 30;
    } else if (avgDays >= 80 && avgDays <= 100) {
      freq = RecurringFrequency.QUARTERLY;
      daysToAdd = 90;
    } else if (avgDays >= 340 && avgDays <= 380) {
      freq = RecurringFrequency.ANNUALLY;
      daysToAdd = 365;
    }

    if (!freq) return null;

    const nextExpected = new Date(lastDateMs + daysToAdd * 24 * 60 * 60 * 1000);

    return {
      frequency: freq,
      intervalDays: daysToAdd,
      regularityScore: 0.9,
      nextExpectedDate: nextExpected,
    };
  }

  /**
   * User confirmation or dismissal of recurring candidate
   */
  public static async updateCandidateStatus(
    userId: string,
    candidateId: string,
    status: RecurringStatus
  ) {
    return prisma.recurringPaymentCandidate.updateMany({
      where: { id: candidateId, userId },
      data: { reviewStatus: status },
    });
  }
}

