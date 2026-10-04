import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, getSessionCookieOptions } from "@/lib/auth/session";
import { PrivacyService } from "@/modules/privacy/service";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/response";
import { z } from "zod";

const deleteSchema = z.object({
  confirmation: z.literal("DELETE MY DATA"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session?.userId) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

    const body = await req.json();
    deleteSchema.parse(body);

    await PrivacyService.deleteUserData(session.userId);

    const cookieOpts = getSessionCookieOptions();
    const res = successResponse({
      message: "Workspace and all associated financial records permanently deleted",
    });

    res.cookies.set({
      ...cookieOpts,
      value: "",
      maxAge: 0,
    });

    return res;
  } catch (err) {
    return handleApiError(err);
  }
}

