export interface CurrencyMeta {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyMeta> = {
  USD: { code: "USD", name: "US Dollar", symbol: "$", decimals: 2 },
  EUR: { code: "EUR", name: "Euro", symbol: "€", decimals: 2 },
  GBP: { code: "GBP", name: "British Pound", symbol: "£", decimals: 2 },
  CAD: { code: "CAD", name: "Canadian Dollar", symbol: "CA$", decimals: 2 },
  AUD: { code: "AUD", name: "Australian Dollar", symbol: "AU$", decimals: 2 },
  JPY: { code: "JPY", name: "Japanese Yen", symbol: "¥", decimals: 0 },
  INR: { code: "INR", name: "Indian Rupee", symbol: "₹", decimals: 2 },
  CHF: { code: "CHF", name: "Swiss Franc", symbol: "CHF", decimals: 2 },
  SGD: { code: "SGD", name: "Singapore Dollar", symbol: "SG$", decimals: 2 },
  HKD: { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", decimals: 2 },
  NZD: { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", decimals: 2 },
  BHD: { code: "BHD", name: "Bahraini Dinar", symbol: "BD", decimals: 3 },
  AED: { code: "AED", name: "UAE Dirham", symbol: "AED", decimals: 2 },
};

export function getCurrencyMeta(code: string): CurrencyMeta {
  const upper = code.toUpperCase();
  if (SUPPORTED_CURRENCIES[upper]) {
    return SUPPORTED_CURRENCIES[upper];
  }
  return {
    code: upper,
    name: upper,
    symbol: upper,
    decimals: 2,
  };
}

