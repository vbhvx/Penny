import { RowValidationStatus } from "@prisma/client";

export interface ColumnMapping {
  dateColumn: string;
  descriptionColumn: string;
  amountColumn?: string;
  debitColumn?: string;
  creditColumn?: string;
  currencyColumn?: string;
  categoryColumn?: string;
  externalIdColumn?: string;
  dateFormat?: string; // e.g. "YYYY-MM-DD", "MM/DD/YYYY", "DD/MM/YYYY"
  defaultCurrency?: string;
}

export interface ParsedRow {
  rowIndex: number;
  rawValues: Record<string, string>;
  status: RowValidationStatus;
  rejectionReason?: string;
  parsedDate?: Date;
  parsedDescription?: string;
  normalizedMerchant?: string;
  parsedAmount?: string; // Decimal string
  parsedCurrency?: string;
  isDebit?: boolean;
  externalId?: string;
  contentHash?: string;
  duplicateOfTransactionId?: string;
  duplicateConfidence?: number;
}

export interface IngestionPreviewResult {
  batchId?: string;
  fileName: string;
  format: string;
  detectedHeaders: string[];
  suggestedMapping: ColumnMapping;
  totalRows: number;
  acceptedRows: number;
  invalidRows: number;
  duplicateRows: number;
  currencies: Record<string, number>;
  dateRange: {
    start?: string;
    end?: string;
  };
  rows: ParsedRow[];
}

