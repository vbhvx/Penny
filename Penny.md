# Technical Specification: Unified Personal Expense Intelligence MVP

**Project type:** Full-stack fintech engineering project  
**Product category:** Personal Finance · Financial Data Engineering · AI-Powered Analytics  
**Platform:** Responsive web application  
**Technology stack:** Next.js · React · TypeScript · PostgreSQL · Prisma  
**Market:** Multi-country, multi-currency  
**Data inputs:** CSV imports · Supported bank statements · Manual transactions · Authorized financial integrations · Clearly labeled demo data  
**Implementation approach:** Modular monolith with deterministic financial calculations and independently testable workflows

## Objective

Build a complete, functional application that consolidates an individual's financial transactions from different sources into one reliable financial workspace.

Users should be able to import bank statements, enter transactions manually, connect supported financial providers where authorized, automatically categorize spending, identify recurring payments, manage budgets, understand spending patterns, forecast cash flow, and ask questions about their finances in plain language.

The application must remain useful without automatic bank connectivity. CSV imports and manual transaction entry are primary features, not temporary workarounds.

**Priority order:** financial correctness → reliable transaction ingestion → deduplication and reconciliation → trustworthy analytics → transparent forecasts and insights → usable dashboard → conversational assistant → integrations and deployment.

The fundamental product principle is:

**One trustworthy financial picture, with clear explanations of where money went, what may happen next, and what the user can do about it.**

Build the actual application, not just a wireframe, static dashboard, or collection of disconnected code snippets. Reuse sound existing code, implement complete workflows, run tests, fix defects, and accurately report what is and is not operational.

---

## 1. Scope and acceptance criteria

### Required for the MVP

- Secure authentication and private user workspaces.
- Financial accounts and source management.
- CSV import with configurable column mapping.
- Explicitly documented support for selected bank statement formats.
- Import preview, validation, row-level errors, deduplication, and reconciliation.
- Manual transaction entry, editing, and categorization.
- Transaction search, filtering, and history.
- Multi-currency-aware financial summaries.
- Automatic transaction categorization with user correction.
- Recurring payment and subscription candidate detection.
- Category and overall budgets.
- Budget progress and configurable alerts.
- Evidence-backed spending insights.
- Basic cash-flow forecasting.
- Conversational finance assistant grounded in application data.
- Clear separation of actual records, calculated results, estimates, and demo data.
- Financial data export, privacy controls, and auditability.
- Database migrations, automated tests, setup instructions, and deployment configuration.

### Core product workflows

The primary workflow must work as follows:

1. A user imports a financial statement or manually enters transactions.
2. The application parses and validates the input.
3. The user reviews ambiguous fields and potential duplicates.
4. Accepted records are normalized into the canonical transaction model.
5. The application updates financial summaries and category totals.
6. Budgets, recurring-payment candidates, and relevant insights are recalculated.
7. The user reviews the results and asks questions using the conversational assistant.

### Explicitly out of scope for the MVP

- Initiating bank transfers or payments.
- Holding or managing customer funds.
- Investment or trading execution.
- Credit scoring or loan approval.
- Tax filing.
- Guaranteed financial predictions.
- Unverified automatic access to every bank, wallet, or payment application.
- Unnecessary microservices or distributed infrastructure.
- Automatic advice based on assumed user goals or risk tolerance.
- Training custom machine-learning models.

The application primarily reads, organizes, analyzes, and explains financial data. Do not add account-control or payment functionality simply because a provider offers it.

### Completion criteria

The core workflow is complete only when transactions can be entered or imported, correctly normalized and deduplicated, stored securely, included in reproducible calculations, and presented in a working dashboard.

---

## 2. Technology stack and architecture

Use the existing repository's conventions where they are sound. Otherwise, use the following defaults.

| Component | Recommended choice | Reason |
|---|---|---|
| Frontend | Next.js, React, TypeScript | Responsive application and reusable components |
| Application server | Next.js server-side logic and API routes | Simplified initial deployment |
| Styling | Tailwind CSS | Consistent visual system |
| Validation | Zod or equivalent | Runtime validation of user and provider input |
| Database | PostgreSQL | Reliable transactional persistence |
| ORM | Prisma or equivalent | Schema migrations and typed data access |
| Financial arithmetic | Exact decimal or minor-unit representation | Avoid binary floating-point errors |
| Charts | Recharts or equivalent | Category, trend, budget, and cash-flow visualization |
| AI | Replaceable model-provider adapter | Controlled, provider-independent assistant |
| Currency data | Verified exchange-rate provider adapter | Traceable conversion rates |
| Background jobs | Worker or scheduled jobs where necessary | Imports, synchronization, and alerts |
| Testing | Unit and integration tests | Financial and domain correctness |
| Browser testing | Playwright or equivalent | End-to-end workflow verification |
| Deployment | Compatible Next.js host and managed PostgreSQL | Reproducible deployment |
| Containerization | Docker where useful | Local environment consistency |

Prefer a **modular monolith** for the initial application. Keep financial logic separate from UI components, provider adapters, and AI-generated explanations.

Do not introduce multiple services, queues, or infrastructure components without a concrete requirement.

### High-level architecture

```text
Responsive Web Application
           |
           v
Application Server and API
           |
           +-- Authentication and Authorization
           +-- Accounts and Financial Sources
           +-- Import and Parsing Engine
           +-- Transaction Normalization
           +-- Deduplication and Reconciliation
           +-- Categorization Engine
           +-- Currency and Valuation Service
           +-- Spending Analytics
           +-- Budget Service
           +-- Recurring Payment Detection
           +-- Cash-Flow Forecasting
           +-- Conversational Finance Assistant
           +-- Export, Privacy, and Audit
           |
           v
       PostgreSQL
           |
           +-- Users and Accounts
           +-- Transactions and Import Batches
           +-- Categories and Budgets
           +-- Recurring Payment Candidates
           +-- Exchange Rates and Financial Observations
           +-- Forecasts and Insights
           +-- Assistant Audit Metadata
```

