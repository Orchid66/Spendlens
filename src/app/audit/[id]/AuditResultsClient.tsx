"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  Share2,
  Mail,
  ExternalLink,
  Zap,
  ArrowRight,
  Copy,
  Check,
} from "lucide-react";
import type { AuditResult, ToolAuditResult } from "@/lib/audit-engine";
import { formatCurrency, savingsPercentage } from "@/lib/audit-engine";

type Props = { audit: AuditResult; auditId: string };

export default function AuditResultsClient({ audit, auditId }: Props) {
  const [summary, setSummary] = useState<string>("");
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [showLeadCapture, setShowLeadCapture] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = `${appUrl}/audit/${auditId}`;

  useEffect(() => {
    async function fetchSummary() {
      try {
        const res = await fetch("/api/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audit }),
        });
        const data = await res.json();
        setSummary(data.summary);
      } catch {
        setSummary(generateFallbackSummary(audit));
      } finally {
        setSummaryLoading(false);
      }
    }
    fetchSummary();
  }, [audit]);

  async function handleShare() {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleLeadSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auditId,
          email,
          companyName: company,
          role,
          teamSize: String(audit.input.teamSize),
          monthlySavings: audit.totalMonthlySavings,
        }),
      });
    } catch {
      /* silent — don't block UX on email failure */
    }
    setLeadSubmitted(true);
    setShowLeadCapture(false);
  }

  const hasSavings = audit.totalMonthlySavings > 0;
  const isHighSavings = audit.savingsCategory === "high";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      {/* Nav */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Zap className="text-emerald-600 w-5 h-5" />
            <span className="font-bold text-lg">SpendLens</span>
          </Link>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 border rounded-lg px-3 py-1.5 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Share"}
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        {/* Hero savings */}
        <div
          className={`rounded-2xl p-8 text-center ${
            hasSavings
              ? "bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-xl shadow-emerald-200"
              : "bg-slate-800 text-white"
          }`}
        >
          {hasSavings ? (
            <>
              <p className="text-emerald-100 text-sm font-medium uppercase tracking-wider mb-2">
                Potential savings found
              </p>
              <p className="text-6xl font-extrabold mb-1">
                {formatCurrency(audit.totalMonthlySavings)}
              </p>
              <p className="text-2xl font-semibold text-emerald-100 mb-4">
                per month · {formatCurrency(audit.totalAnnualSavings)}/year
              </p>
              <p className="text-emerald-100 text-sm">
                That&apos;s{" "}
                <strong>
                  {savingsPercentage(audit.totalMonthlySavings, audit.totalMonthlySpend)}%
                </strong>{" "}
                of your {formatCurrency(audit.totalMonthlySpend)}/mo AI spend
              </p>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
              <p className="text-2xl font-bold mb-2">You&apos;re spending well 🎉</p>
              <p className="text-slate-300">
                No significant overspend found for your {formatCurrency(audit.totalMonthlySpend)}/mo
                AI stack. We&apos;ll notify you when new optimizations apply.
              </p>
            </>
          )}
        </div>

        {/* AI-generated summary */}
        <div className="bg-white rounded-2xl border p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-emerald-600" />
            <h2 className="font-semibold text-slate-800">Your personalized analysis</h2>
          </div>
          {summaryLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-4 bg-slate-100 rounded animate-pulse"
                  style={{ width: `${85 - i * 10}%` }}
                />
              ))}
            </div>
          ) : (
            <p className="text-slate-600 leading-relaxed">{summary}</p>
          )}
        </div>

        {/* Redundancies */}
        {audit.redundancies.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <h2 className="font-semibold text-amber-800">
                Tool overlap detected ({audit.redundancies.length})
              </h2>
            </div>
            <ul className="space-y-2">
              {audit.redundancies.map((msg, i) => (
                <li key={i} className="text-sm text-amber-700 flex gap-2">
                  <span className="mt-0.5 shrink-0">•</span>
                  <span>{msg}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Per-tool breakdown */}
        <div className="space-y-4">
          <h2 className="font-bold text-xl text-slate-800">Tool-by-tool breakdown</h2>
          {audit.toolResults.map((result, i) => (
            <ToolCard key={i} result={result} />
          ))}
        </div>

        {/* Credex CTA — high savings */}
        {isHighSavings && (
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-7 text-white">
            <div className="flex items-start gap-4">
              <div className="text-3xl">💡</div>
              <div>
                <h3 className="font-bold text-lg mb-1">
                  Capture even more with Credex credits
                </h3>
                <p className="text-slate-300 text-sm mb-4">
                  Beyond plan optimization, Credex sources discounted AI infrastructure credits
                  from companies that overforecast — Cursor, Claude, ChatGPT Enterprise, and
                  more. At {formatCurrency(audit.totalMonthlySpend)}/mo in AI spend, the
                  savings compound quickly.
                </p>
                <a
                  href="https://credex.rocks"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
                >
                  Book a Credex consultation <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Lead capture */}
        {!leadSubmitted && (
          <div className="bg-white rounded-2xl border p-6 shadow-sm">
            {!showLeadCapture ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-slate-800">
                    {hasSavings
                      ? "Get your full report by email"
                      : "Get notified when new savings apply to your stack"}
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {hasSavings
                      ? "We'll send your audit breakdown + implementation steps."
                      : "AI tool pricing changes often. We'll flag new opportunities."}
                  </p>
                </div>
                <button
                  onClick={() => setShowLeadCapture(true)}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm whitespace-nowrap"
                >
                  <Mail className="w-4 h-4" />
                  {hasSavings ? "Email me the report" : "Notify me"}
                </button>
              </div>
            ) : (
              <form onSubmit={handleLeadSubmit} className="space-y-3">
                <h3 className="font-semibold text-slate-800 mb-3">
                  Where should we send your audit?
                </h3>
                <input
                  type="email"
                  required
                  placeholder="you@company.com"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <div className="grid sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Company name (optional)"
                    className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Your role (optional)"
                    className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  />
                </div>
                {/* Honeypot */}
                <input
                  type="text"
                  name="website"
                  className="hidden"
                  tabIndex={-1}
                  autoComplete="off"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
                  >
                    Send my report
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLeadCapture(false)}
                    className="px-4 py-2.5 border rounded-xl text-sm text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  No spam. If your savings are significant, a human from Credex may reach out.
                </p>
              </form>
            )}
          </div>
        )}

        {leadSubmitted && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-700">
              Report sent! Check your inbox. If your savings are significant, someone from Credex
              will reach out shortly.
            </p>
          </div>
        )}

        {/* Share CTA */}
        <div className="text-center pb-4">
          <p className="text-sm text-slate-400 mb-3">
            Know a founder who should audit their AI spend?
          </p>
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-2 border rounded-xl px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Share this audit tool
          </button>
        </div>
      </div>
    </div>
  );
}

