# Penny

Penny is a personal-finance workspace for accounts, transaction imports, categorization, budgets, recurring-payment detection, cash-flow forecasting, analytics, exports, and an assistant interface. Import and ledger workflows are implemented through the versioned API rather than direct client-side persistence.

## Stack and structure

Next.js 14, React 18, TypeScript, Prisma/PostgreSQL, Decimal.js, PapaParse, Recharts, Tailwind CSS, Zod, JWT cookie authentication, and Vitest. Domain modules in `src/modules` implement ingestion, analytics, budgets, recurring detection, forecasting, currencies, assistant, and privacy behavior. `prisma/` holds the schema, migrations, and seed script.

## Start locally

```bash
cd 44_Penny
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Set `DATABASE_URL` and a random `SESSION_SECRET`. `GEMINI_API_KEY` is optional; the application supports a fallback when it is unavailable.

```bash
npm test
npm run lint
npm run build
```

`docker compose up --build` starts the documented container stack.