External financial providers, exchange-rate services, email delivery, and AI models must connect through explicit adapters.

### Architecture rules

- All authoritative financial calculations run in trusted server-side code.
- All financial analytics derive from the canonical transaction model.
- Provider-specific formats must not leak into UI components.
- Financial writes must be validated and auditable.
- Background tasks must be retry-safe and idempotent.
- AI-generated text is never the source of truth for financial values.
- Provider integrations remain optional and explicitly configured.
- The application must function without bank connectivity or an AI provider.

---

## 3. Financial domain model

Define a canonical transaction model independent of a particular bank, card issuer, wallet, or import format.

### Canonical transaction fields

Every transaction should support:

| Field | Purpose |
|---|---|
| Internal transaction ID | Stable application identifier |
| User/workspace ID | Ownership and access control |
| Financial account ID | Account association where known |
| Source type | Manual, imported, provider-reported, or simulated |
| Source/import reference | Traceability to the original record |
| External transaction ID | Provider identifier when available |
| Transaction date | Financial transaction date |
| Posted timestamp | Posting time where available |
| Original description | Preserved source text |
| Normalized merchant | Merchant identity when confidently identified |
| Amount | Exact monetary value |
| Currency | Explicit ISO 4217 currency code |
| Transaction type | Purchase, income, fee, transfer, refund, and other supported types |
| Status | Pending, posted, reversed, or another supported state |
| Category | Assigned category, when available |
| Categorization source | Rule, provider, AI suggestion, or user |
| Review status | Whether categorization needs user review |
| Transfer group | Link between related transfer records |
| Related transaction | Reversal, refund, or related record reference |
| Notes and tags | Optional user context |
| Timestamps | Creation and modification tracking |

Preserve the original imported description and available source values. Normalization must not destroy the evidence needed to review or reconcile a transaction.

### Canonical amount convention

Use one documented signed-amount convention throughout the application:

- Expense or outgoing payment: negative.
- Income or incoming payment: positive.
- Internal transfer: paired outflow and inflow, linked where identifiable.
- Refund: incoming transaction linked to the original expense where possible.
- Reversal: represented according to the source transaction lifecycle without double-counting the original transaction.

Where provider semantics differ, preserve the source information and normalize through explicit, tested rules.

### Important financial distinctions

Do not conflate:

- Account balance with income minus expenses.
- Pending transactions with posted transactions.
- Transfers with consumer spending.
- Credit card purchases with credit card bill payments.
- Refunds with income.
- Available credit with available cash.
- Imported balances with calculated balances.
- Original-currency values with reporting-currency values.

Document how each distinction affects analytics, budgets, forecasts, and assistant responses.

### Monetary precision

Never use binary floating-point arithmetic for authoritative financial values.

Use an explicit representation, such as integer minor units with currency-specific scale or an appropriate database decimal type.

Do not assume every currency uses two decimal places. Use maintained currency metadata and documented rounding rules.

---

## 4. Database schema

Use PostgreSQL with versioned migrations, foreign keys, indexes, and appropriate uniqueness constraints.

The following tables define the minimum conceptual schema.

| Table | Purpose |
|---|---|
| `users` | User identity, locale, timezone, and default reporting currency |
| `financial_accounts` | User accounts and their currencies and source types |
| `account_balance_observations` | Source-reported balance values and observation times |
| `financial_connections` | Integration and consent status |
| `import_batches` | File import status and aggregate processing counts |
| `import_row_results` | Validation outcomes and sanitized row-level errors |
| `transactions` | Canonical transaction records |
| `transaction_categories` | Default and user-defined categories |
| `transaction_audit_events` | Important transaction modifications |
| `transfer_groups` | Linked internal transfers |
| `budgets` | Spending limits and periods |
| `recurring_payment_candidates` | Detected recurring patterns awaiting confirmation |
| `recurring_payment_occurrences` | Transactions associated with recurring candidates |
| `exchange_rate_observations` | Currency rates and source timestamps |
| `spending_insights` | Evidence-backed, versioned insights |
| `cash_flow_forecasts` | Saved projections and their assumptions |
| `notification_preferences` | User notification settings |
| `assistant_interactions` | Minimal operational metadata for assistant requests |

### Essential schema behavior

**`transactions`** must retain ownership, account, source, external identifier where available, dates, original description, normalized merchant, exact amount, currency, transaction type, status, category, categorization provenance, transfer linkage, related transaction reference, and timestamps.

**`import_batches`** must track the source format, sanitized filename, file hash, row counts, processing state, and bounded error summary.

**`account_balance_observations`** must preserve the difference between an observed balance and a calculated balance. An imported value must not automatically be treated as current.

**`recurring_payment_candidates`** must retain detection evidence, frequency, expected amount where available, confidence explanation, review status, and supporting transactions.

**`exchange_rate_observations`** must record the currency pair, rate, effective time, provider, retrieval time, and rate type.

**`spending_insights`** must retain the date range, reporting currency, calculation version, and references to the evidence supporting the insight.

**`cash_flow_forecasts`** must preserve the input assumptions and calculation version needed to reproduce the projection.

### Database requirements

- Enforce user ownership at the data-access boundary.
- Scope external transaction identifiers to the correct provider and account.
- Avoid broad uniqueness constraints that merge legitimate repeated purchases.
- Index common transaction-date, account, category, currency, and status queries.
- Use database transactions for operations that require atomicity.
- Keep provider credentials and tokens out of ordinary data fields.
- Version all schema changes through migrations.
- Retain raw imported files only when required and under a documented retention policy.
- Do not include raw financial statements or credentials in logs.
- Make financial corrections auditable.

---

## 5. Transaction ingestion pipeline

