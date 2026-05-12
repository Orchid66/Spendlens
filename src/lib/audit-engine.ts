// src/lib/audit-engine.ts
// Hardcoded rules — intentional. Audit math must be deterministic and verifiable.
// AI is used only for the summary narrative, not for these calculations.

import { TOOLS, getToolById, getPlanById, type UseCase } from "./pricing-data";

// ─── Input Types ─────────────────────────────────────────────────────────────

export type ToolEntry = {
  toolId: string;
  planId: string;
  seats: number;
  monthlySpend: number; // what they actually pay (may differ from plan × seats for API/enterprise)
};

export type AuditInput = {
  tools: ToolEntry[];
  teamSize: number;
  useCase: UseCase;
};

// ─── Output Types ────────────────────────────────────────────────────────────

export type Recommendation = {
  type: "downgrade_plan" | "reduce_seats" | "switch_tool" | "use_credits" | "optimal";
  action: string; // short imperative: "Switch to Copilot Individual"
  reason: string; // one sentence finance-literate justification
  monthlySavings: number;
  annualSavings: number;
  alternativeToolId?: string;
  alternativePlanId?: string;
};

export type ToolAuditResult = {
  entry: ToolEntry;
  toolName: string;
  planName: string;
  currentMonthlySpend: number;
  recommendations: Recommendation[];
  totalMonthlySavings: number;
  status: "overspending" | "optimal" | "review";
};

export type AuditResult = {
  id?: string;
  input: AuditInput;
  toolResults: ToolAuditResult[];
  totalMonthlySpend: number;
  totalMonthlySavings: number;
  totalAnnualSavings: number;
  savingsCategory: "high" | "medium" | "low" | "none";
  redundancies: string[];
  createdAt: string;
};

// ─── Rules ───────────────────────────────────────────────────────────────────

function auditCursor(entry: ToolEntry, teamSize: number, useCase: UseCase): Recommendation[] {
  const recs: Recommendation[] = [];
  const currentPlan = getPlanById("cursor", entry.planId);
  if (!currentPlan) return recs;

  // Business plan ($40/seat) vs Pro ($20/seat)
  // Business only adds SSO + admin panel — not worth it for teams < 10
  if (entry.planId === "business" && entry.seats < 10) {
    const saving = (40 - 20) * entry.seats;
    recs.push({
      type: "downgrade_plan",
      action: "Downgrade Cursor to Pro",
      reason: `Business plan adds SSO and admin controls — unnecessary for a ${entry.seats}-person team. Pro delivers identical AI capabilities at $20/seat vs $40/seat.`,
      monthlySavings: saving,
      annualSavings: saving * 12,
      alternativeToolId: "cursor",
      alternativePlanId: "pro",
    });
  }

  // If only 1-2 coders and not heavy usage, Windsurf Pro ($15) is a competitive alternative
  if (entry.planId === "pro" && entry.seats <= 3 && useCase === "coding") {
    const windSurfCost = 15 * entry.seats;
    const cursorCost = 20 * entry.seats;
    const saving = cursorCost - windSurfCost;
    recs.push({
      type: "switch_tool",
      action: "Consider Windsurf Pro as a lower-cost alternative",
      reason: `Windsurf Pro ($15/seat) offers comparable autocomplete and Claude/GPT-4o access. Switching saves $5/seat/month — small but real for budget-conscious teams.`,
      monthlySavings: saving,
      annualSavings: saving * 12,
      alternativeToolId: "windsurf",
      alternativePlanId: "pro",
    });
  }

  // Excess seats
  if (entry.seats > teamSize * 1.2 && currentPlan.pricePerSeat !== null) {
    const excessSeats = entry.seats - teamSize;
    const saving = excessSeats * currentPlan.pricePerSeat;
    if (saving > 0) {
      recs.push({
        type: "reduce_seats",
        action: `Remove ${excessSeats} unused Cursor seat(s)`,
        reason: `You're paying for ${entry.seats} seats but your team is ${teamSize}. Each unused seat costs $${currentPlan.pricePerSeat}/mo.`,
        monthlySavings: saving,
        annualSavings: saving * 12,
      });
    }
  }

  return recs;
}

