import prisma from "@/lib/db/prisma";
import { ImportStatus, RowValidationStatus, TransactionSourceType, TransactionType, TransactionStatus } from "@prisma/client";
import { computeFileHash, checkDuplicate, generateContentHash } from "./deduplication";
import { parseCsvContent } from "./csv-parser";
import { detectStatementFormat, autoSuggestColumnMapping } from "./statement-formats";
import { ColumnMapping, IngestionPreviewResult } from "./types";
import { categorizeTransaction } from "@/modules/categorization/engine";
import Papa from "papaparse";
import Decimal from "decimal.js";

export class IngestionService {
  /**
   * Preview a statement upload before committing transactions
   */
  public static async previewImport(
    userId: string,
    accountId: string,
    fileName: string,
    fileContent: string,
    customMapping?: Partial<ColumnMapping>
  ): Promise<IngestionPreviewResult> {
    const fileHash = computeFileHash(fileContent);

    // Check if this exact file was previously imported and committed
    const existingCommittedBatch = await prisma.importBatch.findFirst({
      where: {
        userId,
        fileHash,
        status: ImportStatus.COMMITTED,
      },
    });

    // Detect format and headers
    const sample = Papa.parse<Record<string, string>>(fileContent, {
      preview: 5,
      header: true,
      skipEmptyLines: "greedy",
    });

    const headers = sample.meta.fields || [];
    const detectedFormat = detectStatementFormat(headers);
    const suggestedMapping: ColumnMapping = {
      ...autoSuggestColumnMapping(headers),
      ...detectedFormat.defaultMapping,
      ...customMapping,
    };

    // Parse all rows
    const { rows } = parseCsvContent(fileContent, suggestedMapping);

    // Deduplication check for each row
    const currencies: Record<string, number> = {};
    let minDate: Date | undefined;
    let maxDate: Date | undefined;
    let acceptedRows = 0;
    let invalidRows = 0;
    let duplicateRows = 0;

    for (const row of rows) {
      if (row.status === RowValidationStatus.INVALID || !row.parsedDate || !row.parsedAmount) {
        invalidRows++;
        continue;
      }

      const curr = row.parsedCurrency || "USD";
      currencies[curr] = (currencies[curr] || 0) + 1;

      if (!minDate || row.parsedDate < minDate) minDate = row.parsedDate;
      if (!maxDate || row.parsedDate > maxDate) maxDate = row.parsedDate;

      // Check duplicates against database
      const dupCheck = await checkDuplicate(
        userId,
        accountId,
        row.parsedDate,
        row.parsedAmount,
        row.parsedDescription || "",
        row.externalId
      );

      if (dupCheck.status !== RowValidationStatus.VALID) {
        row.status = dupCheck.status;
        row.rejectionReason = dupCheck.reason;
        row.duplicateOfTransactionId = dupCheck.matchedTransactionId;
        row.duplicateConfidence = dupCheck.confidence;
        duplicateRows++;
      } else {
        acceptedRows++;
      }
    }

    // Create or update ImportBatch record
    const batch = await prisma.importBatch.create({
      data: {
        userId,
        accountId,
        fileName,
        fileHash,
        format: detectedFormat.id,
        status: ImportStatus.PREVIEWED,
        totalRows: rows.length,
        acceptedRows,
        invalidRows,
        duplicateRows,
        currencySummary: currencies,
        dateRangeStart: minDate,
        dateRangeEnd: maxDate,
        errorSummary: existingCommittedBatch
          ? "Warning: An identical file was already imported previously. Ensure you are not importing duplicate records."
          : null,
      },
    });

    // Save row-level preview results
    await prisma.importRowResult.createMany({
      data: rows.map((r) => ({
        importBatchId: batch.id,
        rowIndex: r.rowIndex,
        rawValues: r.rawValues,
        status: r.status,
        rejectionReason: r.rejectionReason,
        parsedAmount: r.parsedAmount ? new Decimal(r.parsedAmount) : null,
        parsedDate: r.parsedDate,
        parsedDescription: r.parsedDescription,
        parsedCurrency: r.parsedCurrency,
        duplicateOfTransactionId: r.duplicateOfTransactionId,
      })),
    });

    return {
      batchId: batch.id,
      fileName,
      format: detectedFormat.name,
      detectedHeaders: headers,
      suggestedMapping,
      totalRows: rows.length,
      acceptedRows,
      invalidRows,
      duplicateRows,
      currencies,
      dateRange: {
        start: minDate?.toISOString().split("T")[0],
        end: maxDate?.toISOString().split("T")[0],
      },
      rows,
    };
  }

