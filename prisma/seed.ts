import { PrismaClient, AccountType, AccountSourceType, TransactionType, TransactionStatus, CategorizationSource, BudgetPeriod, RecurringFrequency, RecurringStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import Decimal from "decimal.js";
import { SYSTEM_CATEGORIES } from "../src/modules/categorization/categories";
import { CurrencyService } from "../src/modules/currencies/service";
import { generateContentHash } from "../src/modules/ingestion/deduplication";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // 1. Ensure baseline exchange rates
  await CurrencyService.ensureBaselineRates();
  console.log("✅ Exchange rates initialized");

  // 2. Ensure system categories
  const categoryMap = new Map<string, string>();
  for (const cat of SYSTEM_CATEGORIES) {
    const record = await prisma.transactionCategory.upsert({
      where: { userId_slug: { userId: "", slug: cat.slug } }, // will match system null or create
      update: {},
      create: {
        name: cat.name,
        slug: cat.slug,
        type: cat.type,
        icon: cat.icon,
        color: cat.color,
        isSystem: true,
        userId: null,
      },
    });
    categoryMap.set(cat.slug, record.id);
  }
  console.log("✅ System categories initialized");

  // 3. Create or Reset Demo User
  const demoEmail = "demo@penny.finance";
  let demoUser = await prisma.user.findUnique({
    where: { email: demoEmail },
  });

  const passwordHash = await bcrypt.hash("DemoUser123!", 10);

  if (demoUser) {
    // Clean up old demo user data
    await prisma.user.delete({ where: { id: demoUser.id } });
  }

  demoUser = await prisma.user.create({
    data: {
      email: demoEmail,
      name: "Alex Morgan",
      passwordHash,
      defaultCurrency: "USD",
      locale: "en-US",
      timezone: "America/New_York",
      isDemo: true,
    },
  });

  console.log(`✅ Demo user created: ${demoUser.email}`);

  // 4. Create Demo Financial Accounts
  const checking = await prisma.financialAccount.create({
    data: {
      userId: demoUser.id,
      name: "Premier Checking",
      type: AccountType.CHECKING,
      currency: "USD",
      institutionName: "Chase",
      accountNumberMask: "•••• 4821",
      sourceType: AccountSourceType.IMPORTED,
    },
  });

  const savings = await prisma.financialAccount.create({
    data: {
      userId: demoUser.id,
      name: "High-Yield Savings",
      type: AccountType.SAVINGS,
      currency: "USD",
      institutionName: "Marcus by Goldman Sachs",
      accountNumberMask: "•••• 9104",
      sourceType: AccountSourceType.MANUAL,
    },
  });

  const creditCard = await prisma.financialAccount.create({
    data: {
      userId: demoUser.id,
      name: "Sapphire Preferred Card",
      type: AccountType.CREDIT_CARD,
      currency: "USD",
      institutionName: "Chase",
      accountNumberMask: "•••• 6239",
      sourceType: AccountSourceType.IMPORTED,
    },
  });

  // Balance observations
  const today = new Date();
  await prisma.accountBalanceObservation.createMany({
    data: [
      {
        accountId: checking.id,
        observedBalance: new Decimal("4850.25"),
        currency: "USD",
        observationDate: today,
        source: "STATEMENT_IMPORT",
      },
      {
        accountId: savings.id,
        observedBalance: new Decimal("18250.00"),
        currency: "USD",
        observationDate: today,
        source: "MANUAL_ENTRY",
      },
      {
        accountId: creditCard.id,
        observedBalance: new Decimal("-1140.80"),
        currency: "USD",
        observationDate: today,
        source: "STATEMENT_IMPORT",
      },
    ],
  });

  console.log("✅ Financial accounts and balance observations created");

  // 5. Seed Realistic Multi-Month Transactions
  const makeDate = (daysAgo: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return d;
  };

  const demoTxData = [
    // Income
    { daysAgo: 2, desc: "Acme Corp Payroll Direct Deposit", merchant: "Acme Corp", amount: "3250.00", type: TransactionType.INCOME, cat: "income", acc: checking.id },
    { daysAgo: 16, desc: "Acme Corp Payroll Direct Deposit", merchant: "Acme Corp", amount: "3250.00", type: TransactionType.INCOME, cat: "income", acc: checking.id },
    { daysAgo: 30, desc: "Acme Corp Payroll Direct Deposit", merchant: "Acme Corp", amount: "3250.00", type: TransactionType.INCOME, cat: "income", acc: checking.id },
    { daysAgo: 44, desc: "Acme Corp Payroll Direct Deposit", merchant: "Acme Corp", amount: "3250.00", type: TransactionType.INCOME, cat: "income", acc: checking.id },

    // Housing (Rent)
    { daysAgo: 9, desc: "Avalon Bay Communities Rent Payment", merchant: "Avalon Bay", amount: "-1850.00", type: TransactionType.PURCHASE, cat: "housing", acc: checking.id },
    { daysAgo: 39, desc: "Avalon Bay Communities Rent Payment", merchant: "Avalon Bay", amount: "-1850.00", type: TransactionType.PURCHASE, cat: "housing", acc: checking.id },
    { daysAgo: 69, desc: "Avalon Bay Communities Rent Payment", merchant: "Avalon Bay", amount: "-1850.00", type: TransactionType.PURCHASE, cat: "housing", acc: checking.id },

    // Subscriptions
    { daysAgo: 4, desc: "Netflix.com Monthly Subscription", merchant: "Netflix", amount: "-15.49", type: TransactionType.PURCHASE, cat: "subscriptions", acc: creditCard.id },
    { daysAgo: 34, desc: "Netflix.com Monthly Subscription", merchant: "Netflix", amount: "-15.49", type: TransactionType.PURCHASE, cat: "subscriptions", acc: creditCard.id },
    { daysAgo: 64, desc: "Netflix.com Monthly Subscription", merchant: "Netflix", amount: "-15.49", type: TransactionType.PURCHASE, cat: "subscriptions", acc: creditCard.id },

    { daysAgo: 8, desc: "Spotify USA Monthly Premium", merchant: "Spotify", amount: "-10.99", type: TransactionType.PURCHASE, cat: "subscriptions", acc: creditCard.id },
    { daysAgo: 38, desc: "Spotify USA Monthly Premium", merchant: "Spotify", amount: "-10.99", type: TransactionType.PURCHASE, cat: "subscriptions", acc: creditCard.id },

    { daysAgo: 11, desc: "GitHub Inc Copilot Subscription", merchant: "GitHub", amount: "-10.00", type: TransactionType.PURCHASE, cat: "subscriptions", acc: creditCard.id },
    { daysAgo: 41, desc: "GitHub Inc Copilot Subscription", merchant: "GitHub", amount: "-10.00", type: TransactionType.PURCHASE, cat: "subscriptions", acc: creditCard.id },

    // Utilities
    { daysAgo: 12, desc: "Consolidated Edison Electric & Gas", merchant: "ConEd", amount: "-124.60", type: TransactionType.PURCHASE, cat: "utilities", acc: checking.id },
    { daysAgo: 42, desc: "Consolidated Edison Electric & Gas", merchant: "ConEd", amount: "-118.40", type: TransactionType.PURCHASE, cat: "utilities", acc: checking.id },
    { daysAgo: 15, desc: "Verizon Wireless AutoPay", merchant: "Verizon", amount: "-85.00", type: TransactionType.PURCHASE, cat: "utilities", acc: creditCard.id },
    { daysAgo: 45, desc: "Verizon Wireless AutoPay", merchant: "Verizon", amount: "-85.00", type: TransactionType.PURCHASE, cat: "utilities", acc: creditCard.id },

    // Groceries
    { daysAgo: 1, desc: "Whole Foods Market #10245", merchant: "Whole Foods", amount: "-112.40", type: TransactionType.PURCHASE, cat: "groceries", acc: creditCard.id },
    { daysAgo: 6, desc: "Trader Joe's #542 Brooklyn", merchant: "Trader Joe's", amount: "-78.35", type: TransactionType.PURCHASE, cat: "groceries", acc: creditCard.id },
    { daysAgo: 14, desc: "Whole Foods Market #10245", merchant: "Whole Foods", amount: "-94.15", type: TransactionType.PURCHASE, cat: "groceries", acc: creditCard.id },
    { daysAgo: 21, desc: "Costco Wholesale Member", merchant: "Costco", amount: "-184.20", type: TransactionType.PURCHASE, cat: "groceries", acc: creditCard.id },
    { daysAgo: 28, desc: "Trader Joe's #542 Brooklyn", merchant: "Trader Joe's", amount: "-82.10", type: TransactionType.PURCHASE, cat: "groceries", acc: creditCard.id },

    // Restaurants & Dining
    { daysAgo: 3, desc: "Chipotle Mexican Grill #2810", merchant: "Chipotle", amount: "-14.85", type: TransactionType.PURCHASE, cat: "restaurants-dining", acc: creditCard.id },
    { daysAgo: 5, desc: "Sweetgreen Nomad", merchant: "Sweetgreen", amount: "-17.40", type: TransactionType.PURCHASE, cat: "restaurants-dining", acc: creditCard.id },
    { daysAgo: 7, desc: "Starbucks Coffee #08491", merchant: "Starbucks", amount: "-6.25", type: TransactionType.PURCHASE, cat: "restaurants-dining", acc: creditCard.id },
    { daysAgo: 10, desc: "L'Artusi Restaurant NYC", merchant: "L'Artusi", amount: "-145.00", type: TransactionType.PURCHASE, cat: "restaurants-dining", acc: creditCard.id },
    { daysAgo: 18, desc: "Blue Bottle Coffee", merchant: "Blue Bottle", amount: "-7.50", type: TransactionType.PURCHASE, cat: "restaurants-dining", acc: creditCard.id },

    // Transport
    { daysAgo: 4, desc: "Uber Technologies Trip", merchant: "Uber", amount: "-26.40", type: TransactionType.PURCHASE, cat: "transport", acc: creditCard.id },
    { daysAgo: 13, desc: "Shell Service Station 4821", merchant: "Shell", amount: "-48.50", type: TransactionType.PURCHASE, cat: "transport", acc: creditCard.id },
    { daysAgo: 22, desc: "MTA Subway MetroCard Vending", merchant: "MTA Subway", amount: "-34.00", type: TransactionType.PURCHASE, cat: "transport", acc: creditCard.id },

    // Shopping
    { daysAgo: 8, desc: "Amazon.com Retail Order #114-8921", merchant: "Amazon", amount: "-64.99", type: TransactionType.PURCHASE, cat: "shopping", acc: creditCard.id },
    { daysAgo: 25, desc: "Apple Store Fifth Avenue", merchant: "Apple Store", amount: "-199.00", type: TransactionType.PURCHASE, cat: "shopping", acc: creditCard.id },

    // Refund
    { daysAgo: 7, desc: "Amazon.com Return Credit Refund", merchant: "Amazon", amount: "64.99", type: TransactionType.REFUND, cat: "refunds", acc: creditCard.id },

    // Multi-currency travel expense (GBP)
    { daysAgo: 20, desc: "Monzo London Cafe Pret A Manger", merchant: "Pret A Manger", amount: "-12.50", type: TransactionType.PURCHASE, cat: "restaurants-dining", acc: checking.id, currency: "GBP" },

    // Pending transaction
    { daysAgo: 0, desc: "Joe's Coffee Corner", merchant: "Joe's Coffee", amount: "-5.85", type: TransactionType.PURCHASE, cat: "restaurants-dining", acc: creditCard.id, status: TransactionStatus.PENDING },
  ];

  for (const item of demoTxData) {
    const txDate = makeDate(item.daysAgo);
    const amountDec = new Decimal(item.amount);
    const curr = item.currency || "USD";
    const status = item.status || TransactionStatus.POSTED;
    const catId = categoryMap.get(item.cat);

    const hash = generateContentHash(item.acc, txDate, amountDec.toFixed(4), item.desc);

    await prisma.transaction.create({
      data: {
        userId: demoUser.id,
        accountId: item.acc,
        sourceType: AccountSourceType.IMPORTED,
        contentHash: hash,
        transactionDate: txDate,
        originalDescription: item.desc,
        normalizedMerchant: item.merchant,
        amount: amountDec,
        currency: curr,
        transactionType: item.type,
        status,
        categoryId: catId,
        categorizationSource: CategorizationSource.RULE,
        needsReview: false,
        isDemo: true,
      },
    });
  }

  // 6. Create Paired Internal Transfer
  const transferGroup = await prisma.transferGroup.create({
    data: {
      userId: demoUser.id,
      description: "Monthly Savings Allocation",
    },
  });

  const transferDate = makeDate(15);
  await prisma.transaction.create({
    data: {
      userId: demoUser.id,
      accountId: checking.id,
      sourceType: AccountSourceType.MANUAL,
      transactionDate: transferDate,
      originalDescription: "Transfer Out to High-Yield Savings",
      normalizedMerchant: "Internal Transfer",
      amount: new Decimal("-500.00"),
      currency: "USD",
      transactionType: TransactionType.TRANSFER,
      status: TransactionStatus.POSTED,
      categoryId: categoryMap.get("transfers"),
      categorizationSource: CategorizationSource.RULE,
      transferGroupId: transferGroup.id,
      isDemo: true,
    },
  });

  await prisma.transaction.create({
    data: {
      userId: demoUser.id,
      accountId: savings.id,
      sourceType: AccountSourceType.MANUAL,
      transactionDate: transferDate,
      originalDescription: "Transfer In from Premier Checking",
      normalizedMerchant: "Internal Transfer",
      amount: new Decimal("500.00"),
      currency: "USD",
      transactionType: TransactionType.TRANSFER,
      status: TransactionStatus.POSTED,
      categoryId: categoryMap.get("transfers"),
      categorizationSource: CategorizationSource.RULE,
      transferGroupId: transferGroup.id,
      isDemo: true,
    },
  });

  console.log("✅ Demo transactions and internal transfers seeded");

  // 7. Seed Active Budgets
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  await prisma.budget.createMany({
    data: [
      {
        userId: demoUser.id,
        categoryId: categoryMap.get("groceries"),
        name: "Monthly Groceries",
        period: BudgetPeriod.MONTHLY,
        limitAmount: new Decimal("450.00"),
        currency: "USD",
        alertThreshold: new Decimal("0.80"),
        startDate: monthStart,
        endDate: monthEnd,
        isActive: true,
      },
      {
        userId: demoUser.id,
        categoryId: categoryMap.get("restaurants-dining"),
        name: "Dining Out & Cafes",
        period: BudgetPeriod.MONTHLY,
        limitAmount: new Decimal("250.00"),
        currency: "USD",
        alertThreshold: new Decimal("0.80"),
        startDate: monthStart,
        endDate: monthEnd,
        isActive: true,
      },
      {
        userId: demoUser.id,
        categoryId: null, // Overall budget
        name: "Overall Monthly Discretionary",
        period: BudgetPeriod.MONTHLY,
        limitAmount: new Decimal("3500.00"),
        currency: "USD",
        alertThreshold: new Decimal("0.85"),
        startDate: monthStart,
        endDate: monthEnd,
        isActive: true,
      },
    ],
  });

  console.log("✅ Demo budgets seeded");

  // 8. Seed Detected and Confirmed Recurring Payments
  await prisma.recurringPaymentCandidate.createMany({
    data: [
      {
        userId: demoUser.id,
        merchant: "Netflix",
        expectedAmount: new Decimal("15.49"),
        currency: "USD",
        frequency: RecurringFrequency.MONTHLY,
        confidenceScore: new Decimal("0.95"),
        confidenceExplanation: "Observed 3 consecutive monthly charges of $15.49 on the 4th of each month.",
        detectionEvidence: { intervals: [30, 30], count: 3 },
        reviewStatus: RecurringStatus.CONFIRMED,
        firstObservedDate: makeDate(64),
        lastObservedDate: makeDate(4),
        nextExpectedDate: makeDate(-26),
      },
      {
        userId: demoUser.id,
        merchant: "Spotify",
        expectedAmount: new Decimal("10.99"),
        currency: "USD",
        frequency: RecurringFrequency.MONTHLY,
        confidenceScore: new Decimal("0.92"),
        confidenceExplanation: "Observed 2 monthly charges of $10.99 on the 8th of each month.",
        detectionEvidence: { intervals: [30], count: 2 },
        reviewStatus: RecurringStatus.CONFIRMED,
        firstObservedDate: makeDate(38),
        lastObservedDate: makeDate(8),
        nextExpectedDate: makeDate(-22),
      },
      {
        userId: demoUser.id,
        merchant: "Avalon Bay",
        expectedAmount: new Decimal("1850.00"),
        currency: "USD",
        frequency: RecurringFrequency.MONTHLY,
        confidenceScore: new Decimal("0.98"),
        confidenceExplanation: "Consistent monthly housing rent payment of $1,850.00.",
        detectionEvidence: { intervals: [30, 30], count: 3 },
        reviewStatus: RecurringStatus.CONFIRMED,
        firstObservedDate: makeDate(69),
        lastObservedDate: makeDate(9),
        nextExpectedDate: makeDate(-21),
      },
      {
        userId: demoUser.id,
        merchant: "ConEd",
        expectedAmount: new Decimal("121.50"),
        currency: "USD",
        frequency: RecurringFrequency.MONTHLY,
        confidenceScore: new Decimal("0.82"),
        confidenceExplanation: "Monthly utility charge with slight seasonal variation ($118.40 to $124.60).",
        detectionEvidence: { intervals: [30], count: 2 },
        reviewStatus: RecurringStatus.DETECTED,
        firstObservedDate: makeDate(42),
        lastObservedDate: makeDate(12),
        nextExpectedDate: makeDate(-18),
      },
      {
        userId: demoUser.id,
        merchant: "GitHub",
        expectedAmount: new Decimal("10.00"),
        currency: "USD",
        frequency: RecurringFrequency.MONTHLY,
        confidenceScore: new Decimal("0.90"),
        confidenceExplanation: "Observed 2 charges of $10.00 for software developer tools.",
        detectionEvidence: { intervals: [30], count: 2 },
        reviewStatus: RecurringStatus.DETECTED,
        firstObservedDate: makeDate(41),
        lastObservedDate: makeDate(11),
        nextExpectedDate: makeDate(-19),
      },
    ],
  });

  console.log("✅ Demo recurring payments seeded");
  console.log("✨ Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

