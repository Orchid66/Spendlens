// src/app/audit/[id]/page.tsx
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase";
import type { AuditResult } from "@/lib/audit-engine";
import AuditResultsClient from "./AuditResultsClient";
import type { Metadata } from "next";

type Props = { params: { id: string } };

async function getAudit(id: string): Promise<AuditResult | null> {
  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from("audits")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) return null;
    return data.audit_data as AuditResult;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const audit = await getAudit(params.id);
  if (!audit) return { title: "Audit not found — SpendLens" };

  const savings = audit.totalMonthlySavings;
  const title =
    savings > 0
      ? `Save $${savings.toLocaleString()}/mo on AI tools — SpendLens Audit`
      : "AI Spend Audit — SpendLens";

  return {
    title,
    description: `This team spends $${audit.totalMonthlySpend.toLocaleString()}/mo on AI tools. SpendLens found $${savings.toLocaleString()}/mo ($${audit.totalAnnualSavings.toLocaleString()}/yr) in savings. Free audit at spendlens.vercel.app`,
    openGraph: {
      title,
      description: `Found $${savings.toLocaleString()}/mo ($${audit.totalAnnualSavings.toLocaleString()}/yr) in AI tool savings.`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
    },
  };
}

export default async function AuditPage({ params }: Props) {
  const audit = await getAudit(params.id);
  if (!audit) notFound();

  return <AuditResultsClient audit={audit} auditId={params.id} />;
}
