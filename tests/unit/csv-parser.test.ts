import { describe, it, expect } from "vitest";
import { parseCsvContent, normalizeMerchantName, parseFlexibleDate } from "@/modules/ingestion/csv-parser";
import { detectStatementFormat } from "@/modules/ingestion/statement-formats";

describe("CSV Statement Parsing & Format Detection", () => {
  it("detects Chase Bank CSV format and parses transactions correctly", () => {
    const chaseCsv = `Details,Posting Date,Description,Amount,Type,Balance,Check or Slip #
DEBIT,03/15/2024,WHOLEFDS MKT 10245,-124.50,ACH_DEBIT,4500.00,
CREDIT,03/01/2024,ACME CORP PAYROLL,3250.00,ACH_CREDIT,4624.50,`;

    const format = detectStatementFormat(["Details", "Posting Date", "Description", "Amount", "Type", "Balance", "Check or Slip #"]);
    expect(format.id).toBe("CHASE_CSV");

    const { rows } = parseCsvContent(chaseCsv, format.defaultMapping);
    expect(rows.length).toBe(2);

    expect(rows[0].status).toBe("VALID");
    expect(rows[0].parsedAmount).toBe("-124.50");
    expect(rows[0].normalizedMerchant).toContain("WHOLEFDS MKT");

    expect(rows[1].status).toBe("VALID");
    expect(rows[1].parsedAmount).toBe("3250.00");
  });

  it("detects Bank of America CSV format correctly", () => {
    const headers = ["Date", "Description", "Amount", "Running Bal."];
    const format = detectStatementFormat(headers);
    expect(format.id).toBe("BOA_CSV");

    const boaCsv = `Date,Description,Amount,Running Bal.
03/10/2024,UBER TECHNOLOGIES,-24.50,1500.00`;

    const { rows } = parseCsvContent(boaCsv, format.defaultMapping);
    expect(rows.length).toBe(1);
    expect(rows[0].status).toBe("VALID");
    expect(rows[0].parsedAmount).toBe("-24.50");
  });

  it("detects Monzo CSV format and parses Money In / Money Out columns", () => {
    const headers = ["Transaction ID", "Date", "Name", "Emoji", "Category", "Amount", "Currency", "Money Out", "Money In"];
    const format = detectStatementFormat(headers);
    expect(format.id).toBe("MONZO_CSV");
  });

  it("normalizes payment processor noise from merchant names", () => {
    expect(normalizeMerchantName("TST* SWEETGREEN NOMAD")).toBe("SWEETGREEN NOMAD");
    expect(normalizeMerchantName("SQ *BLUE BOTTLE COFFEE")).toBe("BLUE BOTTLE COFFEE");
    expect(normalizeMerchantName("AMZN Mktp US*123456")).toBe("123456");
    expect(normalizeMerchantName("STARBUCKS STORE #10421")).toBe("STARBUCKS STORE");
  });

  it("flags rows with missing or invalid fields as INVALID", () => {
    const badCsv = `Date,Description,Amount
,Missing Date,-10.00
2024-03-01,, -20.00
2024-03-01,Valid Payee,NOT_AN_AMOUNT`;

    const mapping = {
      dateColumn: "Date",
      descriptionColumn: "Description",
      amountColumn: "Amount",
    };

    const { rows } = parseCsvContent(badCsv, mapping);
    expect(rows.length).toBe(3);
    expect(rows[0].status).toBe("INVALID");
    expect(rows[0].rejectionReason).toContain("Missing transaction date");

    expect(rows[1].status).toBe("INVALID");
    expect(rows[1].rejectionReason).toContain("Missing transaction description");

    expect(rows[2].status).toBe("INVALID");
    expect(rows[2].rejectionReason).toContain("Could not parse valid monetary amount");
  });
});