Implement a consistent pipeline for manual entry, CSV files, supported bank statements, and authorized financial integrations.

### Step 1: Receive

Accept a supported statement file, a manual transaction submission, or a verified integration response.

Validate file type, size, encoding, structure, and row count before expensive processing.

### Step 2: Parse

For CSV imports:

- Support configurable column mapping.
- Support documented date formats where interpretation is unambiguous.
- Handle configurable amount, debit, and credit columns.
- Detect decimal and thousands separators conservatively.
- Preserve original descriptions and row references.
- Require confirmation when the currency or date interpretation is ambiguous.

For bank statement formats beyond CSV, only claim support for formats that have actually been implemented and tested.

If PDF statements are supported, clearly distinguish text-based PDFs from scanned documents. Do not silently claim successful parsing when OCR or required interpretation has not been performed.

### Step 3: Normalize

Map source fields into the canonical transaction model.

Normalize dates, amounts, currencies, merchant text, transaction types, statuses, account references, and external identifiers.

Never silently guess an ambiguous currency, date, transaction type, or account assignment.

### Step 4: Validate

Detect and classify:

- Missing amounts.
- Invalid dates.
- Unsupported currencies.
- Malformed records.
- Contradictory debit and credit fields.
- Unsupported transaction types.
- Duplicate candidates.
- Ambiguous account mapping.

Errors must be actionable and associated with the correct input row.

### Step 5: Preview

Before committing an import, show:

- Total rows read.
- Accepted rows.
- Invalid rows.
- Likely duplicates.
- Currency distribution.
- Date range.
- Account mapping.
- Ambiguous fields and warnings.

Allow users to fix mappings and review material warnings.

### Step 6: Commit

Commit accepted records transactionally where practical. For larger files, use a controlled background job with explicit status and retry-safe row processing.

Support idempotent commits, partial-failure reporting, safe retries, import history, and batch undo where feasible.

Never silently discard rejected records.

### Step 7: Recalculate

After a successful import, update affected financial summaries, budgets, recurring-payment candidates, and insights.

Invalidate stale caches so the dashboard reflects the committed data.

---

## 6. Deduplication and reconciliation

Deduplication is one of the most important parts of the financial data pipeline.

### Deduplication hierarchy

Prefer the strongest available identity evidence in this order:

1. Reliable external transaction ID scoped to provider and account.
2. Documented provider-specific stable reference.
3. Carefully normalized transaction signature using account, date, amount, currency, description, and other source fields.
4. Probabilistic matching that only suggests a duplicate for user review.

Never assume two records are duplicates solely because they have the same amount and date.

### Duplicate classifications

Classify matches as:

- Confirmed duplicate.
- Probable duplicate requiring review.
- Distinct transaction.
- Potential pending-to-posted replacement.
- Potential refund or reversal.

Preserve source evidence and audit decisions.

### Pending and posted transactions

When both states are supplied by a provider:

- Link them when reliable evidence supports the match.
- Avoid counting both as separate final expenses.
- Treat the posted transaction as authoritative for settled transactions where appropriate.
- Do not assume every pending transaction will post.
- Display pending amounts separately when their final status or value is uncertain.

### Internal transfers

Internal transfers must not be counted as consumer spending.

Use available evidence such as account information, similar amounts, compatible dates, opposite transaction directions, and provider references.

Allow user confirmation when the match is uncertain.

Transfers involving different currencies require explicit conversion semantics. Do not invent exchange rates or treat the conversion itself as ordinary consumer spending.

### Credit cards

Do not double-count a credit card purchase and the bank payment subsequently used to settle the card.

Where evidence supports it, count the purchase as spending and treat the repayment as a transfer or liability settlement.

### Refunds and reversals

Preserve the relationship to the original transaction where possible. Report refunds transparently rather than hiding the original expense.

### Import idempotency

Reimporting the same statement must not silently create duplicate transactions.

Use the file hash as one signal, not the sole deduplication mechanism, because modified files can contain previously imported records.

---

## 7. Financial calculations and currency rules

All authoritative calculations must run in tested server-side domain logic.

### Transaction summaries

Calculate and expose:

- Recorded income.
- Recorded expenses.
- Net cash-flow movement where meaningful.
- Spending by category.
- Spending by merchant.
- Spending by account.
- Spending by period.
- Refunds and their treatment.
- Pending amounts separately.
- Data coverage and synchronization freshness.

Document which transaction statuses and types participate in each measure.

Never describe net transaction movement as an account balance.

### Currency handling

Every amount retains its original currency.

Support a configurable reporting currency, but never combine different currencies by simply adding their numerical values.

For currency conversion:

1. Select an eligible exchange rate according to a documented valuation-date policy.
2. Record the exchange-rate provider and effective timestamp.
3. Preserve the original amount and currency.
4. Calculate the reporting-currency amount using exact decimal arithmetic.
5. Apply documented rounding rules.
6. Expose the conversion basis where needed.

If the required exchange rate is unavailable, display the original-currency amount and mark the reporting-currency total as incomplete.

Do not silently use today's exchange rate for historical reports. Historical conversion should follow a consistent policy, such as transaction-date rates where available, and distinguish that result from current-rate conversion.

### Timezone and calendar rules

- Store timestamps consistently.
- Retain the user's preferred timezone.
- Define how date-only transactions are interpreted.
- Support documented budget periods.
- Test month/year boundaries and daylight-saving transitions.

### Auditability

Every material financial figure must have a traceable calculation path to its source records, calculation version, date range, reporting currency, and assumptions.

---

## 8. Automatic transaction categorization

Implement a hybrid categorization engine.

### Stage 1: Deterministic rules

Prioritize:

- Known merchant mappings.
- User-defined rules.
- Explicit provider categories.
- Previously confirmed user corrections.
- Recognized transaction descriptors.

Define rule ordering so that user rules and corrections take precedence predictably.

### Stage 2: Optional AI classification

