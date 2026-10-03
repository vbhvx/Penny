import prisma from "@/lib/db/prisma";
import { AnalyticsService } from "@/modules/analytics/service";
import { BudgetService } from "@/modules/budgets/service";
import { RecurringService } from "@/modules/recurring/service";
import { ForecastingService } from "@/modules/forecasting/service";

export interface AssistantMessageResponse {
  answer: string;
  toolsUsed: string[];
  supportingData?: Record<string, unknown>;
  reportingCurrency: string;
}

export class AssistantService {
  /**
   * Process a user query through controlled deterministic tools and optional Gemini model
   */
  public static async ask(userId: string, query: string): Promise<AssistantMessageResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { defaultCurrency: true },
    });

    const currency = user?.defaultCurrency || "USD";
    const toolsUsed: string[] = [];
    let answer = "";
    let supportingData: Record<string, unknown> | undefined;

    const lowerQuery = query.toLowerCase().trim();

    // Check Gemini API key availability
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey && apiKey.trim().length > 10) {
      try {
        const result = await this.callGeminiWithTools(userId, query, apiKey, currency);
        await this.logInteraction(userId, query, result.answer, result.toolsUsed, "GEMINI_1_5_FLASH");
        return result;
      } catch (err) {
        console.warn("Gemini API call failed, falling back to deterministic assistant:", err);
      }
    }

    // Deterministic Intent-matching & Tool Dispatcher
    if (
      lowerQuery.includes("budget") ||
      lowerQuery.includes("limit") ||
      lowerQuery.includes("on track")
    ) {
      toolsUsed.push("getBudgetStatuses");
      const budgets = await BudgetService.getBudgetStatuses(userId);
      supportingData = { budgets };

      if (budgets.length === 0) {
        answer = `You haven't set up any budgets yet. You can create a budget for categories like Groceries or Dining Out in the Budgets tab.`;
      } else {
        const overspent = budgets.filter((b) => b.isOverspent);
        const nearLimit = budgets.filter((b) => b.isNearLimit);

        if (overspent.length > 0) {
          const list = overspent
            .map((b) => `• **${b.categoryName}**: Spent ${b.currency} ${b.spentAmount} of ${b.currency} ${b.limitAmount} (${b.percentageUsed}%)`)
            .join("\n");
          answer = `⚠️ You have exceeded **${overspent.length}** budget(s):\n\n${list}\n\nReview your upcoming expenses in these categories to prevent further overspending.`;
        } else if (nearLimit.length > 0) {
          const list = nearLimit
            .map((b) => `• **${b.categoryName}**: ${b.percentageUsed}% used (${b.currency} ${b.remainingAmount} remaining)`)
            .join("\n");
          answer = `Notice: You are approaching the limit on **${nearLimit.length}** budget(s):\n\n${list}\n\nAll other budgets remain comfortably on track.`;
        } else {
          answer = `Good news! All **${budgets.length}** of your active budgets are currently on track within their limits.`;
        }
      }
    } else if (
      lowerQuery.includes("recurring") ||
      lowerQuery.includes("subscription") ||
      lowerQuery.includes("bill")
    ) {
      toolsUsed.push("getRecurringPayments");
      const candidates = await prisma.recurringPaymentCandidate.findMany({
        where: { userId },
        orderBy: { expectedAmount: "desc" },
      });
      supportingData = { recurringCount: candidates.length, candidates };

      if (candidates.length === 0) {
        answer = `No recurring subscriptions or bills have been detected yet. As you import more statements, Penny automatically detects weekly, monthly, and annual payment patterns.`;
      } else {
        const detected = candidates.filter((c) => c.reviewStatus === "DETECTED");
        const confirmed = candidates.filter((c) => c.reviewStatus === "CONFIRMED");

        const list = candidates
          .slice(0, 5)
          .map((c) => `• **${c.merchant}**: ~${c.currency} ${Number(c.expectedAmount).toFixed(2)} (${c.frequency.toLowerCase()}, status: ${c.reviewStatus.toLowerCase()})`)
          .join("\n");

        answer = `Here is a summary of your recurring payments:\n\n${list}\n\nYou have **${confirmed.length}** confirmed subscription(s) and **${detected.length}** candidate(s) awaiting review in the Recurring bills tab.`;
      }
    } else if (
      lowerQuery.includes("forecast") ||
      lowerQuery.includes("cash flow") ||
      lowerQuery.includes("project") ||
      lowerQuery.includes("next month")
    ) {
      toolsUsed.push("getCashFlowForecast");
      const forecast = await ForecastingService.generateForecast(userId, 30);
      supportingData = { forecast };

      answer = `Based on your recorded ledger and confirmed recurring payments, here is your **30-day cash-flow forecast**:\n\n` +
        `• **Opening Balance**: ${forecast.reportingCurrency} ${forecast.openingBalance} (${forecast.openingBalanceSource === "OBSERVED_BALANCE" ? "verified account observation" : "calculated from ledger"})\n` +
        `• **Expected Inflows**: +${forecast.reportingCurrency} ${forecast.totalExpectedInflows}\n` +
        `• **Expected Outflows**: -${forecast.reportingCurrency} ${forecast.totalExpectedOutflows}\n` +
        `• **Projected Closing Balance**: **${forecast.reportingCurrency} ${forecast.projectedClosingBalance}**\n\n` +
        `*Note: ${forecast.uncertaintyDisclaimer}*`;
    } else if (
      lowerQuery.includes("restaurant") ||
      lowerQuery.includes("food") ||
      lowerQuery.includes("grocer") ||
      lowerQuery.includes("category") ||
      lowerQuery.includes("breakdown")
    ) {
      toolsUsed.push("getCategoryBreakdown");
      const categories = await AnalyticsService.getCategoryBreakdown(userId);
      supportingData = { categories };

      if (categories.length === 0) {
        answer = `No categorized expenses found in the current period.`;
      } else {
        const top5 = categories.slice(0, 5);
        const list = top5
          .map((c) => `• **${c.categoryName}**: ${currency} ${c.amount} (${c.percentage}%)`)
          .join("\n");

        answer = `Here is your spending breakdown by category for the current period:\n\n${list}\n\nYour highest spending category is **${top5[0].categoryName}** at ${currency} ${top5[0].amount}.`;
      }
    } else if (
      lowerQuery.includes("largest") ||
      lowerQuery.includes("top") ||
      lowerQuery.includes("merchant") ||
      lowerQuery.includes("biggest expense")
    ) {
      toolsUsed.push("getMerchantBreakdown");
      const merchants = await AnalyticsService.getMerchantBreakdown(userId, {}, 5);
      supportingData = { merchants };

      if (merchants.length === 0) {
        answer = `No expense transactions recorded yet.`;
      } else {
        const list = merchants
          .map((m, i) => `${i + 1}. **${m.merchant}**: ${currency} ${m.amount} (${m.transactionCount} transactions, avg ${currency} ${m.averageAmount})`)
          .join("\n");
        answer = `Here are your largest spending merchants:\n\n${list}`;
      }
    } else {
      // Default: Comprehensive Financial Summary
      toolsUsed.push("getTransactionSummary");
      const summary = await AnalyticsService.getSummary(userId);
      supportingData = { summary };

      answer = `Here is your current financial summary for ${summary.dateRange.start} to ${summary.dateRange.end} in **${summary.reportingCurrency}**:\n\n` +
        `• **Recorded Income**: +${summary.reportingCurrency} ${summary.totalIncome}\n` +
        `• **Recorded Expenses**: -${summary.reportingCurrency} ${summary.totalExpenses}\n` +
        `• **Net Cash Flow**: **${summary.reportingCurrency} ${summary.netCashFlow}**\n` +
        (summary.pendingTransactions.count > 0
          ? `• **Pending Transactions**: ${summary.pendingTransactions.count} transaction(s) totaling ${summary.reportingCurrency} ${summary.pendingTransactions.totalAmount} (shown separately)\n`
          : "") +
        (summary.transfersExcluded.count > 0
          ? `• **Internal Transfers**: ${summary.transfersExcluded.count} internal transfer(s) excluded from consumer spending\n`
          : "") +
        `\nYou have **${summary.dataFreshness.transactionCount}** recorded transactions across **${summary.dataFreshness.accountCount}** account(s). You can ask me specific questions about your budgets, categories, recurring payments, or cash-flow forecast!`;
    }

    await this.logInteraction(userId, query, answer, toolsUsed, "DETERMINISTIC_ENGINE");

    return {
      answer,
      toolsUsed,
      supportingData,
      reportingCurrency: currency,
    };
  }

  private static async callGeminiWithTools(
    userId: string,
    query: string,
    apiKey: string,
    reportingCurrency: string
  ): Promise<AssistantMessageResponse> {
    // 1. Gather deterministic application state
    const summary = await AnalyticsService.getSummary(userId);
    const categories = await AnalyticsService.getCategoryBreakdown(userId);
    const budgets = await BudgetService.getBudgetStatuses(userId);
    const recurring = await prisma.recurringPaymentCandidate.findMany({ where: { userId }, take: 10 });

    const systemPrompt = `You are Penny, an intelligent personal finance assistant grounded strictly in verified financial calculations.
Rules:
1. Ground all answers in the application data provided below.
2. Never invent transactions, bank balances, or future events.
3. State amounts with their currency (${reportingCurrency}).
4. Never conflate transfers with consumer spending.
5. Pending transactions must be cited separately from posted totals.
6. If the data does not contain the answer, explicitly state that.

Application Verified Financial Data:
- Reporting Currency: ${reportingCurrency}
- Summary: Income = ${summary.totalIncome}, Expenses = ${summary.totalExpenses}, Net Cash Flow = ${summary.netCashFlow}
- Pending Transactions: ${summary.pendingTransactions.count} (${summary.pendingTransactions.totalAmount})
- Top Categories: ${JSON.stringify(categories.slice(0, 5))}
- Active Budgets: ${JSON.stringify(budgets)}
- Recurring Subscriptions: ${JSON.stringify(recurring.map((r) => ({ merchant: r.merchant, amount: r.expectedAmount, frequency: r.frequency, status: r.reviewStatus })))}
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemPrompt}\n\nUser Question: ${query}` }],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      throw new Error("No response text from Gemini");
    }

    return {
      answer: candidateText,
      toolsUsed: ["getSummary", "getCategoryBreakdown", "getBudgetStatuses", "getRecurringPayments"],
      reportingCurrency,
    };
  }

  private static async logInteraction(
    userId: string,
    userPrompt: string,
    assistantResponse: string,
    toolsCalled: string[],
    modelProvider: string
  ) {
    try {
      await prisma.assistantInteraction.create({
        data: {
          userId,
          userPrompt,
          assistantResponse,
          toolsCalled: toolsCalled as any,
          modelProvider,
        },
      });
    } catch {
      // Do not block query on logging error
    }
  }
}
