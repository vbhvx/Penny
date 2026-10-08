# Statement Ingestion, Deduplication & Reconciliation

## 1. Supported Formats

| Format Identifier | Institution | Expected Headers | Notes |
|---|---|---|---|
| `CHASE_CSV` | Chase Bank | `Details,Posting Date,Description,Amount,Type,Balance,Check or Slip #` | Auto-detects checking, savings, and credit card downloads. |
| `BOA_CSV` | Bank of America | `Date,Description,Amount,Running Bal.` | Standard BofA statement export. |
| `MONZO_CSV` | Monzo Bank | `Transaction ID,Date,Name,Amount,Currency,Money Out,Money In` | Multi-currency UK export with separate Money Out / Money In columns. |
| `REVOLUT_CSV` | Revolut | `Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance` | Multi-currency card transactions. |
| `GENERIC_CSV` | Generic / Any Bank | Configurable mapping | Auto-guesses Date, Description, Amount, Debit, Credit, and Currency columns. |

## 2. Deduplication Hierarchy

Deduplication protects against statement re-imports, duplicate line items, and pending-to-posted double counting:

1. **External Transaction ID**: Scoped to the financial account and institution. If provider reference matches an existing record, classified as `DUPLICATE_CONFIRMED`.
2. **Cryptographic Content Signature**: SHA-256 hash of `(accountId + "|" + ISO_Date + "|" + FixedAmount + "|" + NormalizedDescription)`. Prevents duplicate identical records upon repeated CSV uploads.
3. **Pending-to-Posted Replacement**: Matches unsettled `PENDING` transactions within +/- 3 days with matching amount and merchant, marking them as `DUPLICATE_PROBABLE` replacements.
4. **Probabilistic Review**: Fuzzy match on same day or +/- 1 day with identical amount and similar merchant text. Surfaces row as `DUPLICATE_PROBABLE` for user review in preview stage.

## 3. Idempotent Ingestion Pipeline
- **File Hashing**: SHA-256 file contents check warns users if the exact same file is re-uploaded.
- **Transactional Commit**: Prisma `$transaction` commits valid rows atomically.
- **Safe Batch Rollback**: Every transaction tracks its `importBatchId`, allowing full batch undo without affecting unrelated transactions.

