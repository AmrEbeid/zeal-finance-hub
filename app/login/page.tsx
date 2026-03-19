
"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError("");

    const { error: err } = await supabase.auth.signInWithPassword({ email, password });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    const redirectTo = params.get("redirectTo") || "/";
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-2xl font-bold text-white">Zeal Finance Hub</div>
          <div className="mt-1 text-sm text-zinc-500">Sign in to your account</div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@getzeal.io"
              required
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <p className="text-center text-xs text-zinc-500">
            Don&apos;t have an account?{" "}
            <a href="/signup" className="text-indigo-400 hover:text-indigo-300">
              Request access
            </a>
          </p>
        </form>

        <p className="mt-4 text-center text-xs text-zinc-600">
          Only @getzeal.io email addresses are permitted.
        </p>
      </div>
    </div>
  );
}
