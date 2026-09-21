import Decimal from "decimal.js";
import { getCurrencyMeta } from "./currencies";

// Configure Decimal.js for financial precision
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export class Money {
  public readonly amount: Decimal;
  public readonly currency: string;

  constructor(amount: Decimal.Value, currency = "USD") {
    this.amount = new Decimal(amount);
    this.currency = currency.toUpperCase();
  }

  public static zero(currency = "USD"): Money {
    return new Money(0, currency);
  }

  public add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amount.plus(other.amount), this.currency);
  }

  public sub(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amount.minus(other.amount), this.currency);
  }

  public mul(factor: Decimal.Value): Money {
    return new Money(this.amount.times(factor), this.currency);
  }

  public div(divisor: Decimal.Value): Money {
    return new Money(this.amount.dividedBy(divisor), this.currency);
  }

  public abs(): Money {
    return new Money(this.amount.abs(), this.currency);
  }

  public negate(): Money {
    return new Money(this.amount.negated(), this.currency);
  }

  public isZero(): boolean {
    return this.amount.isZero();
  }

  public isPositive(): boolean {
    return this.amount.isPositive() && !this.amount.isZero();
  }

  public isNegative(): boolean {
    return this.amount.isNegative() && !this.amount.isZero();
  }

  public isExpense(): boolean {
    return this.isNegative();
  }

  public isIncome(): boolean {
    return this.isPositive();
  }

  public toDecimal(): Decimal {
    return this.amount;
  }

  public toNumber(): number {
    return this.amount.toNumber();
  }

  public toFixed(): string {
    const meta = getCurrencyMeta(this.currency);
    return this.amount.toFixed(meta.decimals);
  }

  public format(locale = "en-US", options?: { showSign?: boolean }): string {
    const meta = getCurrencyMeta(this.currency);
    const num = this.amount.toNumber();
    
    // Format using Intl.NumberFormat for locale-correct formatting
    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: this.currency,
      minimumFractionDigits: meta.decimals,
      maximumFractionDigits: meta.decimals,
    });

    if (options?.showSign && num > 0) {
      return `+${formatter.format(num)}`;
    }
    return formatter.format(num);
  }

  /**
   * Minor units (e.g., cents for USD, yen for JPY)
   */
  public toMinorUnits(): bigint {
    const meta = getCurrencyMeta(this.currency);
    const factor = new Decimal(10).pow(meta.decimals);
    return BigInt(this.amount.times(factor).round().toString());
  }

  public static fromMinorUnits(minorUnits: bigint | number | string, currency = "USD"): Money {
    const meta = getCurrencyMeta(currency);
    const factor = new Decimal(10).pow(meta.decimals);
    const amount = new Decimal(minorUnits.toString()).dividedBy(factor);
    return new Money(amount, currency);
  }

  private assertSameCurrency(other: Money) {
    if (this.currency !== other.currency) {
      throw new Error(
        `Cannot combine different currencies directly without conversion: ${this.currency} vs ${other.currency}`
      );
    }
  }
}

/**
 * Robust string parser for financial amounts from CSVs and bank statements.
 * Handles:
 * - Currency symbols: "$", "€", "£", "USD", etc.
 * - Thousands separators: "1,234.56" or "1.234,56"
 * - Negative representations: "-123.45", "(123.45)", "123.45-", "CR/DR"
 * - Explicit isDebit flag where provided by statement column
 */
export function parseFinancialAmount(
  raw: string | number,
  defaultCurrency = "USD",
  isDebit?: boolean
): Money {
  if (typeof raw === "number") {
    let dec = new Decimal(raw);
    if (isDebit !== undefined) {
      dec = isDebit ? dec.abs().negated() : dec.abs();
    }
    return new Money(dec, defaultCurrency);
  }

  let str = (raw || "").trim();
  if (!str) {
    return Money.zero(defaultCurrency);
  }

  let isNegative = false;
  let detectedCurrency = defaultCurrency;

  // Check currency symbols
  if (str.includes("$")) detectedCurrency = "USD";
  else if (str.includes("€")) detectedCurrency = "EUR";
  else if (str.includes("£")) detectedCurrency = "GBP";
  else if (str.includes("¥")) detectedCurrency = "JPY";
  else if (str.includes("₹")) detectedCurrency = "INR";

  // Check for accounting parentheses: (123.45)
  if (str.startsWith("(") && str.endsWith(")")) {
    isNegative = true;
    str = str.substring(1, str.length - 1).trim();
  } else if (str.startsWith("-") || str.endsWith("-")) {
    isNegative = true;
    str = str.replace(/-/g, "").trim();
  }

  // Check for debit / credit suffixes
  if (/\bDR\b/i.test(str)) {
    isNegative = true;
    str = str.replace(/\bDR\b/i, "").trim();
  } else if (/\bCR\b/i.test(str)) {
    str = str.replace(/\bCR\b/i, "").trim();
  }

  // Strip currency symbols and whitespace
  str = str.replace(/[^0-9,.-]/g, "").trim();

  // Handle decimal separators and thousand separators
  // e.g., "1,234.56" vs "1.234,56"
  if (str.includes(",") && str.includes(".")) {
    const lastComma = str.lastIndexOf(",");
    const lastDot = str.lastIndexOf(".");
    if (lastComma > lastDot) {
      // European format: 1.234,56 -> 1234.56
      str = str.replace(/\./g, "").replace(",", ".");
    } else {
      // US format: 1,234.56 -> 1234.56
      str = str.replace(/,/g, "");
    }
  } else if (str.includes(",")) {
    const parts = str.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
      // Likely decimal comma: "123,45" -> "123.45"
      str = str.replace(",", ".");
    } else {
      // Thousands comma: "1,000" -> "1000"
      str = str.replace(/,/g, "");
    }
  }

  if (!str || isNaN(Number(str))) {
    return Money.zero(detectedCurrency);
  }

  let finalAmount = new Decimal(str);
  if (isNegative) {
    finalAmount = finalAmount.negated();
  }

  // If explicit column isDebit was passed:
  if (isDebit !== undefined) {
    finalAmount = isDebit ? finalAmount.abs().negated() : finalAmount.abs();
  }

  return new Money(finalAmount, detectedCurrency);
}

