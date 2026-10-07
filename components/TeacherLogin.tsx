"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function TeacherLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/teacher", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) router.refresh();
    else setError((await res.json().catch(() => ({}))).error || "Алдаа гарлаа");
  }

  return (
    <div className="grid min-h-screen place-items-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-xl">
        <div className="text-5xl">👩‍🏫</div>
        <h1 className="mt-3 text-xl font-extrabold">Багш нэвтрэх</h1>
        <p className="mt-1 text-sm text-slate-500">Сурагчдын бүтээлийг үнэлэх, нийтлэх, тайлан гаргах</p>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-5 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          placeholder="Нууц үг"
        />
        {error && <p className="mt-2 text-sm font-semibold text-rose-600">{error}</p>}
        <button disabled={loading || !password} className="mt-4 w-full rounded-xl bg-indigo-600 py-3 font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
          {loading ? "Шалгаж байна…" : "Нэвтрэх"}
        </button>
        <Link href="/" className="mt-4 inline-block text-sm text-slate-500 hover:underline">
          ← Нүүр хуудас
        </Link>
      </form>
    </div>
  );
}
