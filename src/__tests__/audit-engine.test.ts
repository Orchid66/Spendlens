// src/__tests__/audit-engine.test.ts
import { runAudit, formatCurrency, savingsPercentage } from "@/lib/audit-engine";
import type { AuditInput } from "@/lib/audit-engine";

// ─── Cursor Tests ────────────────────────────────────────────────────────────

describe("Cursor audit rules", () => {
  test("Cursor Business with <10 seats should recommend downgrade to Pro", () => {
    const input: AuditInput = {
      tools: [{ toolId: "cursor", planId: "business", seats: 4, monthlySpend: 160 }],
      teamSize: 4,
      useCase: "coding",
    };
    const result = runAudit(input);
    const toolResult = result.toolResults[0];
    expect(toolResult.status).toBe("overspending");
    const downgradeRec = toolResult.recommendations.find((r) => r.type === "downgrade_plan");
    expect(downgradeRec).toBeDefined();
    expect(downgradeRec?.monthlySavings).toBe(80); // (40-20) * 4
    expect(downgradeRec?.annualSavings).toBe(960);
  });

  test("Cursor Business with >=10 seats should NOT flag downgrade", () => {
    const input: AuditInput = {
      tools: [{ toolId: "cursor", planId: "business", seats: 12, monthlySpend: 480 }],
      teamSize: 12,
      useCase: "coding",
    };
    const result = runAudit(input);
    const toolResult = result.toolResults[0];
    const downgradeRec = toolResult.recommendations.find((r) => r.type === "downgrade_plan");
    expect(downgradeRec).toBeUndefined();
  });

  test("Cursor Pro with excess seats should flag seat reduction", () => {
    const input: AuditInput = {
      tools: [{ toolId: "cursor", planId: "pro", seats: 10, monthlySpend: 200 }],
      teamSize: 5, // 10 seats but only 5-person team
      useCase: "coding",
    };
    const result = runAudit(input);
    const toolResult = result.toolResults[0];
    const seatRec = toolResult.recommendations.find((r) => r.type === "reduce_seats");
    expect(seatRec).toBeDefined();
    expect(seatRec?.monthlySavings).toBeGreaterThan(0);
  });
});

// ─── GitHub Copilot Tests ────────────────────────────────────────────────────

describe("GitHub Copilot audit rules", () => {
  test("Copilot Business with <5 seats should recommend Individual", () => {
    const input: AuditInput = {
      tools: [{ toolId: "github_copilot", planId: "business", seats: 3, monthlySpend: 57 }],
      teamSize: 3,
      useCase: "coding",
    };
    const result = runAudit(input);
    const toolResult = result.toolResults[0];
    const downgradeRec = toolResult.recommendations.find((r) => r.type === "downgrade_plan");
    expect(downgradeRec).toBeDefined();
    expect(downgradeRec?.monthlySavings).toBe(27); // (19-10) * 3
  });

  test("Copilot Enterprise with <50 seats should recommend Business", () => {
    const input: AuditInput = {
      tools: [{ toolId: "github_copilot", planId: "enterprise", seats: 20, monthlySpend: 780 }],
      teamSize: 20,
      useCase: "coding",
    };
    const result = runAudit(input);
    const toolResult = result.toolResults[0];
    const downgradeRec = toolResult.recommendations.find((r) => r.type === "downgrade_plan");
    expect(downgradeRec).toBeDefined();
    expect(downgradeRec?.monthlySavings).toBe(400); // (39-19) * 20
  });

  test("Copilot Individual plan should be flagged as optimal", () => {
    const input: AuditInput = {
      tools: [{ toolId: "github_copilot", planId: "individual", seats: 1, monthlySpend: 10 }],
      teamSize: 1,
      useCase: "coding",
    };
    const result = runAudit(input);
    expect(result.toolResults[0].status).toBe("optimal");
  });
});

// ─── Claude Tests ─────────────────────────────────────────────────────────────

