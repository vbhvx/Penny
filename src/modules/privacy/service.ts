import prisma from "@/lib/db/prisma";
import Papa from "papaparse";

export class PrivacyService {
  /**
   * Defend against CSV/Spreadsheet Formula Injection (CSV Injection / CWE-1236)
   * Formula characters: =, +, -, @, \t, \r
   */
  public static sanitizeCsvValue(val: unknown): string {
    if (val === null || val === undefined) return "";
    const str = String(val);

    // If string starts with a formula trigger character (including tabs, carriage returns)
    if (/^[\t\r=+\-@]/.test(str)) {
      return `'${str}`;
    }

    const trimmed = str.trim();
    if (/^[=+\-@]/.test(trimmed)) {
      return `'${trimmed}`;
    }

    return trimmed;
  }

  /**
   * Export all user financial data in secure CSV format
   */
  public static async exportTransactionsCsv(userId: string): Promise<string> {
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      include: {
        account: true,
        category: true,
      },
      orderBy: { transactionDate: "desc" },
    });

    const rows = transactions.map((t) => ({
      ID: this.sanitizeCsvValue(t.id),
      Date: t.transactionDate.toISOString().split("T")[0],
      Account: this.sanitizeCsvValue(t.account.name),
      AccountType: t.account.type,
      Description: this.sanitizeCsvValue(t.originalDescription),
      Merchant: this.sanitizeCsvValue(t.normalizedMerchant || ""),
      Amount: t.amount.toString(),
      Currency: t.currency,
      TransactionType: t.transactionType,
      Category: this.sanitizeCsvValue(t.category?.name || "Uncategorized"),
      Status: t.status,
      Source: t.sourceType,
      Notes: this.sanitizeCsvValue(t.notes || ""),
    }));

    return Papa.unparse(rows);
  }

  /**
   * Export entire workspace data package in structured JSON format
   */
  public static async exportFullJson(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        defaultCurrency: true,
        locale: true,
        timezone: true,
        createdAt: true,
      },
    });

    const accounts = await prisma.financialAccount.findMany({
      where: { userId },
      include: { balanceObservations: true },
    });

    const transactions = await prisma.transaction.findMany({
      where: { userId },
      include: { category: true },
    });

    const budgets = await prisma.budget.findMany({
      where: { userId },
      include: { category: true },
    });

    const recurring = await prisma.recurringPaymentCandidate.findMany({
      where: { userId },
    });

    return {
      exportedAt: new Date().toISOString(),
      exportVersion: "1.0",
      user,
      accounts,
      transactions,
      budgets,
      recurringPayments: recurring,
    };
  }

  /**
   * Complete deletion request for user workspace (GDPR / Right to erasure)
   */
  public static async deleteUserData(userId: string): Promise<void> {
    // Cascade delete user and all associated financial records
    await prisma.user.delete({
      where: { id: userId },
    });
  }
}