function auditGithubCopilot(entry: ToolEntry, teamSize: number): Recommendation[] {
  const recs: Recommendation[] = [];

  // Enterprise ($39) vs Business ($19) — only worth it for codebase personalization at scale
  if (entry.planId === "enterprise" && entry.seats < 50) {
    const saving = (39 - 19) * entry.seats;
    recs.push({
      type: "downgrade_plan",
      action: "Downgrade Copilot Enterprise → Business",
      reason: `Enterprise adds codebase personalization and fine-tuning, which only meaningfully improves at 50+ devs. At ${entry.seats} seats, Business ($19/seat) gives identical day-to-day value.`,
      monthlySavings: saving,
      annualSavings: saving * 12,
      alternativeToolId: "github_copilot",
      alternativePlanId: "business",
    });
  }

  // Business ($19) vs Individual ($10) — team mgmt and IP indemnity matter at 5+
  if (entry.planId === "business" && entry.seats < 5) {
    const saving = (19 - 10) * entry.seats;
    recs.push({
      type: "downgrade_plan",
      action: "Downgrade Copilot Business → Individual",
      reason: `Copilot Business adds audit logs and team management — features only valuable at 5+ seats. Below that threshold, Individual ($10/seat) is functionally identical for writing code.`,
      monthlySavings: saving,
      annualSavings: saving * 12,
      alternativeToolId: "github_copilot",
      alternativePlanId: "individual",
    });
  }

  // Excess seats
  if (entry.seats > teamSize * 1.2) {
    const plan = getPlanById("github_copilot", entry.planId);
    if (plan?.pricePerSeat) {
      const excessSeats = entry.seats - teamSize;
      const saving = excessSeats * plan.pricePerSeat;
      recs.push({
        type: "reduce_seats",
        action: `Remove ${excessSeats} unused Copilot seat(s)`,
        reason: `${excessSeats} seats above your team count of ${teamSize} are costing $${saving}/mo with zero utilization.`,
        monthlySavings: saving,
        annualSavings: saving * 12,
      });
    }
  }

  return recs;
}

function auditClaude(entry: ToolEntry, teamSize: number): Recommendation[] {
  const recs: Recommendation[] = [];

  // Team plan has a 5-seat minimum — if < 5 users, they're overpaying
  if (entry.planId === "team" && entry.seats < 5) {
    const teamCost = 30 * entry.seats;
    const proCost = 20 * entry.seats;
    const saving = teamCost - proCost;
    recs.push({
      type: "downgrade_plan",
      action: "Switch from Claude Team to individual Pro plans",
      reason: `Claude Team requires 5 seats minimum. For ${entry.seats} users, buying individual Pro plans ($20/seat) saves $${saving}/mo — Claude Team's collaboration features only justify the premium at 5+ members.`,
      monthlySavings: saving,
      annualSavings: saving * 12,
      alternativeToolId: "claude",
      alternativePlanId: "pro",
    });
  }

  // Max plan ($100-200/seat) — only justified if hitting Pro limits regularly
  if (entry.planId === "max" && entry.seats > 3) {
    const saving = (100 - 20) * entry.seats; // conservative: assume $100 tier
    recs.push({
      type: "downgrade_plan",
      action: "Evaluate whether all users genuinely need Claude Max",
      reason: `Claude Max ($100/seat) is justified only for users who regularly exhaust Pro limits. Audit per-user: heavy users keep Max, everyone else downgrades to Pro ($20/seat), saving $${saving}/mo.`,
      monthlySavings: saving,
      annualSavings: saving * 12,
      alternativeToolId: "claude",
      alternativePlanId: "pro",
    });
  }

  return recs;
}

