
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ConfirmPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data, error }) => {
      if (error || !data.session) {
        setStatus("error");
      } else {
        setStatus("success");
        setTimeout(() => router.push("/"), 2000);
      }
    });
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
        {status === "loading" && (
          <><div className="text-2xl mb-2">⏳</div><p className="text-zinc-400">Confirming your email…</p></>
        )}
        {status === "success" && (
          <><div className="text-2xl mb-2">✅</div><p className="text-emerald-400 font-semibold">Email confirmed!</p><p className="mt-1 text-sm text-zinc-500">Redirecting to dashboard…</p></>
        )}
        {status === "error" && (
          <><div className="text-2xl mb-2">❌</div><p className="text-red-400 font-semibold">Confirmation failed</p><a href="/login" className="mt-2 inline-block text-sm text-indigo-400">Back to login</a></>
        )}
      </div>
    </div>
  );
}
