# Penny Backend API Reference (`/api/v1`)

All private endpoints require session authentication via the `penny_session` HTTP-only cookie.

## Authentication
- `POST /api/v1/auth/login`
  - Body: `{ email, password, isDemoLogin? }`
- `POST /api/v1/auth/register`
  - Body: `{ name, email, password, defaultCurrency, timezone }`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

## Accounts
- `GET /api/v1/accounts` — List active accounts with last observed balances
- `POST /api/v1/accounts` — Create account: `{ name, type, currency, institutionName?, initialBalance? }`
- `PATCH /api/v1/accounts/{id}` — Update account details
- `DELETE /api/v1/accounts/{id}` — Archive account

## Imports
- `POST /api/v1/imports/preview` — Upload statement and receive row-level validation & duplicate preview:
  - Body (JSON or multipart): `{ accountId, fileName, fileContent, customMapping? }`
- `POST /api/v1/imports/{batchId}/commit` — Commit validated rows to the canonical transaction ledger
- `POST /api/v1/imports/{batchId}/cancel` — Cancel pending preview batch
- `POST /api/v1/imports/{batchId}/undo` — Safe rollback of all transactions created in this batch
- `GET /api/v1/imports` — List import history and batch statistics

## Transactions
- `GET /api/v1/transactions` — Query ledger with filters (`search`, `accountId`, `categoryId`, `status`, `type`, `startDate`, `endDate`, `needsReview`, `page`, `limit`)
- `POST /api/v1/transactions` — Record manual transaction
- `GET /api/v1/transactions/{id}`
- `PATCH /api/v1/transactions/{id}`
- `DELETE /api/v1/transactions/{id}`
- `POST /api/v1/transactions/{id}/categorize` — Apply category correction with optional merchant rule creation
- `POST /api/v1/transactions/{id}/mark-transfer` — Mark transaction as internal transfer

## Analytics
- `GET /api/v1/analytics/summary` — Authoritative income, expenses, net cash flow, and pending totals
- `GET /api/v1/analytics/categories` — Spending by category with percentages
- `GET /api/v1/analytics/merchants` — Top spending merchants with transaction counts
- `GET /api/v1/analytics/trends` — Monthly income vs expense time-series

## Budgets
- `GET /api/v1/budgets` — List active budgets with real-time progress and projected run rates
- `POST /api/v1/budgets` — Create budget: `{ name, categoryId?, period, limitAmount, alertThreshold }`
- `PATCH /api/v1/budgets/{id}`
- `DELETE /api/v1/budgets/{id}`

## Recurring Payments
- `GET /api/v1/recurring-payments` — List detected, confirmed, and dismissed recurring candidates
- `POST /api/v1/recurring-payments/detect` — Scan transactions for repeated billing patterns
- `POST /api/v1/recurring-payments/{id}/confirm` — Confirm subscription
- `POST /api/v1/recurring-payments/{id}/dismiss` — Dismiss candidate

## Cash-Flow Forecasting
- `GET /api/v1/cash-flow/forecast?horizon=30` — Mathematical 30, 60, or 90 day projection with daily balance trajectory and assumptions

## Assistant
- `POST /api/v1/assistant/messages` — Ask natural language questions grounded in verified application calculations:
  - Body: `{ message }`

## Data Export & Privacy
- `GET /api/v1/exports/csv` — Formula-safe CSV download
- `GET /api/v1/exports/json` — Complete structured workspace JSON export
- `POST /api/v1/privacy/deletion-request` — Permanent workspace wipe (`{ confirmation: "DELETE MY DATA" }`)

