import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { AssistantService } from "@/modules/assistant/service";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/response";
import { z } from "zod";

const messageSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session?.userId) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

    const body = await req.json();
    const { message } = messageSchema.parse(body);

    const response = await AssistantService.ask(session.userId, message);
    return successResponse(response);
  } catch (err) {
    return handleApiError(err);
  }
}

