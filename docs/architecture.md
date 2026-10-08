# System Architecture: Penny Modular Monolith

```
Responsive Web Application (Next.js 14 / React 18 / Tailwind CSS)
           |
           v
Application Server & API Handlers (/api/v1)
           |
           +-- Authentication & User Isolation (JWT / bcrypt / cookies)
           +-- Ingestion Engine (Multi-format CSV / Sanitization)
           +-- Normalization & Deduplication (SHA-256 Signatures / Fuzzy Match)
           +-- Authoritative Arithmetic Engine (Decimal.js / ISO 4217)
           +-- Categorization Engine (Deterministic Rules / Fallback AI)
           +-- Budget Service & Alert Engine
           +-- Recurring Payment Candidate Detector
           +-- Baseline Cash-Flow Forecaster (Opening + Inflows - Outflows)
           +-- Grounded Conversational Finance Assistant
           +-- Privacy & Data Export Service (Formula-Safe CSV / JSON)
           |
           v
       PostgreSQL (Prisma ORM)
           |
           +-- users & financial_accounts
           +-- transactions & import_batches
           +-- transaction_categories & categorization_rules
           +-- budgets & recurring_payment_candidates
           +-- account_balance_observations & exchange_rate_observations
           +-- spending_insights & cash_flow_forecasts
           +-- transaction_audit_events & assistant_interactions
```

## Architectural Boundaries & Guarantees
1. **Financial Core Isolation**: The canonical ledger and currency arithmetic modules run independently of UI rendering and external APIs.
2. **Server-Side Authoritative Math**: Frontend components receive pre-computed, rounded, and verified Decimal figures. Client-side math never dictates authoritative financial state.
3. **Graceful Degraded States**:
   - Absence of bank connectivity: Manual and CSV statement ingestion remain primary first-class citizens.
   - Absence of AI API keys: Deterministic pattern matching handles all categorization, recurring detection, and conversational answers.
   - Missing exchange rates: Native currencies are preserved and reported with explicit partial-conversion disclaimers.

