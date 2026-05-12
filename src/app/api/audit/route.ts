// src/app/api/audit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { createAdminClient } from "@/lib/supabase";
import { runAudit, type AuditInput } from "@/lib/audit-engine";
import { z } from "zod";

const ToolEntrySchema = z.object({
  toolId: z.string(),
  planId: z.string(),
  seats: z.number().int().min(1),
  monthlySpend: z.number().min(0),
});

const AuditInputSchema = z.object({
  tools: z.array(ToolEntrySchema).min(1).max(20),
  teamSize: z.number().int().min(1).max(100000),
  useCase: z.enum(["coding", "writing", "data", "research", "mixed"]),
});

// Simple in-memory rate limit: max 20 req/min per IP
const rateLimitMap = new Map<string, { count: number; reset: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const window = 60_000; // 1 minute
  const limit = 20;

  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.reset) {
    rateLimitMap.set(ip, { count: 1, reset: now + window });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = AuditInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const input: AuditInput = parsed.data;
  const result = runAudit(input);
  const id = nanoid(10);
  result.id = id;

  try {
    const db = createAdminClient();
    const { error } = await db
      .from("audits")
      .insert({ id, audit_data: result });

    if (error) {
      console.error("Supabase insert error:", error);
      // Don't fail — return the result even if DB storage fails
      // (results will still render, just not be retrievable by ID)
    }
  } catch (err) {
    console.error("DB error:", err);
  }

  return NextResponse.json({ id, result }, { status: 201 });
}
