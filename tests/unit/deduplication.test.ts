import { describe, it, expect } from "vitest";
import { generateContentHash, computeFileHash } from "@/modules/ingestion/deduplication";

describe("Deduplication & Transaction Hash Signatures", () => {
  it("produces deterministic identical hashes for equivalent records regardless of whitespace or casing", () => {
    const accId = "acc_12345";
    const date = new Date("2024-03-15T12:00:00Z");
    const amount = "-45.0000";

    const hash1 = generateContentHash(accId, date, amount, "WHOLE FOODS MARKET");
    const hash2 = generateContentHash(accId, date, amount, "  whole foods market  ");

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256
  });

  it("produces different hashes when account, date, or amount differs", () => {
    const date = new Date("2024-03-15T12:00:00Z");
    const h1 = generateContentHash("acc_1", date, "-45.0000", "WHOLE FOODS");
    const h2 = generateContentHash("acc_2", date, "-45.0000", "WHOLE FOODS");
    const h3 = generateContentHash("acc_1", date, "-45.0100", "WHOLE FOODS");

    expect(h1).not.toBe(h2);
    expect(h1).not.toBe(h3);
  });

  it("computes reproducible file content hashes for statement re-import checks", () => {
    const content = "Date,Description,Amount\n2024-01-01,Test,-10.00";
    const h1 = computeFileHash(content);
    const h2 = computeFileHash(content);

    expect(h1).toBe(h2);
    expect(computeFileHash(content + "\n")).not.toBe(h1);
  });
});

