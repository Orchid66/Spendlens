// src/app/api/leads/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { z } from "zod";

const LeadSchema = z.object({
  auditId: z.string(),
  email: z.string().email(),
  companyName: z.string().max(200).optional(),
  role: z.string().max(100).optional(),
  teamSize: z.string().optional(),
  monthlySavings: z.number().optional(),
  // honeypot
  website: z.string().max(0).optional(), // must be empty
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = LeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  // Honeypot check
  if (parsed.data.website && parsed.data.website.length > 0) {
    // Silently accept but don't store (bot)
    return NextResponse.json({ ok: true });
  }

  const { auditId, email, companyName, role, teamSize, monthlySavings } = parsed.data;

  try {
    const db = createAdminClient();
    const { error } = await db.from("leads").insert({
      audit_id: auditId,
      email,
      company_name: companyName || null,
      role: role || null,
      team_size: teamSize || null,
      monthly_savings: monthlySavings || 0,
    });

    if (error) console.error("Lead insert error:", error);
  } catch (err) {
    console.error("DB error:", err);
  }

  // Send transactional email via Resend
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://spendlens.vercel.app";
    const auditUrl = `${appUrl}/audit/${auditId}`;
    const isHighSavings = (monthlySavings || 0) >= 500;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "audits@spendlens.com",
        to: email,
        subject: monthlySavings
          ? `Your AI spend audit — $${monthlySavings.toLocaleString()}/mo savings found`
          : "Your SpendLens AI Spend Audit",
        html: buildEmailHtml({ email, auditUrl, monthlySavings, isHighSavings }),
      }),
    });
  } catch (err) {
    console.error("Email send error:", err);
  }

  return NextResponse.json({ ok: true });
}

function buildEmailHtml({
  auditUrl,
  monthlySavings,
  isHighSavings,
}: {
  email: string;
  auditUrl: string;
  monthlySavings?: number;
  isHighSavings: boolean;
}): string {
  return `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1e293b;">
  <div style="margin-bottom: 24px;">
    <span style="font-size: 20px; font-weight: 700; color: #059669;">⚡ SpendLens</span>
  </div>
  
  <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">Your AI Spend Audit</h1>
  
  ${
    monthlySavings && monthlySavings > 0
      ? `<div style="background: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px;">
    <p style="margin: 0; font-size: 32px; font-weight: 800; color: #059669;">$${monthlySavings.toLocaleString()}/mo</p>
    <p style="margin: 4px 0 0; color: #065f46; font-size: 14px;">in potential monthly savings ($${(monthlySavings * 12).toLocaleString()}/year)</p>
  </div>`
      : `<p style="color: #64748b;">Your AI spend looks well-optimized! We'll let you know when new opportunities emerge.</p>`
  }
  
  <a href="${auditUrl}" style="display: inline-block; background: #059669; color: white; font-weight: 600; padding: 12px 24px; border-radius: 10px; text-decoration: none; margin-bottom: 24px;">
    View your full audit →
  </a>
  
  ${
    isHighSavings
      ? `<div style="background: #1e293b; color: white; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px;">
    <p style="margin: 0 0 8px; font-weight: 600;">💡 Want to save even more?</p>
    <p style="margin: 0 0 12px; font-size: 14px; color: #94a3b8;">Credex sources discounted AI credits from companies that overforecast. Book a free consultation to see what's available for your stack.</p>
    <a href="https://credex.rocks" style="color: #34d399; font-weight: 600; font-size: 14px;">Book a Credex consultation →</a>
  </div>`
      : ""
  }
  
  <p style="font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px;">
    You're receiving this because you ran an audit at SpendLens. This is a free tool by Credex.
  </p>
</body>
</html>`;
}
