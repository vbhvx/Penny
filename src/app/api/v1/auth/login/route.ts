import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { verifyPassword, createSessionToken, getSessionCookieOptions } from "@/lib/auth/session";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/response";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  isDemoLogin: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, isDemoLogin } = loginSchema.parse(body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return errorResponse("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }

    // Verify password (or allow demo shortcut if explicitly matching demo user)
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid && !(isDemoLogin && user.isDemo)) {
      return errorResponse("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }

    // Create session token
    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      defaultCurrency: user.defaultCurrency,
      isDemo: user.isDemo,
    });

    const cookieOpts = getSessionCookieOptions();
    const res = successResponse({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        defaultCurrency: user.defaultCurrency,
        isDemo: user.isDemo,
      },
    });

    res.cookies.set({
      ...cookieOpts,
      value: token,
    });

    return res;
  } catch (err) {
    return handleApiError(err);
  }
}

