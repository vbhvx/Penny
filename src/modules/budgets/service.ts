import prisma from "@/lib/db/prisma";
import Decimal from "decimal.js";
import { Prisma, BudgetPeriod, TransactionStatus, TransactionType } from "@prisma/client";
import { CurrencyService } from "@/modules/currencies/service";
import { Money } from "@/lib/financial/money";

export interface BudgetStatusItem {
  id: string;
  name: string;
  categoryId?: string | null;
  categoryName?: string;
  categorySlug?: string;
  period: BudgetPeriod;
  currency: string;
  limitAmount: string;
  spentAmount: string;
  remainingAmount: string;
  percentageUsed: number;
  projectedPeriodEnd: string;
  isOverspent: boolean;
  isNearLimit: boolean;
  alertThresholdPercent: number;
  startDate: string;
  endDate?: string | null;
}

export class BudgetService {
  /**
   * Calculate real-time budget status and threshold tracking
   */
  public static async getBudgetStatuses(userId: string): Promise<BudgetStatusItem[]> {
    const budgets = await prisma.budget.findMany({
      where: { userId, isActive: true },
      include: { category: true },
    });

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const daysInMonth = currentMonthEnd.getDate();
    const daysElapsed = Math.max(1, now.getDate());

    const results: BudgetStatusItem[] = [];

    for (const b of budgets) {
      const budgetStart = b.startDate > currentMonthStart ? b.startDate : currentMonthStart;
      const budgetEnd = b.endDate && b.endDate < currentMonthEnd ? b.endDate : currentMonthEnd;

      // Query eligible spending for this budget
      const whereClause: Prisma.TransactionWhereInput = {
        userId,
        status: TransactionStatus.POSTED,
        transactionType: { in: [TransactionType.PURCHASE, TransactionType.FEE] },
        amount: { lt: 0 },
        transactionDate: { gte: budgetStart, lte: budgetEnd },
      };

      if (b.categoryId) {
        whereClause.categoryId = b.categoryId;
      }

      const transactions = await prisma.transaction.findMany({
        where: whereClause,
      });

      let totalSpent = new Decimal(0);
      for (const tx of transactions) {
        const converted = await CurrencyService.convert(
          new Decimal(tx.amount).abs(),
          tx.currency,
          b.currency,
          tx.transactionDate
        );
        totalSpent = totalSpent.plus(converted.convertedAmount);
      }

      const limit = new Decimal(b.limitAmount);
      const remaining = limit.minus(totalSpent);
      const percentageUsed = limit.isZero()
        ? 0
        : Math.round(totalSpent.dividedBy(limit).times(100).toNumber());

      // Projected spending based on daily run rate
      const dailyRunRate = totalSpent.dividedBy(daysElapsed);
      const projectedTotal = dailyRunRate.times(daysInMonth);

      const threshold = new Decimal(b.alertThreshold).times(100).toNumber();
      const isOverspent = totalSpent.greaterThan(limit);
      const isNearLimit = percentageUsed >= threshold && !isOverspent;

      results.push({
        id: b.id,
        name: b.name,
        categoryId: b.categoryId,
        categoryName: b.category?.name || "Overall Budget",
        categorySlug: b.category?.slug || "all",
        period: b.period,
        currency: b.currency,
        limitAmount: new Money(limit, b.currency).toFixed(),
        spentAmount: new Money(totalSpent, b.currency).toFixed(),
        remainingAmount: new Money(remaining, b.currency).toFixed(),
        percentageUsed,
        projectedPeriodEnd: new Money(projectedTotal, b.currency).toFixed(),
        isOverspent,
        isNearLimit,
        alertThresholdPercent: threshold,
        startDate: budgetStart.toISOString().split("T")[0],
        endDate: budgetEnd?.toISOString().split("T")[0],
      });
    }

    return results;
  }
}