An AI model may suggest a category only when deterministic rules are insufficient.

Requirements:

- Send only the minimum required transaction information.
- Never send account credentials or complete statements unnecessarily.
- Validate model output against the allowed category taxonomy.
- Record the classification source.
- Provide a review and correction pathway.
- Do not let the model alter amounts, dates, currency, account identity, or transaction status.
- Do not label an arbitrary model score as a calibrated probability.

### Stage 3: User feedback

When a user changes a category, retain that correction. Optionally offer to create a rule for future transactions.

Do not silently apply corrections to unrelated records without consent.

### Default categories

Provide configurable categories such as:

- Housing.
- Groceries.
- Restaurants and delivery.
- Transport.
- Utilities.
- Healthcare.
- Shopping.
- Entertainment.
- Travel.
- Education.
- Insurance.
- Subscriptions.
- Income.
- Transfers.
- Fees and interest.
- Refunds.
- Other.

Support custom categories and subcategories. Uncertain transactions should remain reviewable instead of being forced into a misleading category.

---

## 9. Recurring payments and subscription detection

Implement a deterministic recurring-payment detector before introducing advanced machine learning.

### Detection signals

Consider:

- Normalized merchant identity.
- Similar amounts and currency.
- Repeated time intervals.
- Day-of-month or day-of-week patterns.
- Transaction type and status.
- Historical occurrence count.
- Missing occurrences.
- Related refunds or cancellations.

Support common weekly, fortnightly, monthly, quarterly, and annual patterns where sufficient evidence exists.

### Candidate classifications

Distinguish:

- Detected recurring pattern.
- User-confirmed recurring payment.
- User-dismissed candidate.
- No longer observed.
- Cancelled only when reliable evidence exists.

A sequence of similar transactions is not proof that a subscription exists.

### User experience

Show:

- Merchant.
- Typical amount or range.
- Currency.
- Estimated frequency.
- Last observed occurrence.
- Next expected date, if estimable.
- Detection evidence.
- Confidence explanation.
- Confirmation and dismissal controls.

Never claim that a subscription has been cancelled unless an authorized cancellation mechanism was actually used and the result verified. Detection must not be presented as cancellation.

---

## 10. Spending insights and budgets

### 10.1 Evidence-backed spending insights

Generate insights from reproducible calculations, not unsupported AI guesses.

Examples of valid insight patterns include:

- Recorded grocery spending changed compared with the previous month.
- Recurring-payment candidates were identified for review.
- A category budget has reached a configured threshold.
- An analysis includes data from specific accounts with known update dates.

These examples must only be shown when supported by the actual records.

### Insight-generation pipeline

1. Select a defined date range.
2. Apply transaction eligibility and currency rules.
3. Calculate the metric in deterministic code.
4. Compare it with an appropriate baseline.
5. Verify data sufficiency.
6. Generate a plain-language explanation.
7. Include evidence references and assumptions.
8. Store the calculation version and relevant period.

### Comparison rules

- Compare equivalent date ranges.
- Disclose incomplete current periods.
- Avoid misleading percentage changes when a baseline is zero or negligible.
- Distinguish absolute changes from percentage changes.
- Do not infer causation from correlation.
- Do not claim that an expense is unnecessary solely because it is large.
- Explain when missing data makes a comparison unavailable.

### 10.2 Budgets and alerts

Support overall and category budgets, configurable periods, custom limits, alert thresholds, in-app notifications, and optional email notifications through a configured provider.

For each budget, calculate:

- Period limit.
- Eligible spending.
- Remaining amount.
- Percentage consumed.
- Projected period-end spending where supported.
- Alert status.

Use the same category, transfer, refund, currency, and pending-transaction rules throughout the application.

Prevent repeated alerts for the same threshold crossing. Recalculate budgets when transactions are imported, corrected, or removed.

Possible alerts include budget thresholds, potential overspending, an approaching recurring payment, or an unusual transaction pattern that warrants review.

Explain the evidence behind alerts. Do not label an unusual transaction as fraud without sufficient evidence.

---

## 11. Cash-flow forecasting

Implement a transparent baseline forecasting model before considering opaque predictive models.

### Forecast inputs

Use only available, identified inputs:

- Verified account balance observations.
- Historical posted income and expenses.
- Confirmed recurring payments.
- Confirmed or user-entered expected income.
- Confirmed or user-entered expected expenses.
- User-defined assumptions.

### Forecast formula

Use the documented identity:

\[
\text{Projected closing balance}
=
\text{Opening balance assumption}
+
\text{Expected inflows}
-
\text{Expected outflows}
\]

For consolidated multi-account forecasting, aggregate balances only when the user explicitly requests it and currencies have been handled consistently.

Exclude internal transfers from consolidated net spending while preserving their effect on individual account balances.

### Forecast output

Show:

- Forecast horizon.
- Opening balance and its source.
- Expected income and expenses.
- Included recurring payments.
- Projected closing balance.
- Assumptions and known data gaps.
- Calculation time.
- Scenario or uncertainty information where supported.

### Forecast limitations

A forecast is not a verified bank balance. Historical behavior does not guarantee future behavior, and missing accounts or stale balance observations can change the result.

Unknown future expenses must not be fabricated. Use clear language such as “estimated from recorded transactions and confirmed recurring patterns.”

---

## 12. Conversational finance assistant

Build a conversational assistant that answers questions using the application's verified financial calculations.

Example questions:

- How much did I spend on restaurants last month?
- What were my largest expenses this week?
- Which recurring payments should I review?
- Am I on track with my grocery budget?
- What upcoming payments are included in my forecast?
- Why is my recorded spending higher than last month?

### Assistant architecture

Provide controlled server-side tools for:

- Transaction summaries.
- Category breakdowns.
- Merchant-level summaries.
- Budget status.
- Recurring-payment candidates.
- Cash-flow forecast results.
- Account and synchronization coverage.

