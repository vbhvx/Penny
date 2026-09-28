import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { IngestionService } from "@/modules/ingestion/service";
import { successResponse, errorResponse, handleApiError } from "@/lib/api/response";
import { z } from "zod";

const previewJsonSchema = z.object({
  accountId: z.string().min(1, "Account ID is required"),
  fileName: z.string().min(1, "File name is required"),
  fileContent: z.string().min(1, "File content is required"),
  customMapping: z
    .object({
      dateColumn: z.string().optional(),
      descriptionColumn: z.string().optional(),
      amountColumn: z.string().optional(),
      debitColumn: z.string().optional(),
      creditColumn: z.string().optional(),
      currencyColumn: z.string().optional(),
      categoryColumn: z.string().optional(),
      externalIdColumn: z.string().optional(),
      dateFormat: z.string().optional(),
      defaultCurrency: z.string().optional(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session?.userId) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

    const contentType = req.headers.get("content-type") || "";

    let accountId = "";
    let fileName = "";
    let fileContent = "";
    let customMapping: unknown = undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      accountId = (formData.get("accountId") as string) || "";
      const mappingStr = formData.get("customMapping") as string | null;

      if (!file) {
        return errorResponse("No file provided in form data", 400);
      }

      fileName = file.name;
      fileContent = await file.text();
      if (mappingStr) {
        try {
          customMapping = JSON.parse(mappingStr);
        } catch {}
      }
    } else {
      const body = await req.json();
      const parsed = previewJsonSchema.parse(body);
      accountId = parsed.accountId;
      fileName = parsed.fileName;
      fileContent = parsed.fileContent;
      customMapping = parsed.customMapping;
    }

    if (!accountId) {
      return errorResponse("Target account is required", 400);
    }

    const preview = await IngestionService.previewImport(
      session.userId,
      accountId,
      fileName,
      fileContent,
      customMapping as any
    );

    return successResponse(preview);
  } catch (err) {
    return handleApiError(err);
  }
}