function auditChatGPT(entry: ToolEntry, teamSize: number): Recommendation[] {
  const recs: Recommendation[] = [];

  // Team ($30) vs Plus ($20) for single user
  if (entry.planId === "team" && entry.seats === 1) {
    const saving = 30 - 20;
    recs.push({
      type: "downgrade_plan",
      action: "Downgrade ChatGPT Team → Plus",
      reason: `ChatGPT Team ($30/seat) adds a shared workspace and admin console — features that have zero value for a single user. Plus ($20/seat) delivers identical model access.`,
      monthlySavings: saving,
      annualSavings: saving * 12,
      alternativeToolId: "chatgpt",
      alternativePlanId: "plus",
    });
  }

  // Team with few seats — might be cheaper as Plus
  if (entry.planId === "team" && entry.seats < 3) {
    const saving = (30 - 20) * entry.seats;
    recs.push({
      type: "downgrade_plan",
      action: "Switch ChatGPT Team to individual Plus plans",
      reason: `For ${entry.seats} users, the Team plan's workspace features provide minimal value. Individual Plus plans save $10/seat/mo ($${saving}/mo total) with no capability loss.`,
      monthlySavings: saving,
      annualSavings: saving * 12,
      alternativeToolId: "chatgpt",
      alternativePlanId: "plus",
    });
  }

  return recs;
}

function auditGemini(entry: ToolEntry): Recommendation[] {
  const recs: Recommendation[] = [];

  // Advanced is bundled with Google One 2TB — if they don't use storage, it's priced oddly
  if (entry.planId === "advanced" && entry.seats > 1) {
    recs.push({
      type: "review",
      action: "Verify Google One storage is being used",
      reason: `Gemini Advanced ($19.99/seat) bundles 2TB Google storage per user. If your team isn't using the storage, you're paying a ~$10/seat premium vs pure-AI alternatives like Claude Pro ($20/seat) or ChatGPT Plus ($20/seat).`,
      monthlySavings: 0, // context-dependent
      annualSavings: 0,
    } as Recommendation);
  }

  return recs;
}

function auditWindsurf(entry: ToolEntry): Recommendation[] {
  const recs: Recommendation[] = [];

  // Teams ($35) vs Pro ($15) for small teams
  if (entry.planId === "teams" && entry.seats < 5) {
    const saving = (35 - 15) * entry.seats;
    recs.push({
      type: "downgrade_plan",
      action: "Downgrade Windsurf Teams → Pro",
      reason: `Windsurf Teams ($35/seat) adds admin controls and SSO. For a ${entry.seats}-person team, Pro ($15/seat) delivers identical AI capabilities and saves $${saving}/mo.`,
      monthlySavings: saving,
      annualSavings: saving * 12,
      alternativeToolId: "windsurf",
      alternativePlanId: "pro",
    });
  }

  return recs;
}

function auditApiUsage(entry: ToolEntry, monthlySpend: number): Recommendation[] {
  const recs: Recommendation[] = [];

  // High API spend might be better served by a plan
  if ((entry.toolId === "anthropic_api" || entry.toolId === "openai_api") && monthlySpend > 50) {
    recs.push({
      type: "use_credits",
      action: "Explore Credex for discounted API credits",
      reason: `At $${monthlySpend}/mo in API spend, discounted credits through Credex could meaningfully reduce your per-token cost — the savings compound quickly at scale.`,
      monthlySavings: Math.round(monthlySpend * 0.15), // conservative 15% discount estimate
      annualSavings: Math.round(monthlySpend * 0.15 * 12),
    });
  }

  return recs;
}

// ─── Redundancy Detection ────────────────────────────────────────────────────