  /**
   * Commit verified rows from an import batch to the canonical Transaction ledger
   */
  public static async commitImport(
    userId: string,
    batchId: string,
    forceIncludeRowIndexes: number[] = []
  ): Promise<{ committedCount: number; batchId: string }> {
    const batch = await prisma.importBatch.findFirst({
      where: { id: batchId, userId },
      include: { rowResults: true },
    });

    if (!batch) {
      throw new Error("Import batch not found or unauthorized");
    }

    if (batch.status === ImportStatus.COMMITTED) {
      throw new Error("This import batch has already been committed");
    }

    if (!batch.accountId) {
      throw new Error("No target financial account selected for this batch");
    }

    const forceSet = new Set(forceIncludeRowIndexes);
    const rowsToCommit = batch.rowResults.filter(
      (r) =>
        r.status === RowValidationStatus.VALID ||
        forceSet.has(r.rowIndex)
    );

    let committedCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const row of rowsToCommit) {
        if (!row.parsedAmount || !row.parsedDate || !row.parsedDescription) {
          continue;
        }

        const amountDec = new Decimal(row.parsedAmount);
        const amountNum = amountDec.toNumber();

        // Categorize transaction
        const catResult = await categorizeTransaction(
          userId,
          row.parsedDescription,
          null,
          amountNum
        );

        // Determine transaction type
        let txType: TransactionType = TransactionType.PURCHASE;
        if (amountNum > 0) {
          txType = catResult.categorySlug === "refunds" ? TransactionType.REFUND : TransactionType.INCOME;
        } else if (catResult.categorySlug === "transfers") {
          txType = TransactionType.TRANSFER;
        } else if (catResult.categorySlug === "fees-interest") {
          txType = TransactionType.FEE;
        }

        const contentHash = generateContentHash(
          batch.accountId!,
          row.parsedDate,
          amountDec.toFixed(4),
          row.parsedDescription
        );

        const createdTx = await tx.transaction.create({
          data: {
            userId,
            accountId: batch.accountId!,
            importBatchId: batch.id,
            sourceType: TransactionSourceType.IMPORTED,
            contentHash,
            transactionDate: row.parsedDate,
            originalDescription: row.parsedDescription,
            normalizedMerchant: null,
            amount: amountDec,
            currency: row.parsedCurrency || "USD",
            transactionType: txType,
            status: TransactionStatus.POSTED,
            categoryId: catResult.categoryId,
            categorizationSource: catResult.source,
            needsReview: catResult.needsReview,
            isDemo: false,
          },
        });

        // Audit trail
        await tx.transactionAuditEvent.create({
          data: {
            transactionId: createdTx.id,
            userId,
            action: "IMPORTED",
            newState: {
              batchId: batch.id,
              amount: createdTx.amount.toString(),
              currency: createdTx.currency,
            },
            reason: `Statement import from file: ${batch.fileName}`,
          },
        });

        committedCount++;
      }

      await tx.importBatch.update({
        where: { id: batch.id },
        data: {
          status: ImportStatus.COMMITTED,
          committedAt: new Date(),
          acceptedRows: committedCount,
        },
      });
    });

    return { committedCount, batchId: batch.id };
  }

  /**
   * Safe batch undo: deletes transactions generated from this import batch
   */
  public static async undoImport(userId: string, batchId: string): Promise<number> {
    const batch = await prisma.importBatch.findFirst({
      where: { id: batchId, userId },
    });

    if (!batch) {
      throw new Error("Import batch not found or unauthorized");
    }

    const { count } = await prisma.transaction.deleteMany({
      where: {
        userId,
        importBatchId: batch.id,
      },
    });

    await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        status: ImportStatus.CANCELLED,
      },
    });

    return count;
  }
}

