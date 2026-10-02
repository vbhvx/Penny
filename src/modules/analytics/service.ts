import prisma from "@/lib/db/prisma";
import Decimal from "decimal.js";
import { Prisma, TransactionStatus, TransactionType } from "@prisma/client";
import { CurrencyService } from "@/modules/currencies/service";
import { Money } from "@/lib/financial/money";

export interface AnalyticsQueryOptions {
  startDate?: Date;
  endDate?: Date;
  accountId?: string;
  reportingCurrency?: string;
  includePending?: boolean;
}

export interface FinancialSummaryResult {
  reportingCurrency: string;
  dateRange: {
    start: string;
    end: string;
  };
  totalIncome: string;
  totalExpenses: string;
  netCashFlow: string;
  totalRefunds: string;
  pendingTransactions: {
    count: number;
    totalAmount: string;
  };
  transfersExcluded: {
    count: number;
    totalAmount: string;
  };
  hasUnconvertedCurrencies: boolean;
  unconvertedCurrencies: string[];
  dataFreshness: {
    transactionCount: number;
    accountCount: number;
    lastImportDate?: string;
    earliestTransactionDate?: string;
    latestTransactionDate?: string;
  };
}

export interface CategorySpendingItem {
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  icon?: string | null;
  color?: string | null;
  amount: string; // Positive string for expense display
  percentage: number;
  transactionCount: number;
}

export interface MerchantSpendingItem {
  merchant: string;
  amount: string;
  percentage: number;
  transactionCount: number;
  averageAmount: string;
}

export interface TrendDataPoint {
  period: string; // "2024-01" or "2024-01-15"
  income: number;
  expenses: number;
  net: number;
}

