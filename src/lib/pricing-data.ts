// src/lib/pricing-data.ts
// All prices in USD/month per seat unless noted.
// Sources verified — see PRICING_DATA.md for URLs and dates.

export type Plan = {
  id: string;
  name: string;
  pricePerSeat: number | null; // null = usage-based or custom/enterprise
  minSeats?: number;
  maxSeats?: number;
  features: string[];
  usageNotes?: string;
};

export type Tool = {
  id: string;
  name: string;
  category: "coding" | "chat" | "api" | "mixed";
  plans: Plan[];
  description: string;
};

export const TOOLS: Record<string, Tool> = {
  cursor: {
    id: "cursor",
    name: "Cursor",
    category: "coding",
    description: "AI-first code editor",
    plans: [
      {
        id: "hobby",
        name: "Hobby",
        pricePerSeat: 0,
        features: ["2,000 completions/mo", "50 slow requests"],
      },
      {
        id: "pro",
        name: "Pro",
        pricePerSeat: 20,
        features: ["Unlimited completions", "500 fast requests/mo", "Claude/GPT-4o"],
      },
      {
        id: "business",
        name: "Business",
        pricePerSeat: 40,
        features: ["Everything in Pro", "SSO", "Admin dashboard", "Centralized billing"],
      },
      {
        id: "enterprise",
        name: "Enterprise",
        pricePerSeat: null,
        features: ["Custom pricing", "On-prem option", "Dedicated support"],
      },
    ],
  },

  github_copilot: {
    id: "github_copilot",
    name: "GitHub Copilot",
    category: "coding",
    description: "AI pair programmer by GitHub/Microsoft",
    plans: [
      {
        id: "individual",
        name: "Individual",
        pricePerSeat: 10,
        features: ["Code suggestions", "Chat in IDE", "CLI"],
      },
      {
        id: "business",
        name: "Business",
        pricePerSeat: 19,
        features: ["Team management", "Audit logs", "IP indemnity"],
      },
      {
        id: "enterprise",
        name: "Enterprise",
        pricePerSeat: 39,
        features: ["Codebase personalization", "Fine-tuning", "Security scanning"],
      },
    ],
  },

  claude: {
    id: "claude",
    name: "Claude (Anthropic)",
    category: "chat",
    description: "Anthropic's Claude AI assistant",
    plans: [
      {
        id: "free",
        name: "Free",
        pricePerSeat: 0,
        features: ["Limited usage", "Claude 3.5 Haiku"],
      },
      {
        id: "pro",
        name: "Pro",
        pricePerSeat: 20,
        features: ["5× more usage", "Claude 3.5 Sonnet", "Projects"],
      },
      {
        id: "max",
        name: "Max",
        pricePerSeat: 100,
        features: ["20× usage vs Pro", "Claude 3.5 Opus", "Extended thinking"],
        usageNotes: "$100 for 5x, $200 for 20x",
      },
      {
        id: "team",
        name: "Team",
        pricePerSeat: 30,
        minSeats: 5,
        features: ["Shared Projects", "Admin console", "Higher rate limits"],
      },
      {
        id: "enterprise",
        name: "Enterprise",
        pricePerSeat: null,
        features: ["SSO/SAML", "Custom context", "SLAs"],
      },
      {
        id: "api",
        name: "API Direct",
        pricePerSeat: null,
        features: ["Pay per token", "All models"],
        usageNotes: "Usage-based billing",
      },
    ],
  },

  chatgpt: {
    id: "chatgpt",
    name: "ChatGPT (OpenAI)",
    category: "chat",
    description: "OpenAI's ChatGPT assistant",
    plans: [
      {
        id: "free",
        name: "Free",
        pricePerSeat: 0,
        features: ["GPT-3.5", "Limited GPT-4o"],
      },
      {
        id: "plus",
        name: "Plus",
        pricePerSeat: 20,
        features: ["GPT-4o priority", "DALL-E", "Advanced data analysis"],
      },
      {
        id: "team",
        name: "Team",
        pricePerSeat: 30,
        minSeats: 2,
        features: ["Team workspace", "Higher limits", "Admin console"],
      },
      {
        id: "enterprise",
        name: "Enterprise",
        pricePerSeat: null,
        features: ["SSO", "Unlimited GPT-4o", "Custom compliance"],
      },
      {
        id: "api",
        name: "API Direct",
        pricePerSeat: null,
        features: ["Pay per token"],
        usageNotes: "Usage-based billing",
      },
    ],
  },

  anthropic_api: {
    id: "anthropic_api",
    name: "Anthropic API Direct",
    category: "api",
    description: "Direct API access to Claude models",
    plans: [
      {
        id: "usage",
        name: "Usage-based",
        pricePerSeat: null,
        features: ["All Claude models", "Pay per token"],
        usageNotes: "Haiku: $0.80/MTok in. Sonnet: $3/MTok in. Opus: $15/MTok in.",
      },
    ],
  },

  openai_api: {
    id: "openai_api",
    name: "OpenAI API Direct",
    category: "api",
    description: "Direct API access to GPT models",
    plans: [
      {
        id: "usage",
        name: "Usage-based",
        pricePerSeat: null,
        features: ["All OpenAI models", "Pay per token"],
        usageNotes: "GPT-4o: $2.50/MTok in. GPT-4o mini: $0.15/MTok in.",
      },
    ],
  },

  gemini: {
    id: "gemini",
    name: "Gemini (Google)",
    category: "chat",
    description: "Google's Gemini AI assistant",
    plans: [
      {
        id: "free",
        name: "Free",
        pricePerSeat: 0,
        features: ["Gemini 1.5 Flash", "Basic features"],
      },
      {
        id: "advanced",
        name: "Advanced (Google One AI Premium)",
        pricePerSeat: 19.99,
        features: ["Gemini Ultra", "2TB Google storage", "Deep Research"],
      },
      {
        id: "business",
        name: "Workspace Business",
        pricePerSeat: 30,
        features: ["Gemini in Workspace apps", "Admin controls"],
      },
      {
        id: "api",
        name: "API Direct",
        pricePerSeat: null,
        features: ["Gemini Pro/Ultra API access", "Pay per token"],
        usageNotes: "Usage-based billing",
      },
    ],
  },

  windsurf: {
    id: "windsurf",
    name: "Windsurf (Codeium)",
    category: "coding",
    description: "AI code editor by Codeium",
    plans: [
      {
        id: "free",
        name: "Free",
        pricePerSeat: 0,
        features: ["Unlimited autocomplete", "25 flow credits/mo"],
      },
      {
        id: "pro",
        name: "Pro",
        pricePerSeat: 15,
        features: ["500 flow credits/mo", "Priority models", "Claude/GPT-4o"],
      },
      {
        id: "teams",
        name: "Teams",
        pricePerSeat: 35,
        minSeats: 2,
        features: ["All Pro features", "Admin dashboard", "SSO"],
      },
    ],
  },
};

export const USE_CASES = [
  { id: "coding", label: "Coding / Engineering" },
  { id: "writing", label: "Writing / Content" },
  { id: "data", label: "Data Analysis" },
  { id: "research", label: "Research" },
  { id: "mixed", label: "Mixed / General" },
] as const;

export type UseCase = (typeof USE_CASES)[number]["id"];

export function getToolById(id: string): Tool | undefined {
  return TOOLS[id];
}

export function getPlanById(toolId: string, planId: string): Plan | undefined {
  return TOOLS[toolId]?.plans.find((p) => p.id === planId);
}

export function getMonthlySpend(toolId: string, planId: string, seats: number): number {
  const plan = getPlanById(toolId, planId);
  if (!plan || plan.pricePerSeat === null) return 0;
  return plan.pricePerSeat * seats;
}
