import prisma from "@/lib/db/prisma";
import Decimal from "decimal.js";
import { TransactionStatus, TransactionType } from "@prisma/client";
import { CurrencyService } from "@/modules/currencies/service";
import { BudgetService } from "@/modules/budgets/service";

export interface GeneratedInsight {
  id?: string;
  type: string;
  title: string;
  explanation: string;
  evidence: Record<string, unknown>;
  dateRange: { start: string; end: string };
}

export class InsightsService {
  /**
   * Deterministically generates evidence-backed insights from transactions and budgets
   */
  public static async generateInsights(userId: string): Promise<GeneratedInsight[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { defaultCurrency: true },
    });

    const currency = user?.defaultCurrency || "USD";
    const insights: GeneratedInsight[] = [];

    const now = new Date();
    // Current month: 1st to today
    const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentEnd = now;

    // Previous month: 1st to same day of previous month
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEnd = new Date(now.getFullYear(), now.getMonth() - 1, Math.min(now.getDate(), 28));

    // 1. Budget Alerts
    const budgetStatuses = await BudgetService.getBudgetStatuses(userId);
    for (const b of budgetStatuses) {
      if (b.isOverspent) {
        insights.push({
          type: "BUDGET_OVERSPENT",
          title: `${b.categoryName} budget exceeded`,
          explanation: `You have spent ${currency} ${b.spentAmount} against your limit of ${currency} ${b.limitAmount} (${b.percentageUsed}% used).`,
          evidence: {
            budgetId: b.id,
            limit: b.limitAmount,
            spent: b.spentAmount,
            percentage: b.percentageUsed,
          },
          dateRange: {
            start: currentStart.toISOString().split("T")[0],
            end: currentEnd.toISOString().split("T")[0],
          },
        });
      } else if (b.isNearLimit) {
        insights.push({
          type: "BUDGET_WARNING",
          title: `${b.categoryName} budget near limit`,
          explanation: `You have consumed ${b.percentageUsed}% of your ${currency} ${b.limitAmount} budget with ${b.remainingAmount} remaining.`,
          evidence: {
            budgetId: b.id,
            limit: b.limitAmount,
            remaining: b.remainingAmount,
            percentage: b.percentageUsed,
          },
          dateRange: {
            start: currentStart.toISOString().split("T")[0],
            end: currentEnd.toISOString().split("T")[0],
          },
        });
      }
    }

    // 2. Unreviewed Recurring Payment Candidates
    const detectedRecurring = await prisma.recurringPaymentCandidate.count({
      where: { userId, reviewStatus: "DETECTED" },
    });

    if (detectedRecurring > 0) {
      insights.push({
        type: "RECURRING_REVIEW",
        title: `${detectedRecurring} recurring subscription${detectedRecurring > 1 ? "s" : ""} detected`,
        explanation: `Penny identified ${detectedRecurring} candidate recurring payment${detectedRecurring > 1 ? "s" : ""} awaiting your confirmation.`,
        evidence: { detectedCount: detectedRecurring },
        dateRange: {
          start: currentStart.toISOString().split("T")[0],
          end: currentEnd.toISOString().split("T")[0],
        },
      });
    }

    // 3. Month-over-Month Category Spending Shifts (Groceries & Restaurants)
    const currentMonthTxs = await prisma.transaction.findMany({
      where: {
        userId,
        status: TransactionStatus.POSTED,
        transactionType: { in: [TransactionType.PURCHASE, TransactionType.FEE] },
        amount: { lt: 0 },
        transactionDate: { gte: currentStart, lte: currentEnd },
      },
      include: { category: true },
    });

    const prevMonthTxs = await prisma.transaction.findMany({
      where: {
        userId,
        status: TransactionStatus.POSTED,
        transactionType: { in: [TransactionType.PURCHASE, TransactionType.FEE] },
        amount: { lt: 0 },
        transactionDate: { gte: prevStart, lte: prevEnd },
      },
      include: { category: true },
    });

    const sumCategory = async (txs: typeof currentMonthTxs, slug: string) => {
      let sum = new Decimal(0);
      for (const t of txs) {
        if (t.category?.slug === slug) {
          const conv = await CurrencyService.convert(
            new Decimal(t.amount).abs(),
            t.currency,
            currency,
            t.transactionDate
          );
          sum = sum.plus(conv.convertedAmount);
        }
      }
      return sum;
    };

    const groceryCurrent = await sumCategory(currentMonthTxs, "groceries");
    const groceryPrev = await sumCategory(prevMonthTxs, "groceries");

    if (!groceryPrev.isZero() && !groceryCurrent.isZero()) {
      const diff = groceryCurrent.minus(groceryPrev);
      const pct = diff.dividedBy(groceryPrev).times(100).toNumber();

      if (Math.abs(pct) >= 15) {
        const direction = pct > 0 ? "increased" : "decreased";
        insights.push({
          type: "CATEGORY_TREND",
          title: `Grocery spending ${direction} by ${Math.abs(Math.round(pct))}%`,
          explanation: `You've spent ${currency} ${groceryCurrent.toFixed(2)} on groceries this month compared to ${currency} ${groceryPrev.toFixed(2)} in the equivalent period last month.`,
          evidence: {
            currentPeriodTotal: groceryCurrent.toFixed(2),
            previousPeriodTotal: groceryPrev.toFixed(2),
            percentageChange: Math.round(pct),
          },
          dateRange: {
            start: currentStart.toISOString().split("T")[0],
            end: currentEnd.toISOString().split("T")[0],
          },
        });
      }
    }

    // Persist or update in DB
    for (const ins of insights) {
      await prisma.spendingInsight.create({
        data: {
          userId,
          insightType: ins.type,
          title: ins.title,
          plainLanguageExplanation: ins.explanation,
          evidenceData: ins.evidence as any,
          dateRangeStart: currentStart,
          dateRangeEnd: currentEnd,
          reportingCurrency: currency,
          calculationVersion: "v1.0",
        },
      });
    }

    return insights;
  }
}
