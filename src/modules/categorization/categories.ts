import prisma from "@/lib/db/prisma";
import { CategoryType } from "@prisma/client";

export interface DefaultCategoryDef {
  name: string;
  slug: string;
  type: CategoryType;
  icon: string;
  color: string;
}

export const SYSTEM_CATEGORIES: DefaultCategoryDef[] = [
  { name: "Housing", slug: "housing", type: "EXPENSE", icon: "Home", color: "#6366f1" },
  { name: "Groceries", slug: "groceries", type: "EXPENSE", icon: "ShoppingCart", color: "#10b981" },
  { name: "Restaurants & Dining", slug: "restaurants-dining", type: "EXPENSE", icon: "Utensils", color: "#f59e0b" },
  { name: "Transport", slug: "transport", type: "EXPENSE", icon: "Car", color: "#3b82f6" },
  { name: "Utilities", slug: "utilities", type: "EXPENSE", icon: "Zap", color: "#8b5cf6" },
  { name: "Healthcare", slug: "healthcare", type: "EXPENSE", icon: "HeartPulse", color: "#ec4899" },
  { name: "Shopping", slug: "shopping", type: "EXPENSE", icon: "ShoppingBag", color: "#14b8a6" },
  { name: "Entertainment", slug: "entertainment", type: "EXPENSE", icon: "Film", color: "#f43f5e" },
  { name: "Travel", slug: "travel", type: "EXPENSE", icon: "Plane", color: "#06b6d4" },
  { name: "Education", slug: "education", type: "EXPENSE", icon: "GraduationCap", color: "#84cc16" },
  { name: "Insurance", slug: "insurance", type: "EXPENSE", icon: "ShieldCheck", color: "#64748b" },
  { name: "Subscriptions", slug: "subscriptions", type: "EXPENSE", icon: "Repeat", color: "#a855f7" },
  { name: "Income", slug: "income", type: "INCOME", icon: "Wallet", color: "#22c55e" },
  { name: "Transfers", slug: "transfers", type: "TRANSFER", icon: "ArrowLeftRight", color: "#94a3b8" },
  { name: "Fees & Interest", slug: "fees-interest", type: "EXPENSE", icon: "Receipt", color: "#ef4444" },
  { name: "Refunds", slug: "refunds", type: "INCOME", icon: "RotateCcw", color: "#0ea5e9" },
  { name: "Other", slug: "other", type: "EXPENSE", icon: "HelpCircle", color: "#6b7280" },
];

export async function ensureSystemCategories(): Promise<void> {
  for (const cat of SYSTEM_CATEGORIES) {
    const existing = await prisma.transactionCategory.findFirst({
      where: {
        userId: null,
        slug: cat.slug,
      },
    });

    if (!existing) {
      await prisma.transactionCategory.create({
        data: {
          name: cat.name,
          slug: cat.slug,
          type: cat.type,
          icon: cat.icon,
          color: cat.color,
          isSystem: true,
          userId: null,
        },
      });
    }
  }
}

export async function getUserCategories(userId: string) {
  await ensureSystemCategories();
  return prisma.transactionCategory.findMany({
    where: {
      OR: [{ userId: null }, { userId }],
    },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });
}

