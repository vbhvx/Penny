import { describe, it, expect } from "vitest";
import { Money, parseFinancialAmount } from "@/lib/financial/money";
import Decimal from "decimal.js";

describe("Financial Arithmetic & Money Precision", () => {
  it("never loses precision with classic floating point drift (0.1 + 0.2)", () => {
    // In IEEE 754 float: 0.1 + 0.2 === 0.30000000000000004
    const m1 = new Money("0.1", "USD");
    const m2 = new Money("0.2", "USD");
    const sum = m1.add(m2);

    expect(sum.amount.toString()).toBe("0.3");
    expect(sum.toFixed()).toBe("0.30");
  });

  it("handles multi-currency precision correctly (JPY 0 decimals, BHD 3 decimals, USD 2 decimals)", () => {
    const usd = new Money("123.456", "USD");
    expect(usd.toFixed()).toBe("123.46"); // rounded to 2 decimals

    const jpy = new Money("1500.8", "JPY");
    expect(jpy.toFixed()).toBe("1501"); // 0 decimals

    const bhd = new Money("10.1234", "BHD");
    expect(bhd.toFixed()).toBe("10.123"); // 3 decimals
  });

  it("converts to and from minor units exactly", () => {
    const usd = new Money("49.99", "USD");
    expect(usd.toMinorUnits()).toBe(4999n);

    const fromCents = Money.fromMinorUnits(4999n, "USD");
    expect(fromCents.toFixed()).toBe("49.99");

    const jpy = new Money("2500", "JPY");
    expect(jpy.toMinorUnits()).toBe(2500n);
  });

  it("throws error when attempting to add different currencies directly without conversion", () => {
    const usd = new Money("100", "USD");
    const eur = new Money("100", "EUR");

    expect(() => usd.add(eur)).toThrow(
      "Cannot combine different currencies directly without conversion: USD vs EUR"
    );
  });

  it("correctly parses diverse financial string formats from statements", () => {
    // US formatted
    expect(parseFinancialAmount("1,234.56", "USD").toFixed()).toBe("1234.56");
    // Accounting parentheses for negative expense
    expect(parseFinancialAmount("(150.25)", "USD").toFixed()).toBe("-150.25");
    // Explicit negative sign
    expect(parseFinancialAmount("-45.00", "USD").toFixed()).toBe("-45.00");
    // European formatted
    expect(parseFinancialAmount("1.234,56", "EUR").toFixed()).toBe("1234.56");
    // DR suffix
    expect(parseFinancialAmount("75.00 DR", "GBP").toFixed()).toBe("-75.00");
    // With currency symbol
    expect(parseFinancialAmount("$54.99", "USD").toFixed()).toBe("54.99");
  });

  it("correctly applies isDebit flag when separated into debit/credit columns", () => {
    const debit = parseFinancialAmount("85.00", "USD", true);
    expect(debit.isExpense()).toBe(true);
    expect(debit.toFixed()).toBe("-85.00");

    const credit = parseFinancialAmount("3000.00", "USD", false);
    expect(credit.isIncome()).toBe(true);
    expect(credit.toFixed()).toBe("3000.00");
  });
});

