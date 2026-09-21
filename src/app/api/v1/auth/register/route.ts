import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
import { hashPassword, createSessionToken, getSessionCookieOptions } from "@/lib/auth/session";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/response";
import { AccountType, AccountSourceType } from "@prisma/client";
import { ensureSystemCategories } from "@/modules/categorization/categories";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  defaultCurrency: z.string().length(3).default("USD"),
  timezone: z.string().default("UTC"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      return errorResponse("An account with this email already exists", 409, "EMAIL_EXISTS");
    }

    const passwordHash = await hashPassword(data.password);
    await ensureSystemCategories();

    // Create user and initial accounts
    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        name: data.name,
        passwordHash,
        defaultCurrency: data.defaultCurrency.toUpperCase(),
        timezone: data.timezone,
        isDemo: false,
        accounts: {
          create: [
            {
              name: "Primary Checking",
              type: AccountType.CHECKING,
              currency: data.defaultCurrency.toUpperCase(),
              sourceType: AccountSourceType.MANUAL,
            },
            {
              name: "Cash Wallet",
              type: AccountType.CASH,
              currency: data.defaultCurrency.toUpperCase(),
              sourceType: AccountSourceType.MANUAL,
            },
          ],
        },
      },
    });

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      defaultCurrency: user.defaultCurrency,
      isDemo: false,
    });

    const cookieOpts = getSessionCookieOptions();
    const res = successResponse(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          defaultCurrency: user.defaultCurrency,
          isDemo: false,
        },
      },
      201
    );

    res.cookies.set({
      ...cookieOpts,
      value: token,
    });

    return res;
  } catch (err) {
    return handleApiError(err);
  }
}