function detectRedundancies(tools: ToolEntry[]): string[] {
  const msgs: string[] = [];
  const toolIds = tools.map((t) => t.toolId);

  const hasCursor = toolIds.includes("cursor");
  const hasCopilot = toolIds.includes("github_copilot");
  const hasWindsurf = toolIds.includes("windsurf");
  const hasClaude = toolIds.includes("claude");
  const hasChatGPT = toolIds.includes("chatgpt");
  const hasAnthropicApi = toolIds.includes("anthropic_api");
  const hasOpenAiApi = toolIds.includes("openai_api");

  // Two coding assistants
  if (hasCursor && hasCopilot) {
    msgs.push(
      "You're paying for both Cursor and GitHub Copilot — both are code-completion tools. Most developers use one exclusively. Pick the one your team prefers and cancel the other."
    );
  }
  if (hasCursor && hasWindsurf) {
    msgs.push(
      "Cursor and Windsurf overlap almost entirely in functionality. Running both is a direct waste — consolidate to whichever your team prefers."
    );
  }
  if (hasCopilot && hasWindsurf) {
    msgs.push(
      "GitHub Copilot and Windsurf both provide in-editor AI completion. You likely only need one."
    );
  }

  // Chat + API overlap
  if (hasClaude && hasAnthropicApi) {
    msgs.push(
      "You're paying for both Claude subscriptions and Anthropic API. If your team uses Claude.ai for conversational work, ensure the API is only used for production integrations — not as a duplicate chat interface."
    );
  }
  if (hasChatGPT && hasOpenAiApi) {
    msgs.push(
      "You have both ChatGPT subscriptions and OpenAI API spend. Ensure API usage is for production code only, not as an alternative chat front-end — that's what the subscription is for."
    );
  }

  // Two general-purpose chat tools
  if (hasClaude && hasChatGPT) {
    const claudeEntry = tools.find((t) => t.toolId === "claude");
    const chatgptEntry = tools.find((t) => t.toolId === "chatgpt");
    if (claudeEntry && chatgptEntry && claudeEntry.seats === chatgptEntry.seats) {
      msgs.push(
        "You're paying the same number of seats on both Claude and ChatGPT. Unless you have a specific use-case split, most teams can consolidate to one general-purpose AI assistant."
      );
    }
  }

  return msgs;
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export function runAudit(input: AuditInput): AuditResult {
  const toolResults: ToolAuditResult[] = [];
  let totalMonthlySpend = 0;
  let totalMonthlySavings = 0;

  for (const entry of input.tools) {
    const tool = getToolById(entry.toolId);
    const plan = getPlanById(entry.toolId, entry.planId);
    if (!tool || !plan) continue;

    const currentSpend = entry.monthlySpend;
    totalMonthlySpend += currentSpend;

    let recs: Recommendation[] = [];

    switch (entry.toolId) {
      case "cursor":
        recs = auditCursor(entry, input.teamSize, input.useCase);
        break;
      case "github_copilot":
        recs = auditGithubCopilot(entry, input.teamSize);
        break;
      case "claude":
        recs = auditClaude(entry, input.teamSize);
        break;
      case "chatgpt":
        recs = auditChatGPT(entry, input.teamSize);
        break;
      case "gemini":
        recs = auditGemini(entry);
        break;
      case "windsurf":
        recs = auditWindsurf(entry);
        break;
      case "anthropic_api":
      case "openai_api":
        recs = auditApiUsage(entry, currentSpend);
        break;
    }

    // Filter out recs where savings > current spend (sanity check)
    recs = recs.filter((r) => r.monthlySavings <= currentSpend);

    const toolMonthlySavings = recs.reduce((sum, r) => sum + r.monthlySavings, 0);
    totalMonthlySavings += toolMonthlySavings;

    const status: ToolAuditResult["status"] =
      recs.length === 0 ? "optimal" : toolMonthlySavings > 0 ? "overspending" : "review";

    toolResults.push({
      entry,
      toolName: tool.name,
      planName: plan.name,
      currentMonthlySpend: currentSpend,
      recommendations: recs,
      totalMonthlySavings: toolMonthlySavings,
      status,
    });
  }

  const redundancies = detectRedundancies(input.tools);
  const totalAnnualSavings = totalMonthlySavings * 12;

  let savingsCategory: AuditResult["savingsCategory"];
  if (totalMonthlySavings >= 500) savingsCategory = "high";
  else if (totalMonthlySavings >= 100) savingsCategory = "medium";
  else if (totalMonthlySavings > 0) savingsCategory = "low";
  else savingsCategory = "none";

  return {
    input,
    toolResults,
    totalMonthlySpend,
    totalMonthlySavings,
    totalAnnualSavings,
    savingsCategory,
    redundancies,
    createdAt: new Date().toISOString(),
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function savingsPercentage(savings: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((savings / total) * 100);
}
