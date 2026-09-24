import prisma from "@/lib/db/prisma";
import { CategorizationSource } from "@prisma/client";

interface KnownMerchantRule {
  merchantRegex: RegExp;
  categorySlug: string;
}

const DEFAULT_MERCHANT_RULES: KnownMerchantRule[] = [
  // Subscriptions
  { merchantRegex: /\b(netflix|spotify|apple\.com\/bill|hulu|disney\+|youtube\s?premium|prime\s?video|audible|patreon|substack|github|dropbox|icloud)\b/i, categorySlug: "subscriptions" },
  // Groceries
  { merchantRegex: /\b(whole\s?foods|trader\s?joe|safeway|kroger|aldi|costco|target|walmart\s?grocer|tesco|sainsbury|carrefour|supermarket|market)\b/i, categorySlug: "groceries" },
  // Restaurants & Dining
  { merchantRegex: /\b(starbucks|mcdonald|chipotle|subway|domino|pizza|burger|cafe|coffee|restaurant|doordash|ubereats|grubhub|deliveroo)\b/i, categorySlug: "restaurants-dining" },
  // Transport
  { merchantRegex: /\b(uber|lyft|shell|chevron|bp|exxon|mobil|gas\s?station|metro|transit|subway|parking|amtrak|train)\b/i, categorySlug: "transport" },
  // Utilities
  { merchantRegex: /\b(coned|pge|electric|power|water|gas\s?bill|internet|verizon|at&t|t-mobile|comcast|xfinity)\b/i, categorySlug: "utilities" },
  // Housing
  { merchantRegex: /\b(rent|mortgage|apartment|landlord|realty|hoa\s?fee)\b/i, categorySlug: "housing" },
  // Healthcare
  { merchantRegex: /\b(cvs|walgreens|pharmacy|hospital|clinic|doctor|dental|optometry|quest\s?diag)\b/i, categorySlug: "healthcare" },
  // Shopping
  { merchantRegex: /\b(amazon|best\s?buy|ikea|zara|h&m|nordstrom|apple\s?store|clothing|retail)\b/i, categorySlug: "shopping" },
  // Travel
  { merchantRegex: /\b(airbnb|delta|united|american\s?airlines|marriott|hilton|hotel|booking\.com|expedia|flight)\b/i, categorySlug: "travel" },
  // Entertainment
  { merchantRegex: /\b(amc|cinema|theatre|steam|playstation|xbox|nintendo|ticketmaster|concert)\b/i, categorySlug: "entertainment" },
  // Income
  { merchantRegex: /\b(payroll|salary|direct\s?deposit|stripe\s?payout|employer|dividend|interest\s?paid)\b/i, categorySlug: "income" },
  // Transfers
  { merchantRegex: /\b(transfer|wire|venmo|zelle|cash\s?app|autopay\s?payment|cc\s?payment)\b/i, categorySlug: "transfers" },
  // Fees
  { merchantRegex: /\b(overdraft|monthly\s?maintenance\s?fee|atm\s?fee|late\s?fee|wire\s?fee)\b/i, categorySlug: "fees-interest" },
];

export interface CategorizationResult {
  categoryId: string | null;
  categorySlug: string | null;
  source: CategorizationSource;
  needsReview: boolean;
  confidence: number;
}

export async function categorizeTransaction(
  userId: string,
  rawDescription: string,
  normalizedMerchant?: string | null,
  amount?: number
): Promise<CategorizationResult> {
  const textToMatch = `${normalizedMerchant || ""} ${rawDescription}`.trim();

  // 1. Stage 1A: Check user-defined custom rules
  const userRules = await prisma.categorizationRule.findMany({
    where: { userId },
    include: { category: true },
    orderBy: { priority: "desc" },
  });

  for (const rule of userRules) {
    try {
      const regex = new RegExp(rule.merchantPattern, "i");
      if (regex.test(textToMatch)) {
        return {
          categoryId: rule.categoryId,
          categorySlug: rule.category.slug,
          source: CategorizationSource.RULE,
          needsReview: false,
          confidence: 0.98,
        };
      }
    } catch {
      // Ignore invalid regex in user rule
    }
  }

  // 2. Stage 1B: Check past user corrections (merchant history)
  if (normalizedMerchant) {
    const pastCorrection = await prisma.transaction.findFirst({
      where: {
        userId,
        normalizedMerchant: { equals: normalizedMerchant, mode: "insensitive" },
        categorizationSource: CategorizationSource.USER,
        categoryId: { not: null },
      },
      include: { category: true },
      orderBy: { updatedAt: "desc" },
    });

    if (pastCorrection && pastCorrection.categoryId && pastCorrection.category) {
      return {
        categoryId: pastCorrection.categoryId,
        categorySlug: pastCorrection.category.slug,
        source: CategorizationSource.RULE,
        needsReview: false,
        confidence: 0.95,
      };
    }
  }

  // 3. Stage 1C: System Default Merchant Rules
  for (const rule of DEFAULT_MERCHANT_RULES) {
    if (rule.merchantRegex.test(textToMatch)) {
      const category = await prisma.transactionCategory.findFirst({
        where: { slug: rule.categorySlug, isSystem: true },
      });
      if (category) {
        return {
          categoryId: category.id,
          categorySlug: category.slug,
          source: CategorizationSource.RULE,
          needsReview: false,
          confidence: 0.85,
        };
      }
    }
  }

  // Fallback if positive amount and mentions deposit/refund
  if (amount && amount > 0) {
    if (/refund|return|reversal/i.test(textToMatch)) {
      const refundCat = await prisma.transactionCategory.findFirst({
        where: { slug: "refunds", isSystem: true },
      });
      if (refundCat) {
        return {
          categoryId: refundCat.id,
          categorySlug: refundCat.slug,
          source: CategorizationSource.RULE,
          needsReview: false,
          confidence: 0.8,
        };
      }
    }

    const incomeCat = await prisma.transactionCategory.findFirst({
      where: { slug: "income", isSystem: true },
    });
    if (incomeCat) {
      return {
        categoryId: incomeCat.id,
        categorySlug: incomeCat.slug,
        source: CategorizationSource.DEFAULT,
        needsReview: true,
        confidence: 0.6,
      };
    }
  }

  // Fallback: Assign "Other" with needsReview = true
  const otherCat = await prisma.transactionCategory.findFirst({
    where: { slug: "other", isSystem: true },
  });

  return {
    categoryId: otherCat ? otherCat.id : null,
    categorySlug: otherCat ? otherCat.slug : null,
    source: CategorizationSource.DEFAULT,
    needsReview: true,
    confidence: 0.3,
  };
}

