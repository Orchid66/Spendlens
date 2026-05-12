"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ChevronRight, Zap, TrendingDown, Shield } from "lucide-react";
import { TOOLS, USE_CASES, type UseCase, getMonthlySpend } from "@/lib/pricing-data";
import type { ToolEntry } from "@/lib/audit-engine";

const STORAGE_KEY = "spendlens_form_state";

type FormState = {
  tools: ToolEntry[];
  teamSize: number;
  useCase: UseCase;
};

const defaultState: FormState = {
  tools: [{ toolId: "cursor", planId: "pro", seats: 1, monthlySpend: 20 }],
  teamSize: 5,
  useCase: "coding",
};

export default function HomePage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(defaultState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Persist form state across reloads
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setForm(JSON.parse(saved));
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  }, [form]);

  function addTool() {
    const usedIds = form.tools.map((t) => t.toolId);
    const nextTool = Object.keys(TOOLS).find((id) => !usedIds.includes(id)) || "claude";
    const tool = TOOLS[nextTool];
    const firstPlan = tool.plans[1] || tool.plans[0];
    setForm((f) => ({
      ...f,
      tools: [
        ...f.tools,
        {
          toolId: nextTool,
          planId: firstPlan.id,
          seats: 1,
          monthlySpend: firstPlan.pricePerSeat ?? 0,
        },
      ],
    }));
  }

  function removeTool(idx: number) {
    setForm((f) => ({ ...f, tools: f.tools.filter((_, i) => i !== idx) }));
  }

  function updateTool(idx: number, field: keyof ToolEntry, value: string | number) {
    setForm((f) => {
      const tools = [...f.tools];
      const entry = { ...tools[idx], [field]: value };

      // Auto-recalculate spend when tool/plan/seats change
      if (field === "toolId") {
        const tool = TOOLS[value as string];
        entry.planId = (tool?.plans[1] || tool?.plans[0])?.id || "";
        entry.seats = 1;
      }
      if (field === "toolId" || field === "planId" || field === "seats") {
        const autoSpend = getMonthlySpend(entry.toolId, entry.planId, Number(entry.seats));
        if (autoSpend > 0) entry.monthlySpend = autoSpend;
      }

      tools[idx] = entry;
      return { ...f, tools };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.tools.length === 0) {
      setError("Add at least one tool to audit.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      localStorage.removeItem(STORAGE_KEY);
      router.push(`/audit/${data.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to run audit");
      setLoading(false);
    }
  }

  const totalEstimated = form.tools.reduce((sum, t) => sum + t.monthlySpend, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      {/* Nav */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="text-emerald-600 w-5 h-5" />
            <span className="font-bold text-lg">SpendLens</span>
          </div>
          <div className="text-sm text-slate-500">Free · No login required</div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-4 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium px-3 py-1 rounded-full mb-6">
          <TrendingDown className="w-3.5 h-3.5" /> Free AI spend audit
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
          Your team is probably
          <span className="text-emerald-600"> overpaying</span> for AI tools.
        </h1>
        <p className="text-xl text-slate-600 max-w-xl mx-auto mb-3">
          Enter what you pay. Get an instant breakdown of where you&apos;re wasting money and
          exactly what to do about it.
        </p>
        <p className="text-sm text-slate-400">No login. No spam. Takes 90 seconds.</p>
      </section>

      {/* Form */}
      <section className="max-w-3xl mx-auto px-4 pb-20">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tool rows */}
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b bg-slate-50">
              <h2 className="font-semibold text-slate-800">Your AI tools</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Add every AI tool your team pays for
              </p>
            </div>

            <div className="divide-y">
              {form.tools.map((entry, idx) => {
                const tool = TOOLS[entry.toolId];
                const plan = tool?.plans.find((p) => p.id === entry.planId);
                const isApiTool = plan?.pricePerSeat === null;

                return (
                  <div key={idx} className="px-6 py-4 grid grid-cols-12 gap-3 items-end">
                    {/* Tool select */}
                    <div className="col-span-12 sm:col-span-4">
                      <label className="text-xs font-medium text-slate-500 mb-1 block">
                        Tool
                      </label>
                      <select
                        className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        value={entry.toolId}
                        onChange={(e) => updateTool(idx, "toolId", e.target.value)}
                      >
                        {Object.values(TOOLS).map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Plan select */}
                    <div className="col-span-6 sm:col-span-3">
                      <label className="text-xs font-medium text-slate-500 mb-1 block">
                        Plan
                      </label>
                      <select
                        className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        value={entry.planId}
                        onChange={(e) => updateTool(idx, "planId", e.target.value)}
                      >
                        {tool?.plans.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Seats (hide for API tools) */}
                    {!isApiTool ? (
                      <div className="col-span-3 sm:col-span-2">
                        <label className="text-xs font-medium text-slate-500 mb-1 block">
                          Seats
                        </label>
                        <input
                          type="number"
                          min="1"
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                          value={entry.seats}
                          onChange={(e) =>
                            updateTool(idx, "seats", parseInt(e.target.value) || 1)
                          }
                        />
                      </div>
                    ) : null}

                    {/* Monthly spend */}
                    <div className={`col-span-${isApiTool ? "6" : "3"} sm:col-span-2`}>
                      <label className="text-xs font-medium text-slate-500 mb-1 block">
                        $/mo
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                          $
                        </span>
                        <input
                          type="number"
                          min="0"
                          className="w-full border rounded-lg pl-6 pr-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                          value={entry.monthlySpend}
                          onChange={(e) =>
                            updateTool(idx, "monthlySpend", parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                    </div>

                    {/* Remove */}
                    <div className="col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeTool(idx)}
                        disabled={form.tools.length === 1}
                        className="text-slate-300 hover:text-red-400 disabled:opacity-30 transition-colors p-2"
                        aria-label="Remove tool"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-6 py-3 border-t bg-slate-50">
              <button
                type="button"
                onClick={addTool}
                className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
              >
                <Plus className="w-4 h-4" /> Add another tool
              </button>
            </div>
          </div>

          {/* Team context */}
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b bg-slate-50">
              <h2 className="font-semibold text-slate-800">Team context</h2>
            </div>
            <div className="px-6 py-4 grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  Total team size
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  value={form.teamSize}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, teamSize: parseInt(e.target.value) || 1 }))
                  }
                />
                <p className="text-xs text-slate-400 mt-1">
                  Headcount, not just AI tool users
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  Primary use case
                </label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  value={form.useCase}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, useCase: e.target.value as UseCase }))
                  }
                >
                  {USE_CASES.map((uc) => (
                    <option key={uc.id} value={uc.id}>
                      {uc.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Summary + submit */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1 bg-slate-50 border rounded-2xl px-5 py-3">
              <p className="text-xs text-slate-500">Current estimated spend</p>
              <p className="text-2xl font-bold text-slate-900">
                ${totalEstimated.toLocaleString()}
                <span className="text-sm font-normal text-slate-400">/mo</span>
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold px-8 py-4 rounded-2xl transition-colors text-base shadow-lg shadow-emerald-100"
            >
              {loading ? (
                <span className="animate-pulse">Running audit…</span>
              ) : (
                <>
                  Run my free audit <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}
        </form>

        {/* Trust signals */}
        <div className="mt-12 grid sm:grid-cols-3 gap-4 text-center">
          {[
            { icon: Shield, title: "No login required", desc: "Email optional — only after we show you results" },
            { icon: Zap, title: "Instant results", desc: "Audit runs in under 2 seconds, 100% on-server" },
            { icon: TrendingDown, title: "Finance-grade reasoning", desc: "Every recommendation cites the exact dollar math" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-4 rounded-xl bg-white border">
              <Icon className="w-5 h-5 text-emerald-600 mx-auto mb-2" />
              <p className="font-medium text-sm text-slate-800">{title}</p>
              <p className="text-xs text-slate-500 mt-1">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
