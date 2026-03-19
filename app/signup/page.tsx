
"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setError("");

    // Client-side domain check (server trigger also enforces this)
    if (!email.toLowerCase().endsWith("@getzeal.io")) {
      setError("Only @getzeal.io email addresses can sign up.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + "/auth/confirm",
      },
    });

    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="max-w-sm rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
          <div className="mb-2 text-2xl">📧</div>
          <h2 className="text-lg font-semibold text-white">Check your email</h2>
          <p className="mt-2 text-sm text-zinc-400">
            We sent a confirmation link to <strong className="text-white">{email}</strong>.
            Click it to activate your account.
          </p>
          <a href="/login" className="mt-4 inline-block text-sm text-indigo-400 hover:text-indigo-300">
            Back to login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-2xl font-bold text-white">Request Access</div>
          <div className="mt-1 text-sm text-zinc-500">Zeal Finance Hub · @getzeal.io only</div>
        </div>

        <form onSubmit={handleSignup} className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Work Email</label>
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
              placeholder="Min 6 characters"
              required
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat password"
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
            {loading ? "Creating account…" : "Create account"}
          </button>

          <p className="text-center text-xs text-zinc-500">
            Already have an account?{" "}
            <a href="/login" className="text-indigo-400 hover:text-indigo-300">Sign in</a>
          </p>
        </form>
      </div>
    </div>
  );
}
