import Papa from "papaparse";
import { parseFinancialAmount } from "@/lib/financial/money";
import { ColumnMapping, ParsedRow } from "./types";
import { RowValidationStatus } from "@prisma/client";

export function normalizeMerchantName(raw: string): string {
  let cleaned = (raw || "").trim();

  // Remove common payment prefixes (Square, Toast, Stripe, PayPal)
  cleaned = cleaned.replace(/^(tst\*|sq\s*\*|paypal\s*\*|pypl\s*\*|sp\s*\*|amzn\s*mktp\s*us\*|amzn\.com\/bill\*)/i, "");
  // Remove terminal transaction IDs e.g. #12345, *1234
  cleaned = cleaned.replace(/[\*#]\S+$/g, "");
  // Remove trailing city/state codes e.g. "SAN FRANCISCO CA", "NEW YORK NY"
  cleaned = cleaned.replace(/\s+[A-Z]{2}\s+(USA|US)$/i, "");
  // Remove common card purchase noise
  cleaned = cleaned.replace(/\b(pos debit|checkcard|purchase|debit purchase|recurring)\b/gi, "");
  // Collapse whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned.length > 0 ? cleaned : raw.trim();
}

export function parseFlexibleDate(dateStr: string, formatHint?: string): Date | null {
  if (!dateStr) return null;
  const str = dateStr.trim();

  // Try standard ISO or ISO-like: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d;
  }

  // Try MM/DD/YYYY or DD/MM/YYYY
  const slashParts = str.split(/[/.-]/);
  if (slashParts.length >= 3) {
    const p1 = parseInt(slashParts[0], 10);
    const p2 = parseInt(slashParts[1], 10);
    const p3 = parseInt(slashParts[2], 10);

    if (p1 > 0 && p2 > 0 && p3 > 0) {
      // Determine year
      let year = p3;
      if (year < 100) year += 2000;

      if (formatHint === "DD/MM/YYYY" || (p1 > 12 && p2 <= 12)) {
        // DD/MM/YYYY
        const d = new Date(year, p2 - 1, p1);
        if (!isNaN(d.getTime())) return d;
      } else {
        // MM/DD/YYYY
        const d = new Date(year, p1 - 1, p2);
        if (!isNaN(d.getTime())) return d;
      }
    }
  }

  const fallback = new Date(str);
  if (!isNaN(fallback.getTime())) return fallback;

  return null;
}

export function parseCsvContent(
  csvString: string,
  mapping: ColumnMapping
): { rows: ParsedRow[]; errors: string[] } {
  const result = Papa.parse<Record<string, string>>(csvString, {
    header: true,
    skipEmptyLines: "greedy",
  });

  const parsedRows: ParsedRow[] = [];
  const errors: string[] = [];

  result.data.forEach((row, index) => {
    const rawDate = row[mapping.dateColumn];
    const rawDesc = row[mapping.descriptionColumn];
    let rawAmount = mapping.amountColumn ? row[mapping.amountColumn] : "";
    const rawDebit = mapping.debitColumn ? row[mapping.debitColumn] : "";
    const rawCredit = mapping.creditColumn ? row[mapping.creditColumn] : "";
    const rawCurr = mapping.currencyColumn ? row[mapping.currencyColumn] : mapping.defaultCurrency || "USD";
    const externalId = mapping.externalIdColumn ? row[mapping.externalIdColumn]?.trim() : undefined;

    let isDebit: boolean | undefined = undefined;

    // Check if separate debit / credit columns are used
    if (mapping.debitColumn && mapping.creditColumn) {
      if (rawDebit && rawDebit.trim() !== "") {
        rawAmount = rawDebit;
        isDebit = true;
      } else if (rawCredit && rawCredit.trim() !== "") {
        rawAmount = rawCredit;
        isDebit = false;
      }
    }

    // Validation checks
    if (!rawDate || rawDate.trim() === "") {
      parsedRows.push({
        rowIndex: index + 1,
        rawValues: row,
        status: RowValidationStatus.INVALID,
        rejectionReason: `Row ${index + 1}: Missing transaction date in column "${mapping.dateColumn}"`,
      });
      return;
    }

    const parsedDate = parseFlexibleDate(rawDate, mapping.dateFormat);
    if (!parsedDate) {
      parsedRows.push({
        rowIndex: index + 1,
        rawValues: row,
        status: RowValidationStatus.INVALID,
        rejectionReason: `Row ${index + 1}: Invalid date format "${rawDate}"`,
      });
      return;
    }

    if (!rawDesc || rawDesc.trim() === "") {
      parsedRows.push({
        rowIndex: index + 1,
        rawValues: row,
        status: RowValidationStatus.INVALID,
        rejectionReason: `Row ${index + 1}: Missing transaction description`,
      });
      return;
    }

    if (!rawAmount || rawAmount.trim() === "") {
      parsedRows.push({
        rowIndex: index + 1,
        rawValues: row,
        status: RowValidationStatus.INVALID,
        rejectionReason: `Row ${index + 1}: Missing monetary amount`,
      });
      return;
    }

    const money = parseFinancialAmount(rawAmount, rawCurr, isDebit);
    if (money.isZero() && !rawAmount.includes("0")) {
      parsedRows.push({
        rowIndex: index + 1,
        rawValues: row,
        status: RowValidationStatus.INVALID,
        rejectionReason: `Row ${index + 1}: Could not parse valid monetary amount from "${rawAmount}"`,
      });
      return;
    }

    const normalizedMerchant = normalizeMerchantName(rawDesc);

    parsedRows.push({
      rowIndex: index + 1,
      rawValues: row,
      status: RowValidationStatus.VALID,
      parsedDate,
      parsedDescription: rawDesc.trim(),
      normalizedMerchant,
      parsedAmount: money.toFixed(),
      parsedCurrency: money.currency,
      externalId,
    });
  });

  return { rows: parsedRows, errors };
}

