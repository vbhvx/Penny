# Financial Calculations & Domain Rules

## 1. Canonical Signed Amount Convention
Penny enforces a single signed monetary convention throughout all services, database records, and mathematical calculations:

| Movement Type | Mathematical Sign | Ledger Classification | Excluded From Consumer Spending |
|---|---|---|---|
| Purchase / Outgoing Expense | **Negative** (`-`) | `PURCHASE`, `FEE` | No |
| Income / Incoming Deposit | **Positive** (`+`) | `INCOME` | No |
| Internal Transfer (Outflow) | **Negative** (`-`) | `TRANSFER` | **Yes** |
| Internal Transfer (Inflow) | **Positive** (`+`) | `TRANSFER` | **Yes** |
| Merchant Refund | **Positive** (`+`) | `REFUND` | **Yes** (offset against expenses) |
| Transaction Reversal | Follows source lifecycle | `REVERSAL` | **Yes** (prevents double-counting) |

## 2. Monetary Precision & Arithmetic
- **Zero Floating-Point Drift**: Never use standard JavaScript `number` binary floating-point representation (`0.1 + 0.2 = 0.30000000000000004`) for authoritative calculations.
- **Precision Engine**: Decimal.js with 28-digit precision and `ROUND_HALF_UP` bankers/standard rounding.
- **Database Representation**: PostgreSQL `Decimal(18, 4)`.
- **Currency-Specific Scale**:
  - `0` decimals: JPY, KRW, VND
  - `2` decimals: USD, EUR, GBP, CAD, AUD, INR, CHF, SGD
  - `3` decimals: BHD, KWD, OMR

## 3. Net Cash Flow vs Account Balance
Penny maintains a strict distinction between:
1. **Net Cash Movement**: `Sum(Income) - Sum(Expenses) + Sum(Refunds)` over a discrete date interval.
2. **Observed Account Balance**: Point-in-time balance reported by statement observation (`AccountBalanceObservation`).
3. **Calculated Ledger Balance**: Net cumulative lifetime movements for an account from genesis.

## 4. Multi-Currency Conversion Policy
- **No Silent Cross-Currency Summation**: Transactions denominated in different currencies are never added together numerically without explicit exchange rates.
- **Valuation Date**: Exchange rates are looked up matching the transaction's effective date or closest prior daily close observation.
- **Missing Rates**: If an exchange rate is missing, the reporting currency total is flagged as partial/unconverted, and the breakdown of native currencies is surfaced.

