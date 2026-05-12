// src/app/not-found.tsx
import Link from "next/link";
import { Zap } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <Zap className="w-10 h-10 text-emerald-600 mb-4" />
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Audit not found</h1>
      <p className="text-slate-500 mb-6 max-w-sm">
        This audit link may have expired or been deleted. Run a new one — it only takes 2 minutes.
      </p>
      <Link
        href="/"
        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
      >
        Run a new audit
      </Link>
    </div>
  );
}