The model must not invent SQL, access arbitrary database tables, or independently calculate authoritative financial totals from conversation text.

Use typed tool inputs and outputs. Enforce the authenticated user's permissions at every invocation.

### Grounding requirements

1. Retrieve data through validated application services.
2. Calculate authoritative totals and comparisons in deterministic code.
3. Return evidence-backed results.
4. Include date range and currency.
5. Explain material assumptions.
6. Disclose incomplete source coverage.
7. State when the data does not support an answer.
8. Separate factual summaries from suggestions.
9. Never invent transactions, balances, subscriptions, or future payments.
10. Never expose another user's financial information.

### Prompt-injection defense

Treat transaction descriptions, merchant names, uploaded files, and provider text as untrusted data rather than instructions.

Do not execute commands, disclose secrets, or modify records because imported content or a user prompt requests it.

### Privacy and action controls

Minimize financial information sent to AI providers. Aggregate queries should use aggregate results instead of full transaction histories wherever possible.

Require explicit confirmation for actions such as deleting records, changing budgets, or modifying data. Do not initiate transfers or payments.

If the AI provider is unavailable, the transaction ledger and deterministic analytics must continue working.

---

## 13. Global currency and localization support

Design the core domain model for multi-country and multi-currency use.

### Required support

- ISO 4217 currency codes.
- Currency-specific precision and rounding.
- User-selected reporting currency.
- Country and locale settings.
- Timezone-aware dates.
- Configurable date and number formatting.
- Multiple source formats.
- Exchange-rate provenance.
- Explicit conversion policies.

### Rules

- Do not assume the user's location establishes financial residency or tax jurisdiction.
- Do not assume that every account uses the reporting currency.
- Do not infer transaction currency from the amount alone.
- Do not silently convert historical records using today's rate.
- Do not aggregate incompatible currencies without documented conversion.
- Disclose country-specific integration limitations.

Country-specific financial connections must remain modular and should only be enabled when their actual capabilities and authorization have been verified.

---

## 14. Backend API contract

Implement validated APIs under `/api/v1`, or an equally clear and documented application-server contract.

### Accounts and connections

- `GET /api/v1/accounts`
- `POST /api/v1/accounts`
- `PATCH /api/v1/accounts/{accountId}`
- `GET /api/v1/connections`
- `POST /api/v1/connections/{providerKey}/start` — configured providers only.
- `POST /api/v1/connections/{connectionId}/sync` — where supported.
- `DELETE /api/v1/connections/{connectionId}`

Never return credentials or access tokens to the browser.

### Imports

- `POST /api/v1/imports`
- `GET /api/v1/imports/{batchId}`
- `GET /api/v1/imports/{batchId}/preview`
- `POST /api/v1/imports/{batchId}/commit`
- `POST /api/v1/imports/{batchId}/cancel`
- `GET /api/v1/imports/{batchId}/errors`

Define a validated upload contract appropriate to the hosting architecture.

### Transactions

- `GET /api/v1/transactions`
- `POST /api/v1/transactions`
- `GET /api/v1/transactions/{transactionId}`
- `PATCH /api/v1/transactions/{transactionId}`
- `DELETE /api/v1/transactions/{transactionId}`
- `POST /api/v1/transactions/{transactionId}/categorize`
- `POST /api/v1/transactions/{transactionId}/mark-transfer`
- `POST /api/v1/transactions/{transactionId}/review-duplicate`

Support bounded filtering and pagination by date, account, category, merchant, currency, status, and source.

### Analytics

- `GET /api/v1/analytics/summary`
- `GET /api/v1/analytics/categories`
- `GET /api/v1/analytics/merchants`
- `GET /api/v1/analytics/trends`
- `GET /api/v1/analytics/data-coverage`

Require explicit date ranges and currency policies. Return metric definitions and source coverage where useful.

### Budgets and recurring payments

- `GET /api/v1/budgets`
- `POST /api/v1/budgets`
- `PATCH /api/v1/budgets/{budgetId}`
- `DELETE /api/v1/budgets/{budgetId}`
- `GET /api/v1/budgets/{budgetId}/status`
- `GET /api/v1/recurring-payments`
- `POST /api/v1/recurring-payments/{candidateId}/confirm`
- `POST /api/v1/recurring-payments/{candidateId}/dismiss`
- `PATCH /api/v1/recurring-payments/{candidateId}`

### Forecasting and assistant

- `GET /api/v1/cash-flow/forecast`
- `POST /api/v1/cash-flow/scenarios`
- `POST /api/v1/assistant/messages`

Creating a forecast scenario must not mutate recorded transactions.

### Export and privacy

- `POST /api/v1/exports`
- `GET /api/v1/exports/{exportId}`
- `GET /api/v1/privacy/data-export`
- `POST /api/v1/privacy/deletion-request`

Use asynchronous processing where required and verify that exported data belongs only to the requesting user.

### API requirements

- Authenticate and authorize every private operation.
- Validate IDs, dates, amounts, currencies, files, and pagination.
- Use structured errors and appropriate HTTP status codes.
- Apply rate limits where appropriate.
- Avoid leaking record existence across user boundaries.
- Use idempotency for retryable mutations.
- Never report success before the corresponding database or external operation succeeds.

---

## 15. Frontend specification

Build a polished, responsive financial workspace focused on clarity and trust.

### A. Onboarding

Include account creation, reporting currency and timezone preferences, supported import instructions, import-first onboarding, optional verified connections, and a clearly labeled demo mode.

Users must not need to connect a bank to use the application.

### B. Financial overview

Display:

- Recorded income for the selected period.
- Recorded expenses.
- Net cash-flow movement with a clear definition.
- Budget status.
- Upcoming confirmed or estimated recurring payments.
- Cash-flow forecast, clearly marked as an estimate.
- Source coverage and last synchronization times.
- Evidence-backed spending insights.

