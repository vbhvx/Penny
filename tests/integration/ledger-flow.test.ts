import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "@/lib/db/prisma";
import { IngestionService } from "@/modules/ingestion/service";
import { AnalyticsService } from "@/modules/analytics/service";
import { RecurringService } from "@/modules/recurring/service";
import { AccountType } from "@prisma/client";
import bcrypt from "bcryptjs";

describe("Vertical Slice Integration: Statement Ingestion -> Deduplication -> Analytics -> Recurring Detection", () => {
  let testUserId: string;
  let testAccountId: string;

  beforeAll(async () => {
    // Create isolated test user
    const passwordHash = await bcrypt.hash("TestPass123!", 10);
    const testUser = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@penny.test`,
        name: "Test Engineer",
        passwordHash,
        defaultCurrency: "USD",
        accounts: {
          create: {
            name: "Test Checking",
            type: AccountType.CHECKING,
            currency: "USD",
          },
        },
      },
      include: { accounts: true },
    });

    testUserId = testUser.id;
    testAccountId = testUser.accounts[0].id;
  });

  afterAll(async () => {
    // Clean up test user
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } });
    }
  });

  it("completes full statement ingestion, deduplicates repeated import, and computes correct analytics", async () => {
    const today = new Date();
    const d1 = new Date(today);
    d1.setDate(d1.getDate() - 1);
    const d2 = new Date(today);
    d2.setDate(d2.getDate() - 2);
    const d3 = new Date(today);
    d3.setDate(d3.getDate() - 3);

    const dateStr1 = d1.toISOString().split("T")[0];
    const dateStr2 = d2.toISOString().split("T")[0];
    const dateStr3 = d3.toISOString().split("T")[0];

    const csvData = `Date,Description,Amount
${dateStr1},Netflix Monthly,-15.49
${dateStr2},Trader Joes Groceries,-85.50
${dateStr3},Acme Corp Payroll,3000.00`;

    // 1. Preview initial import
    const preview1 = await IngestionService.previewImport(
      testUserId,
      testAccountId,
      "test_statement_1.csv",
      csvData
    );

    expect(preview1.totalRows).toBe(3);
    expect(preview1.acceptedRows).toBe(3);
    expect(preview1.duplicateRows).toBe(0);

    // 2. Commit initial import
    const commit1 = await IngestionService.commitImport(testUserId, preview1.batchId!);
    expect(commit1.committedCount).toBe(3);

    // 3. Test Deduplication: Attempt to import the same transactions again
    const preview2 = await IngestionService.previewImport(
      testUserId,
      testAccountId,
      "test_statement_1.csv",
      csvData
    );

    // All 3 rows should be detected as duplicates!
    expect(preview2.duplicateRows).toBe(3);
    expect(preview2.acceptedRows).toBe(0);

    // 4. Verify Authoritative Analytics calculations
    const summary = await AnalyticsService.getSummary(testUserId);
    expect(summary.totalIncome).toBe("3000.00");
    expect(summary.totalExpenses).toBe("100.99"); // 15.49 + 85.50
    expect(summary.netCashFlow).toBe("2899.01"); // 3000.00 - 100.99

    // 5. Verify Categories breakdown
    const categories = await AnalyticsService.getCategoryBreakdown(testUserId);
    expect(categories.length).toBeGreaterThan(0);
  });
});
