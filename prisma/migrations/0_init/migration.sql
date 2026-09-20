-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CHECKING', 'SAVINGS', 'CREDIT_CARD', 'CASH', 'INVESTMENT', 'LOAN', 'OTHER');

-- CreateEnum
CREATE TYPE "AccountSourceType" AS ENUM ('MANUAL', 'IMPORTED', 'CONNECTED_PROVIDER');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('EXPENSE', 'INCOME', 'TRANSFER');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'PREVIEWED', 'COMMITTED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "RowValidationStatus" AS ENUM ('VALID', 'INVALID', 'DUPLICATE_CONFIRMED', 'DUPLICATE_PROBABLE', 'SKIPPED');

-- CreateEnum
CREATE TYPE "TransactionSourceType" AS ENUM ('MANUAL', 'IMPORTED', 'PROVIDER', 'SIMULATED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('PURCHASE', 'INCOME', 'FEE', 'TRANSFER', 'REFUND', 'REVERSAL', 'OTHER');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'POSTED', 'REVERSED');

-- CreateEnum
CREATE TYPE "CategorizationSource" AS ENUM ('RULE', 'PROVIDER', 'AI', 'USER', 'DEFAULT');

-- CreateEnum
CREATE TYPE "BudgetPeriod" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "RecurringFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY');

-- CreateEnum
CREATE TYPE "RecurringStatus" AS ENUM ('DETECTED', 'CONFIRMED', 'DISMISSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'USD',
    "locale" TEXT NOT NULL DEFAULT 'en-US',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL DEFAULT 'CHECKING',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "institutionName" TEXT,
    "accountNumberMask" TEXT,
    "sourceType" "AccountSourceType" NOT NULL DEFAULT 'MANUAL',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_balance_observations" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "observedBalance" DECIMAL(18,4) NOT NULL,
    "currency" TEXT NOT NULL,
    "observationDate" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL_ENTRY',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_balance_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_categories" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "CategoryType" NOT NULL DEFAULT 'EXPENSE',
    "icon" TEXT,
    "color" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorization_rules" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "merchantPattern" TEXT NOT NULL,
    "descriptionPattern" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorization_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batches" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'GENERIC_CSV',
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "acceptedRows" INTEGER NOT NULL DEFAULT 0,
    "invalidRows" INTEGER NOT NULL DEFAULT 0,
    "duplicateRows" INTEGER NOT NULL DEFAULT 0,
    "currencySummary" JSONB,
    "dateRangeStart" TIMESTAMP(3),
    "dateRangeEnd" TIMESTAMP(3),
    "errorSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "committedAt" TIMESTAMP(3),

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_row_results" (
    "id" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "rawValues" JSONB NOT NULL,
    "status" "RowValidationStatus" NOT NULL DEFAULT 'VALID',
    "rejectionReason" TEXT,
    "parsedAmount" DECIMAL(18,4),
    "parsedDate" TIMESTAMP(3),
    "parsedDescription" TEXT,
    "parsedCurrency" TEXT,
    "duplicateOfTransactionId" TEXT,

    CONSTRAINT "import_row_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "importBatchId" TEXT,
    "sourceType" "TransactionSourceType" NOT NULL DEFAULT 'MANUAL',
    "externalId" TEXT,
    "contentHash" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "postedAt" TIMESTAMP(3),
    "originalDescription" TEXT NOT NULL,
    "normalizedMerchant" TEXT,
    "amount" DECIMAL(18,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "transactionType" "TransactionType" NOT NULL DEFAULT 'PURCHASE',
    "status" "TransactionStatus" NOT NULL DEFAULT 'POSTED',
    "categoryId" TEXT,
    "categorizationSource" "CategorizationSource" NOT NULL DEFAULT 'DEFAULT',
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "transferGroupId" TEXT,
    "relatedTransactionId" TEXT,
    "notes" TEXT,
    "tags" JSONB,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_groups" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transfer_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_audit_events" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previousState" JSONB,
    "newState" JSONB,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT,
    "name" TEXT NOT NULL,
    "period" "BudgetPeriod" NOT NULL DEFAULT 'MONTHLY',
    "limitAmount" DECIMAL(18,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "alertThreshold" DECIMAL(5,2) NOT NULL DEFAULT 0.80,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_payment_candidates" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "merchant" TEXT NOT NULL,
    "expectedAmount" DECIMAL(18,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "frequency" "RecurringFrequency" NOT NULL DEFAULT 'MONTHLY',
    "confidenceScore" DECIMAL(3,2) NOT NULL,
    "confidenceExplanation" TEXT NOT NULL,
    "detectionEvidence" JSONB NOT NULL,
    "reviewStatus" "RecurringStatus" NOT NULL DEFAULT 'DETECTED',
    "firstObservedDate" TIMESTAMP(3) NOT NULL,
    "lastObservedDate" TIMESTAMP(3) NOT NULL,
    "nextExpectedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_payment_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_payment_occurrences" (
    "id" TEXT NOT NULL,
    "recurringCandidateId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,

    CONSTRAINT "recurring_payment_occurrences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_rate_observations" (
    "id" TEXT NOT NULL,
    "baseCurrency" TEXT NOT NULL,
    "quoteCurrency" TEXT NOT NULL,
    "rate" DECIMAL(18,6) NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'SYSTEM_FALLBACK',
    "rateType" TEXT NOT NULL DEFAULT 'SPOT',
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_rate_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spending_insights" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "insightType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "plainLanguageExplanation" TEXT NOT NULL,
    "dateRangeStart" TIMESTAMP(3) NOT NULL,
    "dateRangeEnd" TIMESTAMP(3) NOT NULL,
    "reportingCurrency" TEXT NOT NULL DEFAULT 'USD',
    "calculationVersion" TEXT NOT NULL DEFAULT 'v1.0',
    "evidenceData" JSONB NOT NULL,
    "isDismissed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spending_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_flow_forecasts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "horizonDays" INTEGER NOT NULL DEFAULT 30,
    "openingBalance" DECIMAL(18,4) NOT NULL,
    "openingBalanceSource" TEXT NOT NULL DEFAULT 'CALCULATED_LEDGER',
    "expectedInflows" DECIMAL(18,4) NOT NULL,
    "expectedOutflows" DECIMAL(18,4) NOT NULL,
    "projectedClosingBalance" DECIMAL(18,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "assumptions" JSONB NOT NULL,
    "calculationVersion" TEXT NOT NULL DEFAULT 'v1.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_flow_forecasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "budgetAlerts" BOOLEAN NOT NULL DEFAULT true,
    "recurringBillsAlerts" BOOLEAN NOT NULL DEFAULT true,
    "largeExpenseAlerts" BOOLEAN NOT NULL DEFAULT true,
    "largeExpenseThreshold" DECIMAL(18,4) NOT NULL DEFAULT 500,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_interactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userPrompt" TEXT NOT NULL,
    "assistantResponse" TEXT NOT NULL,
    "toolsCalled" JSONB,
    "modelProvider" TEXT NOT NULL DEFAULT 'GEMINI_OR_RULE_BASED',
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistant_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "financial_accounts_userId_idx" ON "financial_accounts"("userId");

-- CreateIndex
CREATE INDEX "account_balance_observations_accountId_observationDate_idx" ON "account_balance_observations"("accountId", "observationDate");

-- CreateIndex
CREATE INDEX "transaction_categories_userId_idx" ON "transaction_categories"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_categories_userId_slug_key" ON "transaction_categories"("userId", "slug");

-- CreateIndex
CREATE INDEX "categorization_rules_userId_idx" ON "categorization_rules"("userId");

-- CreateIndex
CREATE INDEX "import_batches_userId_fileHash_idx" ON "import_batches"("userId", "fileHash");

-- CreateIndex
CREATE INDEX "import_row_results_importBatchId_rowIndex_idx" ON "import_row_results"("importBatchId", "rowIndex");

-- CreateIndex
CREATE INDEX "transactions_userId_transactionDate_idx" ON "transactions"("userId", "transactionDate");

-- CreateIndex
CREATE INDEX "transactions_userId_categoryId_idx" ON "transactions"("userId", "categoryId");

-- CreateIndex
CREATE INDEX "transactions_userId_accountId_idx" ON "transactions"("userId", "accountId");

-- CreateIndex
CREATE INDEX "transactions_userId_contentHash_idx" ON "transactions"("userId", "contentHash");

-- CreateIndex
CREATE INDEX "transactions_accountId_externalId_idx" ON "transactions"("accountId", "externalId");

-- CreateIndex
CREATE INDEX "transfer_groups_userId_idx" ON "transfer_groups"("userId");

-- CreateIndex
CREATE INDEX "transaction_audit_events_transactionId_idx" ON "transaction_audit_events"("transactionId");

-- CreateIndex
CREATE INDEX "transaction_audit_events_userId_idx" ON "transaction_audit_events"("userId");

-- CreateIndex
CREATE INDEX "budgets_userId_isActive_idx" ON "budgets"("userId", "isActive");

-- CreateIndex
CREATE INDEX "recurring_payment_candidates_userId_reviewStatus_idx" ON "recurring_payment_candidates"("userId", "reviewStatus");

-- CreateIndex
CREATE UNIQUE INDEX "recurring_payment_occurrences_recurringCandidateId_transact_key" ON "recurring_payment_occurrences"("recurringCandidateId", "transactionId");

-- CreateIndex
CREATE INDEX "exchange_rate_observations_baseCurrency_quoteCurrency_effec_idx" ON "exchange_rate_observations"("baseCurrency", "quoteCurrency", "effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rate_observations_baseCurrency_quoteCurrency_effec_key" ON "exchange_rate_observations"("baseCurrency", "quoteCurrency", "effectiveDate", "provider");

-- CreateIndex
CREATE INDEX "spending_insights_userId_isDismissed_idx" ON "spending_insights"("userId", "isDismissed");

-- CreateIndex
CREATE INDEX "cash_flow_forecasts_userId_idx" ON "cash_flow_forecasts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_key" ON "notification_preferences"("userId");

-- CreateIndex
CREATE INDEX "assistant_interactions_userId_idx" ON "assistant_interactions"("userId");

-- AddForeignKey
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_balance_observations" ADD CONSTRAINT "account_balance_observations_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "financial_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_categories" ADD CONSTRAINT "transaction_categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorization_rules" ADD CONSTRAINT "categorization_rules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorization_rules" ADD CONSTRAINT "categorization_rules_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "transaction_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_row_results" ADD CONSTRAINT "import_row_results_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "financial_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "transaction_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_transferGroupId_fkey" FOREIGN KEY ("transferGroupId") REFERENCES "transfer_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_audit_events" ADD CONSTRAINT "transaction_audit_events_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_audit_events" ADD CONSTRAINT "transaction_audit_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "transaction_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_payment_candidates" ADD CONSTRAINT "recurring_payment_candidates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_payment_occurrences" ADD CONSTRAINT "recurring_payment_occurrences_recurringCandidateId_fkey" FOREIGN KEY ("recurringCandidateId") REFERENCES "recurring_payment_candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_payment_occurrences" ADD CONSTRAINT "recurring_payment_occurrences_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spending_insights" ADD CONSTRAINT "spending_insights_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_flow_forecasts" ADD CONSTRAINT "cash_flow_forecasts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_interactions" ADD CONSTRAINT "assistant_interactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