Do not label transaction totals as actual bank balances.

### C. Transactions

Include search, date filters, account filters, category filters, currency and source filters, pending and posted indicators, transfer and refund labels, categorization review status, transaction details, manual editing, and duplicate review.

### D. Imports

Implement a guided workflow:

1. Select or upload the file.
2. Choose the financial account and supported statement format.
3. Map columns.
4. Preview parsed values.
5. Review invalid rows and duplicate candidates.
6. Confirm the import.
7. Show accepted, rejected, and duplicate counts.
8. Provide an error report where appropriate.

Important import failures must not be hidden behind a generic success message.

### E. Analytics

Display category spending, merchant breakdowns, trends, monthly comparisons, income and expenses, multi-currency views, and coverage indicators.

Make date range, reporting currency, and calculation policy visible.

### F. Recurring payments

Display candidate status, frequency, amount, evidence, confidence explanation, and expected date when available. Provide confirm, edit, and dismiss actions.

### G. Budgets

Display budget limits, eligible spending, remaining amounts, alert thresholds, and projected overspending where supported.

### H. Cash-flow forecasting

Separate recorded history from future projections. Display assumptions, included recurring payments, missing data, and scenario comparisons.

### I. Conversational assistant

Provide a chat interface with example questions. Show the relevant reporting period, currency, and supporting figures in responses.

Model-generated prose must never substitute for an authoritative financial calculation.

### J. Settings and privacy

Include reporting currency, timezone, account and connection management, import history, notification preferences, data export, account deletion, and AI/privacy information.

### General UX requirements

- Mobile-first responsive design.
- Accessible controls, visible focus states, and keyboard navigation.
- Charts with text alternatives or equivalent summaries.
- Loading, error, empty, and partial-data states.
- No fake live data.
- No dead buttons represented as working features.
- No financial amount without its currency context.
- Clear visual distinction between actual data, estimates, calculations, and demo fixtures.

---

## 16. Security and privacy

Financial data must be treated as highly sensitive.

### Authentication and authorization

- Use a maintained authentication implementation.
- Enforce record ownership on every private operation.
- Protect imports, exports, accounts, transactions, budgets, and assistant tools.
- Use secure session management.
- Support disconnection and account deletion.
- Never rely on frontend visibility for authorization.

### File security

- Enforce upload limits.
- Validate file contents rather than trusting extensions.
- Defend against malformed CSV and spreadsheet formula injection in exports.
- Never execute uploaded content.
- Avoid exposing statement contents in logs.
- Remove temporary files according to the retention policy.

### Integration security

- Store secrets in environment configuration or a suitable secrets manager.
- Never commit provider credentials.
- Never expose bank access tokens to the frontend.
- Use official provider authorization flows.
- Request only necessary scopes.
- Support revocation and disconnection.
- Sanitize provider error messages.

### Database and API security

- Use parameterized queries through the ORM.
- Validate all external inputs.
- Protect state-changing operations against CSRF where applicable.
- Configure rate limits and security headers.
- Prevent cross-user access.
- Use least-privilege database credentials.
- Encrypt production transport with HTTPS.
- Configure appropriate encryption and backups.

### AI privacy

- Send only the information required for each query.
- Avoid sending full statements when aggregate data is sufficient.
- Never include access tokens in model prompts.
- Document AI-provider data handling.
- Avoid indefinite retention of full conversations.
- Provide relevant AI usage disclosures.

### Audit and retention

Audit material financial mutations and administrative actions. Document data retention, export, and deletion.

Account deletion should cover transactions, imported files, derived insights, and associated records according to the declared policy. If legal or operational retention prevents immediate deletion, document the exception and apply appropriate restrictions.

Do not claim regulatory compliance merely because security controls have been implemented.

---

## 17. Testing and validation plan

Build a deterministic test suite that does not require real bank credentials or paid AI services.

### Financial arithmetic

Test exact decimal calculations, currency precision, rounding, income and expense totals, refund handling, transfer exclusion, pending transaction treatment, date boundaries, multi-currency conversions, missing exchange rates, and reporting-currency consistency.

### Import tests

Test valid CSVs, missing columns, ambiguous dates, decimal separators, thousands separators, negative amounts, debit and credit columns, unsupported currencies, invalid rows, empty and oversized files, duplicate uploads, partial failures, safe retries, cancellation, and error reports.

### Deduplication and reconciliation

Test stable external identifiers, repeated statement uploads, identical legitimate purchases, pending-to-posted transitions, refunds and reversals, internal transfer matching, credit card purchases versus repayments, ambiguous candidates, and user corrections.

### Categorization

Test deterministic rules, user overrides, invalid AI output, unknown merchants, review states, and protection against unauthorized changes to amounts or other transaction facts.

### Recurring payments

Test weekly and monthly patterns, variable amounts, missing occurrences, false-positive candidates, user confirmation and dismissal, expected dates, multiple currencies, and repeated processing without duplicate occurrences.

### Budgets and alerts

Test threshold crossings, overall and category budgets, refund effects, transfer exclusion, currency consistency, period boundaries, incomplete data, recalculation after transactions change, and duplicate-alert suppression.

### Cash-flow forecasting

Test balance provenance, recurring payments, missing balance observations, multiple accounts, multi-currency limitations, known expected results, scenario isolation, and protection against invented future transactions.

### Conversational assistant

Test known transaction questions, correct reporting periods and currencies, refusal to invent missing values, disclosure of incomplete data, invalid tool arguments, cross-user access attempts, prompt injection in transaction descriptions, invalid model output, and financial mutations without authorization.

### Security and end-to-end tests

Test cross-user data access, export authorization, malformed uploads, secret leakage, and consistency between imports, transactions, analytics, budgets, and assistant responses.

Verify the complete browser journey from importing transactions to reviewing an evidence-backed spending insight.

### Release gate

