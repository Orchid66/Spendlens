# SpendLens — Free AI Spend Audit for Startups

SpendLens is a free web tool that audits a startup's AI tool spend in under 2 minutes, showing exactly where the team is overpaying, what to switch or downgrade, and how much they could save — no login required. It's a lead-generation asset for [Credex](https://credex.rocks), which sells discounted AI infrastructure credits.

**Live demo:** 
---

## Quick Start

### Prerequisites
- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier works)
- An [Anthropic API key](https://console.anthropic.com) (for AI summaries)
- A [Resend](https://resend.com) account (for transactional email)

### Install & run locally

```bash
git clone https://github.com/Orchid66/Spendlens
cd spendlens

npm install

cp .env.example .env.local
# Fill in your keys in .env.local

# Set up database (paste supabase/schema.sql into your Supabase SQL editor)

npm run dev
# → http://localhost:3000
```

### Run tests

```bash
npm test
```

### Deploy to Vercel

```bash
npm install -g vercel
vercel --prod
# Add env vars in the Vercel dashboard (or use vercel env pull)
```

---

## Decisions

Five trade-offs made during the build:

1. **Hardcoded audit rules, not AI-driven logic.** The assignment correctly notes this is the right call. Hardcoded rules are deterministic, auditable, testable, and trustworthy. A finance person can read them and agree. AI hallucinating "$200/mo savings" would destroy trust. AI is used only for the narrative summary.

2. **Next.js App Router over Pages Router.** App Router enables per-route metadata generation (dynamic OG tags for each audit URL), server components for the results page, and cleaner colocation of page + data logic. Trade-off: slightly steeper learning curve, and some ecosystem libraries (e.g. old form libraries) don't support React 18 well.

3. **Supabase over a custom Postgres on Render.** Supabase's free tier is generous, has a built-in SQL editor for running schema migrations, and its JS client handles connection pooling. Trade-off: vendor lock-in, and its RLS policy model adds indirection that can confuse debugging.

4. **localStorage for form persistence, not a server draft.** Simpler, zero cost, no auth needed, works offline. Trade-off: doesn't persist across devices. For a lead-gen audit tool where users typically complete in one session on one device, this is the right call.

5. **In-memory rate limiting (Map) over Redis.** No additional infra or cost for a v1. Trade-off: doesn't work across multiple server instances (Vercel can spin up many). At launch-scale, this is fine; the comment in the code documents where to add Upstash Redis when needed.