export class AnalyticsService {
  public static async getSummary(
    userId: string,
    options: AnalyticsQueryOptions = {}
  ): Promise<FinancialSummaryResult> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { defaultCurrency: true },
    });

    const reportingCurrency = (options.reportingCurrency || user?.defaultCurrency || "USD").toUpperCase();

    // Default to last 30 days if no date bounds provided
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const startDate = options.startDate || defaultStart;
    const endDate = options.endDate || now;

    // Build Prisma query filter
    const where: Prisma.TransactionWhereInput = {
      userId,
      transactionDate: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (options.accountId) {
      where.accountId = options.accountId;
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        account: true,
        category: true,
      },
      orderBy: { transactionDate: "asc" },
    });

    let totalIncome = new Decimal(0);
    let totalExpenses = new Decimal(0); // Kept positive for user display
    let totalRefunds = new Decimal(0);
    let pendingCount = 0;
    let pendingAmount = new Decimal(0);
    let transferCount = 0;
    let transferAmount = new Decimal(0);

    let hasUnconvertedCurrencies = false;
    const unconvertedCurrenciesSet = new Set<string>();

    for (const tx of transactions) {
      // Pending handling: Section 6 explicitly states:
      // "Do not conflate pending transactions with posted transactions... Display pending amounts separately"
      if (tx.status === TransactionStatus.PENDING) {
        pendingCount++;
        const convertedPending = await CurrencyService.convert(
          new Decimal(tx.amount).abs(),
          tx.currency,
          reportingCurrency,
          tx.transactionDate
        );
        pendingAmount = pendingAmount.plus(convertedPending.convertedAmount);
        continue;
      }

      // Internal Transfers handling: Section 6 explicitly states:
      // "Internal transfers must not be counted as consumer spending"
      if (tx.transactionType === TransactionType.TRANSFER) {
        transferCount++;
        const convertedTransfer = await CurrencyService.convert(
          new Decimal(tx.amount).abs(),
          tx.currency,
          reportingCurrency,
          tx.transactionDate
        );
        transferAmount = transferAmount.plus(convertedTransfer.convertedAmount);
        continue;
      }

      // Convert to reporting currency
      const conversion = await CurrencyService.convert(
        new Decimal(tx.amount),
        tx.currency,
        reportingCurrency,
        tx.transactionDate
      );

      if (conversion.rateMissing) {
        hasUnconvertedCurrencies = true;
        unconvertedCurrenciesSet.add(tx.currency);
      }

      const convertedVal = conversion.convertedAmount;

      // Handle Refunds
      if (tx.transactionType === TransactionType.REFUND) {
        totalRefunds = totalRefunds.plus(convertedVal.abs());
      } else if (convertedVal.isPositive()) {
        totalIncome = totalIncome.plus(convertedVal);
      } else if (convertedVal.isNegative()) {
        totalExpenses = totalExpenses.plus(convertedVal.abs());
      }
    }

    // Net Cash Flow: Income - Expenses + Refunds
    const netCashFlow = totalIncome.minus(totalExpenses).plus(totalRefunds);

    // Data freshness stats
    const accounts = await prisma.financialAccount.count({ where: { userId } });
    const lastImport = await prisma.importBatch.findFirst({
      where: { userId, status: "COMMITTED" },
      orderBy: { committedAt: "desc" },
    });

    const earliestDate = transactions.length > 0 ? transactions[0].transactionDate : undefined;
    const latestDate =
      transactions.length > 0 ? transactions[transactions.length - 1].transactionDate : undefined;

    return {
      reportingCurrency,
      dateRange: {
        start: startDate.toISOString().split("T")[0],
        end: endDate.toISOString().split("T")[0],
      },
      totalIncome: new Money(totalIncome, reportingCurrency).toFixed(),
      totalExpenses: new Money(totalExpenses, reportingCurrency).toFixed(),
      netCashFlow: new Money(netCashFlow, reportingCurrency).toFixed(),
      totalRefunds: new Money(totalRefunds, reportingCurrency).toFixed(),
      pendingTransactions: {
        count: pendingCount,
        totalAmount: new Money(pendingAmount, reportingCurrency).toFixed(),
      },
      transfersExcluded: {
        count: transferCount,
        totalAmount: new Money(transferAmount, reportingCurrency).toFixed(),
      },
      hasUnconvertedCurrencies,
      unconvertedCurrencies: Array.from(unconvertedCurrenciesSet),
      dataFreshness: {
        transactionCount: transactions.length,
        accountCount: accounts,
        lastImportDate: lastImport?.committedAt?.toISOString(),
        earliestTransactionDate: earliestDate?.toISOString().split("T")[0],
        latestTransactionDate: latestDate?.toISOString().split("T")[0],
      },
    };
  }

  public static async getCategoryBreakdown(
    userId: string,
    options: AnalyticsQueryOptions = {}
  ): Promise<CategorySpendingItem[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { defaultCurrency: true },
    });

    const reportingCurrency = (options.reportingCurrency || user?.defaultCurrency || "USD").toUpperCase();
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const startDate = options.startDate || defaultStart;
    const endDate = options.endDate || now;

    // Find all settled expense transactions (excluding transfers)
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        status: TransactionStatus.POSTED,
        transactionType: { in: [TransactionType.PURCHASE, TransactionType.FEE] },
        amount: { lt: 0 },
        transactionDate: { gte: startDate, lte: endDate },
        ...(options.accountId ? { accountId: options.accountId } : {}),
      },
      include: { category: true },
    });

    const categoryMap = new Map<
      string,
      {
        name: string;
        slug: string;
        icon?: string | null;
        color?: string | null;
        total: Decimal;
        count: number;
      }
    >();

    let totalAllExpenses = new Decimal(0);

    for (const tx of transactions) {
      const converted = await CurrencyService.convert(
        new Decimal(tx.amount).abs(),
        tx.currency,
        reportingCurrency,
        tx.transactionDate
      );

      const val = converted.convertedAmount;
      totalAllExpenses = totalAllExpenses.plus(val);

      const catId = tx.category?.id || "uncategorized";
      const catName = tx.category?.name || "Uncategorized";
      const catSlug = tx.category?.slug || "uncategorized";
      const icon = tx.category?.icon || "HelpCircle";
      const color = tx.category?.color || "#94a3b8";

      const existing = categoryMap.get(catId);
      if (existing) {
        existing.total = existing.total.plus(val);
        existing.count += 1;
      } else {
        categoryMap.set(catId, {
          name: catName,
          slug: catSlug,
          icon,
          color,
          total: val,
          count: 1,
        });
      }
    }

    const items: CategorySpendingItem[] = [];
    for (const [catId, data] of categoryMap.entries()) {
      const percentage = totalAllExpenses.isZero()
        ? 0
        : data.total.dividedBy(totalAllExpenses).times(100).toNumber();

      items.push({
        categoryId: catId,
        categoryName: data.name,
        categorySlug: data.slug,
        icon: data.icon,
        color: data.color,
        amount: new Money(data.total, reportingCurrency).toFixed(),
        percentage: Math.round(percentage * 10) / 10,
        transactionCount: data.count,
      });
    }

    // Sort descending by amount
    return items.sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));
  }

  public static async getMerchantBreakdown(
    userId: string,
    options: AnalyticsQueryOptions = {},
    limit = 10
  ): Promise<MerchantSpendingItem[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { defaultCurrency: true },
    });

    const reportingCurrency = (options.reportingCurrency || user?.defaultCurrency || "USD").toUpperCase();
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const startDate = options.startDate || defaultStart;
    const endDate = options.endDate || now;

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        status: TransactionStatus.POSTED,
        transactionType: { in: [TransactionType.PURCHASE, TransactionType.FEE] },
        amount: { lt: 0 },
        transactionDate: { gte: startDate, lte: endDate },
        ...(options.accountId ? { accountId: options.accountId } : {}),
      },
    });

    const merchantMap = new Map<string, { total: Decimal; count: number }>();
    let grandTotal = new Decimal(0);

    for (const tx of transactions) {
      const merchantName = (tx.normalizedMerchant || tx.originalDescription).trim();
      const converted = await CurrencyService.convert(
        new Decimal(tx.amount).abs(),
        tx.currency,
        reportingCurrency,
        tx.transactionDate
      );

      const val = converted.convertedAmount;
      grandTotal = grandTotal.plus(val);

      const existing = merchantMap.get(merchantName);
      if (existing) {
        existing.total = existing.total.plus(val);
        existing.count += 1;
      } else {
        merchantMap.set(merchantName, { total: val, count: 1 });
      }
    }

    const items: MerchantSpendingItem[] = [];
    for (const [merchant, data] of merchantMap.entries()) {
      const percentage = grandTotal.isZero()
        ? 0
        : data.total.dividedBy(grandTotal).times(100).toNumber();
      const avg = data.total.dividedBy(data.count);

      items.push({
        merchant,
        amount: new Money(data.total, reportingCurrency).toFixed(),
        percentage: Math.round(percentage * 10) / 10,
        transactionCount: data.count,
        averageAmount: new Money(avg, reportingCurrency).toFixed(),
      });
    }

    return items
      .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
      .slice(0, limit);
  }

  public static async getTrendData(
    userId: string,
    options: AnalyticsQueryOptions = {}
  ): Promise<TrendDataPoint[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { defaultCurrency: true },
    });

    const reportingCurrency = (options.reportingCurrency || user?.defaultCurrency || "USD").toUpperCase();
    const now = new Date();
    // Default to last 6 months
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const startDate = options.startDate || sixMonthsAgo;
    const endDate = options.endDate || now;

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        status: TransactionStatus.POSTED,
        transactionType: { not: TransactionType.TRANSFER },
        transactionDate: { gte: startDate, lte: endDate },
      },
      orderBy: { transactionDate: "asc" },
    });

    // Group by Month: "YYYY-MM"
    const periodMap = new Map<string, { income: Decimal; expenses: Decimal }>();

    for (const tx of transactions) {
      const monthKey = tx.transactionDate.toISOString().substring(0, 7); // "YYYY-MM"
      if (!periodMap.has(monthKey)) {
        periodMap.set(monthKey, { income: new Decimal(0), expenses: new Decimal(0) });
      }

      const bucket = periodMap.get(monthKey)!;
      const converted = await CurrencyService.convert(
        new Decimal(tx.amount),
        tx.currency,
        reportingCurrency,
        tx.transactionDate
      );

      const val = converted.convertedAmount;
      if (val.isPositive()) {
        bucket.income = bucket.income.plus(val);
      } else if (val.isNegative()) {
        bucket.expenses = bucket.expenses.plus(val.abs());
      }
    }

    const result: TrendDataPoint[] = [];
    for (const [period, data] of periodMap.entries()) {
      result.push({
        period,
        income: Math.round(data.income.toNumber() * 100) / 100,
        expenses: Math.round(data.expenses.toNumber() * 100) / 100,
        net: Math.round(data.income.minus(data.expenses).toNumber() * 100) / 100,
      });
    }

    return result.sort((a, b) => a.period.localeCompare(b.period));
  }
}
