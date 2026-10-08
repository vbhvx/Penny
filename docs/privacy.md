# Privacy, Security & AI Governance

## 1. Zero Bank Scraping & Credential Isolation
Penny requires **zero external bank credentials** or screen-scraping permissions. Ingestion is performed via user-uploaded statement files or manual entry. No online banking passwords or provider session tokens are stored or transmitted.

## 2. CSV Formula Injection Defense (CWE-1236)
When exporting financial transactions to CSV, malicious payloads in merchant names, payee notes, or descriptions starting with spreadsheet formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) are automatically escaped with a leading single quote (`'`). This prevents arbitrary command execution or DDE exploitation when opened in Microsoft Excel or Google Sheets.

## 3. Grounded AI Minimization & Prompt Defense
- **Tool-Grounded Only**: Natural language assistant queries pass through typed, server-side tools (`getSummary`, `getCategoryBreakdown`, `getBudgetStatuses`, etc.).
- **Zero Arbitrary SQL**: The AI model has no raw SQL execution rights, filesystem access, or ability to modify financial balances independently.
- **Untrusted User Input**: All merchant descriptions and user prompts are treated as untrusted data.
- **Data Minimization**: Only aggregated metrics for the authenticated user are passed to AI services. Raw statements or full ledger dumps are never sent to third-party model providers.

## 4. Right to Erasure / Workspace Purge
Users can permanently delete their workspace and all associated financial accounts, transactions, statement batches, recurring candidates, and logs via `POST /api/v1/privacy/deletion-request` with explicit confirmation string `"DELETE MY DATA"`.

