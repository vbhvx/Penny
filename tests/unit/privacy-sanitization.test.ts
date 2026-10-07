import { describe, it, expect } from "vitest";
import { PrivacyService } from "@/modules/privacy/service";

describe("Privacy & CSV Formula Injection Defense (CWE-1236)", () => {
  it("sanitizes dangerous spreadsheet formula characters by prepending single quote", () => {
    // Malicious Excel / Sheets commands
    expect(PrivacyService.sanitizeCsvValue("=cmd|' /C calc'!A0")).toBe("'=cmd|' /C calc'!A0");
    expect(PrivacyService.sanitizeCsvValue("+12345")).toBe("'+12345");
    expect(PrivacyService.sanitizeCsvValue("-2+3*cmd")).toBe("'-2+3*cmd");
    expect(PrivacyService.sanitizeCsvValue("@SUM(1,2)")).toBe("'@SUM(1,2)");
    expect(PrivacyService.sanitizeCsvValue("\tPAYLOAD")).toBe("'\tPAYLOAD");
  });

  it("leaves standard text and numerical strings intact", () => {
    expect(PrivacyService.sanitizeCsvValue("Whole Foods Market")).toBe("Whole Foods Market");
    expect(PrivacyService.sanitizeCsvValue("Chipotle #2810")).toBe("Chipotle #2810");
    expect(PrivacyService.sanitizeCsvValue("45.50")).toBe("45.50");
  });
});

