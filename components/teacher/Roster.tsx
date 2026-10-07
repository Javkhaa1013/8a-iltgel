"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Student } from "@/lib/types";

export default function Roster({ students }: { students: Student[] }) {
  const router = useRouter();
  const [names, setNames] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function call(url: string, method: string, body?: unknown) {
    setBusy(true);
    setError("");
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error || "Алдаа гарлаа");
      return false;
    }
    router.refresh();
    return true;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <h2 className="font-display font-bold">➕ Сурагч нэмэх</h2>
        <p className="mt-1 text-sm text-slate-500">Мөр бүрт нэг нэр. Excel-ээс хуулж тавьж болно. Хүүхэд бүрт нэвтрэх код автоматаар үүснэ.</p>
        <textarea
          value={names}
          onChange={(e) => setNames(e.target.value)}
          placeholder={"Бат-Эрдэнэ\nСарангэрэл\nТэмүүлэн"}
          className="mt-3 min-h-48 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-violet-400"
        />
        {error && <p className="mt-1 text-sm font-semibold text-rose-600">{error}</p>}
        <button
          disabled={busy || !names.trim()}
          onClick={async () => (await call("/api/students", "POST", { names })) && setNames("")}
          className="mt-2 w-full rounded-xl bg-violet-600 py-2.5 font-bold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          Нэмэх
        </button>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center gap-3">
          <h2 className="font-display font-bold">👥 Анги ({students.length})</h2>
          {students.length > 0 && (
            <Link href="/teacher/codes" target="_blank" className="ml-auto rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold hover:bg-slate-200">
              🖨️ Код хэвлэх
            </Link>
          )}
        </div>
        <p className="mt-1 text-sm text-slate-500">Кодыг хүүхэд бүрт тусад нь өгнө үү. Код алдагдвал &quot;Шинэ код&quot; дарахад хуучин код ажиллахаа болино.</p>
        <table className="mt-3 w-full text-sm">
          <tbody>
            {students.map((s, i) => (
              <tr key={s.id} className="border-b border-slate-50">
                <td className="w-8 p-2 text-slate-400">{i + 1}</td>
                <td className="p-2">
                  <input
                    defaultValue={s.name}
                    onBlur={(e) => e.target.value.trim() !== s.name && call(`/api/students/${s.id}`, "PATCH", { name: e.target.value })}
                    className="w-full rounded-lg px-2 py-1 hover:bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-200"
                  />
                </td>
                <td className="p-2 font-mono text-base font-bold tracking-widest">{s.login_code}</td>
                <td className="whitespace-nowrap p-2 text-right">
                  <button
                    disabled={busy}
                    onClick={() => confirm(`${s.name}-д шинэ код үүсгэх үү? Хуучин код ажиллахаа болино.`) && call(`/api/students/${s.id}`, "PATCH", { reset_code: true })}
                    className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
                  >
                    🔄 Шинэ код
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => confirm(`${s.name}-г бүх бүтээлтэй нь УСТГАХ уу? Буцаах боломжгүй.`) && call(`/api/students/${s.id}`, "DELETE")}
                    className="rounded-lg px-2 py-1 text-rose-500 hover:bg-rose-50"
                  >
                    🗑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
