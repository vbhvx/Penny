import { ColumnMapping } from "./types";

export interface StatementFormatSpec {
  id: string;
  name: string;
  description: string;
  institution: string;
  detectHeaders: (headers: string[]) => boolean;
  defaultMapping: ColumnMapping;
}

export const SUPPORTED_STATEMENT_FORMATS: StatementFormatSpec[] = [
  {
    id: "CHASE_CSV",
    name: "Chase Bank Activity CSV",
    description: "Export from Chase Online / Mobile (Checking, Savings, Credit Cards)",
    institution: "Chase",
    detectHeaders: (headers: string[]) => {
      const h = headers.map((x) => x.trim().toLowerCase());
      return (
        h.includes("posting date") &&
        h.includes("description") &&
        h.includes("amount")
      );
    },
    defaultMapping: {
      dateColumn: "Posting Date",
      descriptionColumn: "Description",
      amountColumn: "Amount",
      categoryColumn: "Category",
      dateFormat: "MM/DD/YYYY",
      defaultCurrency: "USD",
    },
  },
  {
    id: "BOA_CSV",
    name: "Bank of America Statement CSV",
    description: "Standard transaction download from Bank of America",
    institution: "Bank of America",
    detectHeaders: (headers: string[]) => {
      const h = headers.map((x) => x.trim().toLowerCase());
      return (
        h.includes("date") &&
        h.includes("description") &&
        h.includes("amount") &&
        h.some((col) => col.includes("running bal"))
      );
    },
    defaultMapping: {
      dateColumn: "Date",
      descriptionColumn: "Description",
      amountColumn: "Amount",
      dateFormat: "MM/DD/YYYY",
      defaultCurrency: "USD",
    },
  },
  {
    id: "MONZO_CSV",
    name: "Monzo Bank Statement CSV",
    description: "Export from Monzo Current Account",
    institution: "Monzo",
    detectHeaders: (headers: string[]) => {
      const h = headers.map((x) => x.trim().toLowerCase());
      return (
        h.includes("transaction id") &&
        h.includes("date") &&
        (h.includes("amount") || (h.includes("money out") && h.includes("money in")))
      );
    },
    defaultMapping: {
      dateColumn: "Date",
      descriptionColumn: "Name",
      amountColumn: "Amount",
      currencyColumn: "Currency",
      categoryColumn: "Category",
      externalIdColumn: "Transaction ID",
      dateFormat: "DD/MM/YYYY",
      defaultCurrency: "GBP",
    },
  },
  {
    id: "REVOLUT_CSV",
    name: "Revolut Statement CSV",
    description: "Multi-currency account statement from Revolut",
    institution: "Revolut",
    detectHeaders: (headers: string[]) => {
      const h = headers.map((x) => x.trim().toLowerCase());
      return (
        (h.includes("started date") || h.includes("completed date")) &&
        h.includes("description") &&
        h.includes("amount") &&
        h.includes("currency")
      );
    },
    defaultMapping: {
      dateColumn: "Completed Date",
      descriptionColumn: "Description",
      amountColumn: "Amount",
      currencyColumn: "Currency",
      dateFormat: "YYYY-MM-DD HH:mm:ss",
      defaultCurrency: "EUR",
    },
  },
  {
    id: "GENERIC_CSV",
    name: "Generic CSV Statement",
    description: "Flexible CSV with automatic column guessing and manual adjustment",
    institution: "Generic",
    detectHeaders: () => true, // Fallback for any CSV
    defaultMapping: {
      dateColumn: "Date",
      descriptionColumn: "Description",
      amountColumn: "Amount",
      dateFormat: "auto",
      defaultCurrency: "USD",
    },
  },
];

export function detectStatementFormat(headers: string[]): StatementFormatSpec {
  for (const format of SUPPORTED_STATEMENT_FORMATS) {
    if (format.id !== "GENERIC_CSV" && format.detectHeaders(headers)) {
      return format;
    }
  }
  return SUPPORTED_STATEMENT_FORMATS[SUPPORTED_STATEMENT_FORMATS.length - 1]; // Generic
}

export function autoSuggestColumnMapping(headers: string[]): ColumnMapping {
  const cleanHeaders = headers.map((h) => h.trim());
  const lower = cleanHeaders.map((h) => h.toLowerCase());

  let dateCol = cleanHeaders[0] || "Date";
  let descCol = cleanHeaders[1] || "Description";
  let amountCol: string | undefined;
  let debitCol: string | undefined;
  let creditCol: string | undefined;
  let currencyCol: string | undefined;
  let categoryCol: string | undefined;
  let externalIdCol: string | undefined;

  // Search date
  const dateIdx = lower.findIndex((h) =>
    h === "date" || h === "posting date" || h === "transaction date" || h === "posted date"
  );
  if (dateIdx !== -1) dateCol = cleanHeaders[dateIdx];

  // Search description
  const descIdx = lower.findIndex((h) =>
    h === "description" || h === "memo" || h === "payee" || h === "name" || h === "details"
  );
  if (descIdx !== -1) descCol = cleanHeaders[descIdx];

  // Search amount / debit / credit
  const debitIdx = lower.findIndex((h) => h === "debit" || h === "money out" || h === "withdrawal");
  const creditIdx = lower.findIndex((h) => h === "credit" || h === "money in" || h === "deposit");

  if (debitIdx !== -1 && creditIdx !== -1) {
    debitCol = cleanHeaders[debitIdx];
    creditCol = cleanHeaders[creditIdx];
  } else {
    const amountIdx = lower.findIndex((h) =>
      h === "amount" || h === "transaction amount" || h === "value"
    );
    if (amountIdx !== -1) {
      amountCol = cleanHeaders[amountIdx];
    } else {
      amountCol = cleanHeaders[2] || "Amount";
    }
  }

  // Currency
  const currIdx = lower.findIndex((h) => h === "currency" || h === "curr");
  if (currIdx !== -1) currencyCol = cleanHeaders[currIdx];

  // Category
  const catIdx = lower.findIndex((h) => h === "category" || h === "tag");
  if (catIdx !== -1) categoryCol = cleanHeaders[catIdx];

  // External ID
  const idIdx = lower.findIndex((h) => h === "transaction id" || h === "id" || h === "reference");
  if (idIdx !== -1) externalIdCol = cleanHeaders[idIdx];

  return {
    dateColumn: dateCol,
    descriptionColumn: descCol,
    amountColumn: amountCol,
    debitColumn: debitCol,
    creditColumn: creditCol,
    currencyColumn: currencyCol,
    categoryColumn: categoryCol,
    externalIdColumn: externalIdCol,
    dateFormat: "auto",
    defaultCurrency: "USD",
  };
}