function ToolCard({ result }: { result: ToolAuditResult }) {
  const statusColors = {
    overspending: "border-l-red-400",
    review: "border-l-amber-400",
    optimal: "border-l-emerald-400",
  };

  const statusIcons = {
    overspending: <TrendingDown className="w-4 h-4 text-red-500" />,
    review: <AlertCircle className="w-4 h-4 text-amber-500" />,
    optimal: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  };

  return (
    <div
      className={`bg-white rounded-xl border border-l-4 ${statusColors[result.status]} p-5 shadow-sm`}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          {statusIcons[result.status]}
          <div>
            <h3 className="font-semibold text-slate-800">{result.toolName}</h3>
            <p className="text-xs text-slate-500">{result.planName} plan</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-semibold text-slate-900">
            {formatCurrency(result.currentMonthlySpend)}/mo
          </p>
          {result.totalMonthlySavings > 0 && (
            <p className="text-xs text-emerald-600 font-medium">
              Save {formatCurrency(result.totalMonthlySavings)}/mo
            </p>
          )}
        </div>
      </div>

      {result.recommendations.length === 0 ? (
        <p className="text-sm text-slate-500 italic">
          ✓ Well optimized — no changes recommended.
        </p>
      ) : (
        <div className="space-y-3">
          {result.recommendations.map((rec, i) => (
            <div key={i} className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-800">{rec.action}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{rec.reason}</p>
                  {rec.monthlySavings > 0 && (
                    <p className="text-xs font-semibold text-emerald-600 mt-1">
                      Saves {formatCurrency(rec.monthlySavings)}/mo ·{" "}
                      {formatCurrency(rec.annualSavings)}/yr
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function generateFallbackSummary(audit: AuditResult): string {
  const { totalMonthlySpend, totalMonthlySavings, toolResults, input } = audit;

  if (totalMonthlySavings === 0) {
    return `Your team of ${input.teamSize} is spending ${formatCurrency(totalMonthlySpend)}/month across ${toolResults.length} AI tool${toolResults.length > 1 ? "s" : ""}, and the allocation looks well-optimized for your ${input.useCase} use case. You're on the right plans for your team size. Keep an eye on seat counts as you grow — that's typically where overspend creeps in first.`;
  }

  const topTool = [...toolResults].sort((a, b) => b.totalMonthlySavings - a.totalMonthlySavings)[0];
  return `Your team is spending ${formatCurrency(totalMonthlySpend)}/month on AI tools, but the audit found ${formatCurrency(totalMonthlySavings)}/month in actionable savings — ${formatCurrency(audit.totalAnnualSavings)}/year. The biggest opportunity is ${topTool?.toolName}: ${topTool?.recommendations[0]?.action || "plan right-sizing"}. For a ${input.teamSize}-person team focused on ${input.useCase}, these optimizations don't require any capability trade-offs — just smarter plan selection.`;
}