The financial calculations must reconcile with known fixtures. Re-importing a statement must not silently duplicate records. Missing data must be disclosed. Every private endpoint must enforce ownership. Assistant answers must agree with deterministic application results.

Run and report actual results for linting, type checking, unit tests, integration tests, and production builds.

---

## 18. Observability and operational reliability

Implement:

- Structured, sanitized logs.
- Request IDs.
- Import batch statuses.
- Integration synchronization history.
- Safe error summaries.
- Retry-safe background jobs.
- Application health checks.
- Monitoring for failed imports, integrations, and notifications.

Do not expose stack traces or sensitive financial information to users.

If an integration fails, preserve valid historical records, display the last successful synchronization, mark the connection degraded or disconnected, avoid inventing current balances, and allow the user to continue through imports and manual entries.

If exchange-rate data is unavailable, do not silently use fabricated or unsupported rates.

If the AI provider is unavailable, transaction management and deterministic analytics must remain functional.

---

## 19. Repository structure

Keep the application easy to understand and maintain.

```text
expense-intelligence/
├── src/
│   ├── app/
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   ├── imports/
│   │   ├── budgets/
│   │   ├── recurring/
│   │   ├── forecasts/
│   │   ├── assistant/
│   │   ├── settings/
│   │   └── api/
│   ├── components/
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   ├── imports/
│   │   ├── charts/
│   │   └── ui/
│   ├── modules/
│   │   ├── accounts/
│   │   ├── transactions/
│   │   ├── ingestion/
│   │   ├── reconciliation/
│   │   ├── categorization/
│   │   ├── currencies/
│   │   ├── analytics/
│   │   ├── budgets/
│   │   ├── recurring/
│   │   ├── forecasting/
│   │   └── assistant/
│   ├── lib/
│   │   ├── auth/
│   │   ├── db/
│   │   ├── validation/
│   │   └── observability/
│   └── styles/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/
│   ├── architecture.md
│   ├── financial-rules.md
│   ├── imports-and-reconciliation.md
│   ├── api.md
│   └── privacy.md
├── public/
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── README.md
└── package.json
```

Adapt the structure to the existing repository. Do not create empty modules or unnecessary abstractions merely to match the example.

---

## 20. Implementation checklist

### Phase 1 — Inspect and plan

- Inspect the repository, dependencies, runtime, database, and available tools.
- Define monetary, currency, and transaction-status conventions.
- Design the canonical transaction schema.
- Document supported import formats.
- Identify unavailable integrations and their requirements.
- Define financial correctness and acceptance tests.

**Deliverable:** a validated implementation plan and documented architecture.

### Phase 2 — Core ledger

- Implement authentication and user isolation.
- Create the database schema and migrations.
- Implement accounts and transactions.
- Add manual transaction entry.
- Implement exact monetary arithmetic.
- Create deterministic demo fixtures.
- Test the canonical transaction model.

**Deliverable:** a trustworthy ledger that works without external integrations.

### Phase 3 — Imports and reconciliation

- Implement CSV parsing and column mapping.
- Add tested statement formats.
- Implement preview, validation, and row-level errors.
- Add deduplication and pending-to-posted handling.
- Handle transfers, refunds, and reversals.
- Implement idempotent imports and safe retries.

**Deliverable:** users can import statements without silently double-counting transactions.

### Phase 4 — Analytics and categorization

- Implement deterministic categorization rules.
- Add user corrections.
- Implement spending summaries and filters.
- Add currency-aware reporting.
- Build the transaction and analytics UI.
- Show source coverage and calculation context.

**Deliverable:** users can accurately understand their recorded spending.

### Phase 5 — Budgets and recurring payments

- Implement budget creation and tracking.
- Add threshold alerts.
- Detect recurring payment candidates.
- Add review, confirmation, and dismissal actions.
- Test recalculation after transaction changes.

**Deliverable:** users can track budgets and review likely recurring payments.

### Phase 6 — Forecasting and assistant

- Implement baseline cash-flow forecasting.
- Record forecast assumptions and calculation versions.
- Add deterministic analytics tools.
- Implement evidence-backed natural-language responses.
- Add privacy controls and AI-provider failure handling.
- Test factual correctness and access boundaries.

**Deliverable:** forecasts and assistant responses are explainable and evidence-backed.

### Phase 7 — Integration and hardening

- Implement provider adapters.
- Configure only verified, authorized financial integrations.
- Add exchange-rate provider support if available.
- Harden authentication, uploads, exports, and secret handling.
- Run the full test suite.
- Fix identified defects.

**Deliverable:** robust core workflows and explicitly documented integration status.

### Phase 8 — Deployment and handover

- Configure production environment variables.
- Apply database migrations.
- Deploy where access is available.
- Test core production workflows.
- Complete documentation.
- Verify public URLs if applicable.
- Produce a clear list of remaining limitations.

**Deliverable:** a reproducible, testable application with a truthful delivery report.

---

## 21. Acceptance criteria and release gates

### Data integrity

- Imported and manually entered transactions use the same canonical schema.
- Repeated imports do not silently create duplicates.
- Pending, posted, reversed, and refunded records are handled explicitly.
- Transfers are not misrepresented as consumer spending.
- Financial amounts use exact arithmetic.
- Different currencies are never aggregated without conversion.
- Missing exchange rates are surfaced.
- Data provenance is preserved.
- User corrections remain auditable.

### Analytics

- Income and expense summaries match known test fixtures.
- Category and merchant breakdowns use consistent rules.
- Budget totals reconcile with transaction totals.
- Recurring-payment candidates contain inspectable evidence.
- Forecasts disclose assumptions and uncertainty.
- Assistant answers match deterministic calculations.
- Incomplete data is explicitly disclosed.

### Security and privacy

