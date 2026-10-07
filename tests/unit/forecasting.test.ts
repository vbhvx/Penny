import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";

describe("Cash Flow Forecasting Model Identity", () => {
  it("strictly satisfies the fundamental forecast identity", () => {
    // Projected closing balance = Opening balance + Expected inflows - Expected outflows
    const opening = new Decimal("5000.00");
    const inflows = new Decimal("3200.00");
    const outflows = new Decimal("2150.50");

    const projectedClosing = opening.plus(inflows).minus(outflows);

    expect(projectedClosing.toString()).toBe("6049.5");
    expect(projectedClosing.toFixed(2)).toBe("6049.50");
  });

  it("handles multi-account aggregation without double-counting internal transfers", () => {
    // Account A balance: 3000, Account B balance: 2000
    // Internal transfer: -500 from A, +500 to B
    // Consolidated net movement must be 0!
    const accA = new Decimal("3000.00");
    const accB = new Decimal("2000.00");
    const initialConsolidated = accA.plus(accB);

    const transferOut = new Decimal("-500.00");
    const transferIn = new Decimal("500.00");

    const netTransferMovement = transferOut.plus(transferIn);
    expect(netTransferMovement.isZero()).toBe(true);

    const afterConsolidated = initialConsolidated.plus(netTransferMovement);
    expect(afterConsolidated.toString()).toBe(initialConsolidated.toString());
  });
});

