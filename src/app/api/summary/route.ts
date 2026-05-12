// src/app/api/summary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AuditResult } from "@/lib/audit-engine";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: NextRequest) {
  let audit: AuditResult;
  try {
    const body = await req.json();
    audit = body.audit as AuditResult;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const prompt = buildPrompt(audit);

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const summary = result.response.text() || generateFallback(audit);

    return NextResponse.json({ summary });
  } catch (err) {
    console.error("Gemini API error:", err);
    // Graceful fallback — never show an error to the user
    return NextResponse.json({ summary: generateFallback(audit) });
  }
}

function buildPrompt(audit: AuditResult): string {
  const toolSummary = audit.toolResults
    .map(
      (t) =>
        `- ${t.toolName} (${t.planName}): $${t.currentMonthlySpend}/mo, savings found: $${t.totalMonthlySavings}/mo`
    )
    .join("\n");

  return `You are a sharp, direct financial analyst writing a 90-100 word personalized summary for a startup founder who just audited their AI tool spend.

Context:
- Team size: ${audit.input.teamSize} people
- Primary use case: ${audit.input.useCase}
- Total AI spend: $${audit.totalMonthlySpend}/mo
- Total savings identified: $${audit.totalMonthlySavings}/mo ($${audit.totalAnnualSavings}/yr)
- Tools audited:
${toolSummary}
${audit.redundancies.length > 0 ? `- Redundancies: ${audit.redundancies.length} tool overlaps found` : ""}

Write a 90-100 word paragraph that:
1. Opens with the most impactful finding (don't bury the lede)
2. Names specific tools and dollar amounts — no vague generalizations
3. Explains WHY the overspend happened (wrong plan tier, redundancy, excess seats)
4. Ends with one concrete next step
5. Tone: direct, collegial, never condescending — like a CFO friend giving real advice

Do not use bullet points. Write in paragraph form only. Do not include a subject line or greeting.`;
}

function generateFallback(audit: AuditResult): string {
  const { totalMonthlySpend, totalMonthlySavings, toolResults, input } = audit;

  if (totalMonthlySavings === 0) {
    return `Your ${input.teamSize}-person team is spending $${totalMonthlySpend.toLocaleString()}/month across ${toolResults.length} AI tool${toolResults.length > 1 ? "s" : ""} — and the allocation looks solid for your ${input.useCase} workflow. You're on appropriate plan tiers for your team size. The one thing to watch as you grow: seat counts tend to drift upward as new hires get provisioned but old accounts aren't cleaned up. A quarterly seat audit takes 10 minutes and typically surfaces $50-200/mo in savings.`;
  }

  const topResult = [...toolResults].sort((a, b) => b.totalMonthlySavings - a.totalMonthlySavings)[0];
  return `The clearest win here is ${topResult?.toolName}: ${topResult?.recommendations[0]?.action || "plan right-sizing"}. Across your $${totalMonthlySpend.toLocaleString()}/mo AI stack, we found $${totalMonthlySavings.toLocaleString()}/mo ($${audit.totalAnnualSavings.toLocaleString()}/yr) in savings that require zero capability trade-offs — just better plan selection for your actual team size of ${input.teamSize}. ${audit.redundancies.length > 0 ? `You're also running ${audit.redundancies.length} overlapping tool${audit.redundancies.length > 1 ? "s" : ""}, which is the most common source of AI overspend at your stage.` : ""} Start with the highest-savings item and work down the list.`;
}
