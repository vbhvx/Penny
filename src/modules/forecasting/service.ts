import prisma from "@/lib/db/prisma";
import Decimal from "decimal.js";
import { RecurringFrequency, RecurringStatus, TransactionStatus, TransactionType } from "@prisma/client";
import { CurrencyService } from "@/modules/currencies/service";
import { Money } from "@/lib/financial/money";

export interface ForecastDayPoint {
  date: string;
  projectedBalance: number;
  expectedInflows: number;
  expectedOutflows: number;
  events: string[];
}

export interface CashFlowForecastResult {
  horizonDays: number;
  reportingCurrency: string;
  openingBalance: string;
  openingBalanceSource: string;
  totalExpectedInflows: string;
  totalExpectedOutflows: string;
  projectedClosingBalance: string;
  dailyTimeline: ForecastDayPoint[];
  assumptions: {
    recurringOutflowsCount: number;
    recurringInflowsCount: number;
    dailyRunRateEstimated: string;
    untrackedAccountsDisclosed: boolean;
  };
  uncertaintyDisclaimer: string;
}

export class ForecastingService {
  public static async generateForecast(
    userId: string,
    horizonDays = 30
  ): Promise<CashFlowForecastResult> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { defaultCurrency: true },
    });

    const currency = user?.defaultCurrency || "USD";

    // 1. Calculate Opening Balance:
    // Check for recent observed balances or sum of historical transactions
    const accounts = await prisma.financialAccount.findMany({
      where: { userId, isArchived: false },
      include: {
        balanceObservations: {
          orderBy: { observationDate: "desc" },
          take: 1,
        },
      },
    });

    let openingBalance = new Decimal(0);
    let openingSource = "OBSERVED_BALANCE";

    let hasAnyObserved = false;
    for (const acc of accounts) {
      if (acc.balanceObservations.length > 0) {
        hasAnyObserved = true;
        const obs = acc.balanceObservations[0];
        const conv = await CurrencyService.convert(
          new Decimal(obs.observedBalance),
          obs.currency,
          currency,
          obs.observationDate
        );
        openingBalance = openingBalance.plus(conv.convertedAmount);
      }
    }

    if (!hasAnyObserved) {
      // Calculate from entire ledger
      openingSource = "CALCULATED_LEDGER_NET";
      const allTx = await prisma.transaction.findMany({
        where: {
          userId,
          status: TransactionStatus.POSTED,
          transactionType: { not: TransactionType.TRANSFER },
        },
      });

      for (const t of allTx) {
        const conv = await CurrencyService.convert(
          new Decimal(t.amount),
          t.currency,
          currency,
          t.transactionDate
        );
        openingBalance = openingBalance.plus(conv.convertedAmount);
      }
    }

    // 2. Identify Expected Recurring Payments within horizon
    const recurringCandidates = await prisma.recurringPaymentCandidate.findMany({
      where: {
        userId,
        reviewStatus: { in: [RecurringStatus.CONFIRMED, RecurringStatus.DETECTED] },
      },
    });

    // 3. Estimate daily variable discretionary spending run rate (from past 60 days)
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const pastExpenses = await prisma.transaction.findMany({
      where: {
        userId,
        status: TransactionStatus.POSTED,
        transactionType: { in: [TransactionType.PURCHASE, TransactionType.FEE] },
        amount: { lt: 0 },
        transactionDate: { gte: sixtyDaysAgo },
      },
    });

    let totalDiscretionaryPast = new Decimal(0);
    for (const tx of pastExpenses) {
      // Skip transactions that match recurring merchants
      const isRecurring = recurringCandidates.some(
        (r) => r.merchant.toLowerCase() === (tx.normalizedMerchant || tx.originalDescription).toLowerCase()
      );
      if (!isRecurring) {
        const conv = await CurrencyService.convert(
          new Decimal(tx.amount).abs(),
          tx.currency,
          currency,
          tx.transactionDate
        );
        totalDiscretionaryPast = totalDiscretionaryPast.plus(conv.convertedAmount);
      }
    }

    const dailyDiscretionaryRate = totalDiscretionaryPast.dividedBy(60);

    // 4. Build daily projection timeline
    const now = new Date();
    let currentSimulatedBalance = openingBalance;
    let totalInflows = new Decimal(0);
    let totalOutflows = new Decimal(0);
    const dailyTimeline: ForecastDayPoint[] = [];

    let recurringOutflowEventsCount = 0;
    let recurringInflowEventsCount = 0;

    for (let day = 1; day <= horizonDays; day++) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + day);
      const dateStr = targetDate.toISOString().split("T")[0];

      let dayInflows = new Decimal(0);
      let dayOutflows = new Decimal(dailyDiscretionaryRate); // baseline variable spending
      const events: string[] = [];

      // Check recurring items due on this day
      for (const rec of recurringCandidates) {
        let isDue = false;
        if (rec.nextExpectedDate) {
          const expectedStr = rec.nextExpectedDate.toISOString().split("T")[0];
          if (expectedStr === dateStr) {
            isDue = true;
          }
        } else if (rec.frequency === RecurringFrequency.MONTHLY) {
          // If monthly, check if day of month matches last observed
          if (targetDate.getDate() === rec.lastObservedDate.getDate()) {
            isDue = true;
          }
        }

        if (isDue) {
          const recAmount = new Decimal(rec.expectedAmount);
          const convertedRec = await CurrencyService.convert(
            recAmount,
            rec.currency,
            currency,
            targetDate
          );

          dayOutflows = dayOutflows.plus(convertedRec.convertedAmount);
          events.push(`Scheduled bill: ${rec.merchant} (${new Money(convertedRec.convertedAmount, currency).format()})`);
          recurringOutflowEventsCount++;
        }
      }

      currentSimulatedBalance = currentSimulatedBalance.plus(dayInflows).minus(dayOutflows);
      totalInflows = totalInflows.plus(dayInflows);
      totalOutflows = totalOutflows.plus(dayOutflows);

      dailyTimeline.push({
        date: dateStr,
        projectedBalance: Math.round(currentSimulatedBalance.toNumber() * 100) / 100,
        expectedInflows: Math.round(dayInflows.toNumber() * 100) / 100,
        expectedOutflows: Math.round(dayOutflows.toNumber() * 100) / 100,
        events,
      });
    }

    return {
      horizonDays,
      reportingCurrency: currency,
      openingBalance: new Money(openingBalance, currency).toFixed(),
      openingBalanceSource: openingSource,
      totalExpectedInflows: new Money(totalInflows, currency).toFixed(),
      totalExpectedOutflows: new Money(totalOutflows, currency).toFixed(),
      projectedClosingBalance: new Money(currentSimulatedBalance, currency).toFixed(),
      dailyTimeline,
      assumptions: {
        recurringOutflowsCount: recurringOutflowEventsCount,
        recurringInflowsCount: recurringInflowEventsCount,
        dailyRunRateEstimated: new Money(dailyDiscretionaryRate, currency).toFixed(),
        untrackedAccountsDisclosed: accounts.length === 0,
      },
      uncertaintyDisclaimer:
        "Projections are deterministic mathematical estimates derived from recorded historical transactions and confirmed recurring payments. They do not constitute guaranteed bank balances or financial advice.",
    };
  }
}