describe("Claude audit rules", () => {
  test("Claude Team with <5 seats should recommend individual Pro plans", () => {
    const input: AuditInput = {
      tools: [{ toolId: "claude", planId: "team", seats: 3, monthlySpend: 90 }],
      teamSize: 3,
      useCase: "writing",
    };
    const result = runAudit(input);
    const toolResult = result.toolResults[0];
    const rec = toolResult.recommendations.find((r) => r.type === "downgrade_plan");
    expect(rec).toBeDefined();
    expect(rec?.monthlySavings).toBe(30); // (30-20) * 3
  });

  test("Claude Pro is optimal for single user", () => {
    const input: AuditInput = {
      tools: [{ toolId: "claude", planId: "pro", seats: 1, monthlySpend: 20 }],
      teamSize: 1,
      useCase: "writing",
    };
    const result = runAudit(input);
    expect(result.toolResults[0].status).toBe("optimal");
  });
});

// ─── ChatGPT Tests ────────────────────────────────────────────────────────────

describe("ChatGPT audit rules", () => {
  test("ChatGPT Team with 1 seat should recommend Plus", () => {
    const input: AuditInput = {
      tools: [{ toolId: "chatgpt", planId: "team", seats: 1, monthlySpend: 30 }],
      teamSize: 1,
      useCase: "mixed",
    };
    const result = runAudit(input);
    const rec = result.toolResults[0].recommendations.find((r) => r.type === "downgrade_plan");
    expect(rec).toBeDefined();
    expect(rec?.monthlySavings).toBe(10);
  });
});

// ─── Redundancy Detection ─────────────────────────────────────────────────────

describe("Redundancy detection", () => {
  test("Cursor + Copilot should flag redundancy", () => {
    const input: AuditInput = {
      tools: [
        { toolId: "cursor", planId: "pro", seats: 2, monthlySpend: 40 },
        { toolId: "github_copilot", planId: "individual", seats: 2, monthlySpend: 20 },
      ],
      teamSize: 2,
      useCase: "coding",
    };
    const result = runAudit(input);
    expect(result.redundancies.length).toBeGreaterThan(0);
    expect(result.redundancies[0]).toContain("Cursor");
    expect(result.redundancies[0]).toContain("Copilot");
  });

  test("Claude + ChatGPT for same team size should flag redundancy", () => {
    const input: AuditInput = {
      tools: [
        { toolId: "claude", planId: "pro", seats: 5, monthlySpend: 100 },
        { toolId: "chatgpt", planId: "plus", seats: 5, monthlySpend: 100 },
      ],
      teamSize: 5,
      useCase: "mixed",
    };
    const result = runAudit(input);
    expect(result.redundancies.length).toBeGreaterThan(0);
  });
});

// ─── Savings Aggregation ─────────────────────────────────────────────────────

describe("Savings aggregation", () => {
  test("Total savings is sum of all tool savings", () => {
    const input: AuditInput = {
      tools: [
        { toolId: "cursor", planId: "business", seats: 5, monthlySpend: 200 }, // saves (40-20)*5 = 100
        { toolId: "github_copilot", planId: "business", seats: 3, monthlySpend: 57 }, // saves (19-10)*3 = 27
      ],
      teamSize: 5,
      useCase: "coding",
    };
    const result = runAudit(input);
    expect(result.totalMonthlySavings).toBeGreaterThan(0);
    expect(result.totalAnnualSavings).toBe(result.totalMonthlySavings * 12);
  });

  test("savingsCategory is 'high' when savings >= 500", () => {
    const input: AuditInput = {
      tools: [
        { toolId: "cursor", planId: "business", seats: 50, monthlySpend: 2000 }, // saves (40-20)*50 = 1000
      ],
      teamSize: 50,
      useCase: "coding",
    };
    const result = runAudit(input);
    expect(result.savingsCategory).toBe("high");
  });

  test("savingsCategory is 'none' when spend is already optimal", () => {
    const input: AuditInput = {
      tools: [{ toolId: "cursor", planId: "pro", seats: 1, monthlySpend: 20 }],
      teamSize: 1,
      useCase: "coding",
    };
    const result = runAudit(input);
    expect(result.savingsCategory).toBe("none");
  });
});

// ─── Utility Tests ────────────────────────────────────────────────────────────

describe("Utility functions", () => {
  test("formatCurrency formats correctly", () => {
    expect(formatCurrency(1234)).toBe("$1,234");
    expect(formatCurrency(0)).toBe("$0");
    expect(formatCurrency(99)).toBe("$99");
  });

  test("savingsPercentage calculates correctly", () => {
    expect(savingsPercentage(200, 1000)).toBe(20);
    expect(savingsPercentage(0, 1000)).toBe(0);
    expect(savingsPercentage(100, 0)).toBe(0); // avoid divide by zero
  });
});
