import prisma from "@/lib/db/prisma";
import Decimal from "decimal.js";
import { Money } from "@/lib/financial/money";

export interface ConversionResult {
  convertedAmount: Decimal;
  rate: Decimal;
  provider: string;
  isExact: boolean;
  rateMissing?: boolean;
}

// Baseline verifiable exchange rates (relative to USD = 1.0)
const BASELINE_USD_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.36,
  AUD: 1.52,
  JPY: 154.5,
  INR: 84.4,
  CHF: 0.88,
  SGD: 1.34,
  HKD: 7.78,
  NZD: 1.68,
  BHD: 0.376,
  AED: 3.67,
};

export class CurrencyService {
  /**
   * Seed baseline exchange rates into the database if not present
   */
  public static async ensureBaselineRates(): Promise<void> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    for (const [quote, usdRate] of Object.entries(BASELINE_USD_RATES)) {
      if (quote === "USD") continue;

      const existing = await prisma.exchangeRateObservation.findFirst({
        where: {
          baseCurrency: "USD",
          quoteCurrency: quote,
          effectiveDate: today,
        },
      });

      if (!existing) {
        await prisma.exchangeRateObservation.create({
          data: {
            baseCurrency: "USD",
            quoteCurrency: quote,
            rate: new Decimal(usdRate),
            effectiveDate: today,
            provider: "SYSTEM_BASELINE",
            rateType: "DAILY_CLOSE",
          },
        });

        // Also create inverse rate: QUOTE -> USD
        const inverseRate = new Decimal(1).dividedBy(usdRate);
        await prisma.exchangeRateObservation.create({
          data: {
            baseCurrency: quote,
            quoteCurrency: "USD",
            rate: inverseRate,
            effectiveDate: today,
            provider: "SYSTEM_BASELINE",
            rateType: "DAILY_CLOSE",
          },
        });
      }
    }
  }

  /**
   * Convert an amount between two currencies using verified observations
   */
  public static async convert(
    amount: Decimal,
    fromCurrency: string,
    toCurrency: string,
    effectiveDate = new Date()
  ): Promise<ConversionResult> {
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    if (from === to) {
      return {
        convertedAmount: amount,
        rate: new Decimal(1),
        provider: "IDENTITY",
        isExact: true,
      };
    }

    // Look for direct observation in DB
    const directObservation = await prisma.exchangeRateObservation.findFirst({
      where: {
        baseCurrency: from,
        quoteCurrency: to,
        effectiveDate: { lte: effectiveDate },
      },
      orderBy: { effectiveDate: "desc" },
    });

    if (directObservation) {
      const converted = amount.times(directObservation.rate);
      return {
        convertedAmount: converted,
        rate: directObservation.rate,
        provider: directObservation.provider,
        isExact: true,
      };
    }

    // Look for inverse observation
    const inverseObservation = await prisma.exchangeRateObservation.findFirst({
      where: {
        baseCurrency: to,
        quoteCurrency: from,
        effectiveDate: { lte: effectiveDate },
      },
      orderBy: { effectiveDate: "desc" },
    });

    if (inverseObservation && !inverseObservation.rate.isZero()) {
      const rate = new Decimal(1).dividedBy(inverseObservation.rate);
      const converted = amount.times(rate);
      return {
        convertedAmount: converted,
        rate,
        provider: `${inverseObservation.provider}_INVERSE`,
        isExact: true,
      };
    }

    // Cross-rate via USD
    const fromToUsdRate = BASELINE_USD_RATES[from]
      ? new Decimal(1).dividedBy(BASELINE_USD_RATES[from])
      : null;
    const usdToTargetRate = BASELINE_USD_RATES[to]
      ? new Decimal(BASELINE_USD_RATES[to])
      : null;

    if (fromToUsdRate && usdToTargetRate) {
      const crossRate = fromToUsdRate.times(usdToTargetRate);
      const converted = amount.times(crossRate);
      return {
        convertedAmount: converted,
        rate: crossRate,
        provider: "BASELINE_CROSS_USD",
        isExact: false,
      };
    }

    // Rate unavailable: Return unconverted and mark as missing
    return {
      convertedAmount: amount,
      rate: new Decimal(1),
      provider: "UNAVAILABLE",
      isExact: false,
      rateMissing: true,
    };
  }
}

