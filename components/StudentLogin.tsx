"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function StudentLogin() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/student", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return setError(data.error || "Алдаа гарлаа");
    router.push("/me");
    router.refresh();
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[#0f0a1f] p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
        <div className="text-5xl">🔑</div>
        <h1 className="mt-3 font-display text-xl font-bold">Сурагч нэвтрэх</h1>
        <p className="mt-1 text-sm text-slate-500">Багшаас авсан 6 оронтой кодоо оруулна уу</p>
        <input
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
          className="mt-5 w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-center font-mono text-3xl font-bold tracking-[0.3em] outline-none focus:border-violet-500"
          placeholder="ABC234"
          autoComplete="off"
          autoCapitalize="characters"
          inputMode="text"
        />
        {error && <p className="mt-2 text-sm font-semibold text-rose-600">{error}</p>}
        <button disabled={loading || code.length !== 6} className="mt-4 w-full rounded-xl bg-violet-600 py-3 font-bold text-white hover:bg-violet-700 disabled:opacity-50">
          {loading ? "Шалгаж байна…" : "Нэвтрэх"}
        </button>
        <Link href="/" className="mt-4 inline-block text-sm text-slate-500 hover:underline">
          ← Нүүр хуудас
        </Link>
      </form>
    </div>
  );
}