- Users cannot access another user's transactions, accounts, imports, budgets, exports, or assistant data.
- Sensitive credentials are never exposed to the browser.
- Uploaded files are validated.
- Logs do not leak unnecessary financial data.
- Providers and AI services are optional and securely configured.
- Export and deletion follow the documented policy.

### User experience

- The core workflow works on mobile and desktop.
- Users can enter transactions manually.
- Users can import supported statements.
- Import errors and duplicate candidates are reviewable.
- The dashboard distinguishes facts, estimates, and demo data.
- Financial values show currency context.
- No critical action is a nonfunctional placeholder.

### Engineering delivery

- Database migrations are reproducible.
- Tests, type checks, and production builds have actually been run.
- The README explains setup, configuration, supported imports, financial conventions, testing, deployment, and limitations.
- No unverified integration is presented as connected.
- No fabricated financial records or results are presented as real.
- The final report distinguishes implemented, tested, and deployed features.

---

## 22. README and delivery checklist

The README must include:

- Product purpose and target users.
- Screenshots of the working application.
- Architecture and repository structure.
- Technology stack.
- Local setup instructions.
- Environment variable reference.
- Database migration and seed instructions.
- Docker startup instructions where applicable.
- API documentation and example requests.
- Supported import formats and their limitations.
- Financial calculations and signed-amount conventions.
- Deduplication and reconciliation rules.
- Currency conversion policy.
- Categorization and recurring-payment behavior.
- Forecasting assumptions.
- Assistant grounding and privacy behavior.
- Data retention and deletion policy.
- Test execution instructions.
- Deployment and recovery steps.
- Actual integration status and known limitations.

Never commit real credentials, access tokens, private account information, or real user financial data.

Do not claim that an external service works unless it was actually configured and tested.

---

## 23. Risks that could invalidate the result

### Incorrect financial calculations

A polished dashboard with an incorrect balance, double-counted transactions, or inconsistent currency conversion is a failed financial product.

**Mitigation:** Centralize financial calculations, use exact arithmetic, document conventions, and verify results against independently calculated test fixtures.

### Duplicate transactions and incorrect reconciliation

Pending and posted records, repeated imports, refunds, transfers, and credit card repayments can distort spending totals.

**Mitigation:** Preserve source identifiers, use evidence-based matching, make uncertain matches reviewable, and enforce idempotent processing.

### Incomplete or misleading financial data

Missing accounts, stale imported balances, delayed provider synchronization, or unavailable exchange rates can produce misleading summaries.

**Mitigation:** Show source coverage, observation timestamps, missing-data indicators, and explicit partial-result states.

### Unsupported integration assumptions

Not every financial provider supports every account type, country, or use case. Public API access does not automatically imply permission to connect retail accounts.

**Mitigation:** Use provider adapters and enable integrations only after the relevant capabilities, access, permissions, and usage restrictions are verified.

### False-positive subscription detection

Repeated transactions can look recurring without representing a subscription.

**Mitigation:** Use deterministic matching, expose supporting evidence, provide user confirmation, and distinguish candidates from confirmed recurring payments.

### Overconfident forecasting

Historical activity does not guarantee future expenses or income. A calculated projection is not a real bank balance.

**Mitigation:** Use transparent formulas, preserve assumptions, show missing information, and identify outputs as estimates.

### AI-generated financial misinformation

A language model can produce a plausible answer unsupported by the actual ledger.

**Mitigation:** Calculate numbers through deterministic application services, ground answers in retrieved evidence, validate tool arguments, and require explicit acknowledgment of missing data.

### Privacy and security failures

Financial records, account identifiers, imported statements, and provider tokens require strong access and lifecycle controls.

**Mitigation:** Enforce ownership, minimize collected data, use secure token storage, redact logs, implement data export and deletion, and test the security boundaries.

### Overengineering the initial release

Implementing every provider, AI feature, and financial workflow simultaneously can prevent a reliable first release.

**Mitigation:** Complete the canonical ledger, statement imports, deduplication, and correct spending analytics before expanding to forecasting, AI, and live integrations.

---

## 24. Required final report

When implementation is complete, report:

1. Features implemented and verified.
2. Final repository structure.
3. Database schema and financial calculation conventions.
4. Supported import formats and known limitations.
5. Deduplication and reconciliation behavior.
6. Multi-currency conversion policy.
7. Categorization and recurring-payment detection behavior.
8. Forecasting methodology and assumptions.
9. How the conversational assistant retrieves and grounds financial data.
10. Security and privacy controls.
11. Tests actually executed and their results.
12. Type-check and production-build results.
13. Local startup and configuration instructions.
14. Verified deployment URLs, if available.
15. Financial integrations actually configured, or an explicit statement that none are configured.
16. Known limitations and prioritized next steps.

Do not claim that tests, deployments, integrations, or financial calculations succeeded without verification.

Do not report a forecast as a verified balance, a recurring-payment candidate as a confirmed subscription, or an AI-generated insight as fact without supporting evidence.

---

## 25. Final execution instruction

Start by inspecting the existing repository, dependencies, database, and available tools.

Implement the smallest complete vertical slice first:

**Add or import transactions → normalize and deduplicate → calculate accurate spending → display a grounded, plain-language summary.**

Test this workflow end-to-end before expanding into budgets, recurring payments, forecasting, and the conversational assistant.

Then implement the remaining features incrementally, preserving source provenance and financial correctness throughout the system.

The fundamental architecture must remain:

- The canonical ledger establishes the recorded financial facts.
- The financial calculation engine produces authoritative numerical results.
- The analytics layer explains historical activity.
- Budgets and forecasting organize those facts around upcoming financial needs.
- The AI assistant explains evidence and helps users understand their options.
- Security, authorization, and privacy controls protect financial records.
- Users retain control over consequential actions and data sharing.

Build a trustworthy, extensible financial application that accurately explains where money went, identifies what deserves attention, and estimates what may happen next—without fabricating data, hiding uncertainty, or compromising financial privacy.