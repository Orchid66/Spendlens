// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SpendLens — Free AI Spend Audit for Startups",
  description:
    "Audit your team's AI tool spend in 2 minutes. See exactly where you're overpaying, what to switch, and how much you could save.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://spendlens.vercel.app"),
  openGraph: {
    title: "SpendLens — Free AI Spend Audit",
    description: "See exactly where your team is overspending on AI tools. Free, instant, no login.",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SpendLens — Free AI Spend Audit",
    description: "See exactly where your team is overspending on AI tools. Free, instant, no login.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
