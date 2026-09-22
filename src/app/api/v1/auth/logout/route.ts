import { NextResponse } from "next/server";
import { getSessionCookieOptions } from "@/lib/auth/session";
import { successResponse } from "@/lib/api/response";

export async function POST() {
  const cookieOpts = getSessionCookieOptions();
  const res = successResponse({ message: "Successfully logged out" });

  res.cookies.set({
    ...cookieOpts,
    value: "",
    maxAge: 0,
  });

  return res;
}

