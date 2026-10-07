"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ASSIGNMENTS, PEER_REVIEW_DAYS, type Stage } from "@/lib/stages";

export default function Schedule({ stages }: { stages: Stage[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(stages);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const set = (id: string, patch: Partial<Stage>) => setRows((r) => r.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  async function save() {
    const res = await fetch("/api/stages", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stages: rows }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setMsg({ ok: false, text: data.error || "Алдаа" });
    setMsg({ ok: true, text: "Хадгаллаа ✓" });
    router.refresh();
  }

  return (
    <section className="max-w-3xl rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <h2 className="font-display font-bold">🗓 Хуваарь</h2>
      <p className="mt-1 text-sm text-slate-500">
        Сурагчид зөвхөн эхлэх өдрийн 00:00-оос дуусах өдрийн 23:59 хүртэл (Улаанбаатарын цагаар) оруулна. Хугацаа дууссаны дараа{" "}
        {PEER_REVIEW_DAYS} хоног хөндлөнгийн үнэлгээ нээлттэй. Тодорхой сурагчид сунгалт өгөхдөө сурагчийн нэр дээр дарна.
      </p>
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-500">
            <th className="p-2">Даалгавар</th>
            <th className="p-2">Эхлэх</th>
            <th className="p-2">Дуусах</th>
            <th className="p-2">Оноо</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id} className="border-t border-slate-50">
              <td className="p-2 font-semibold">
                {ASSIGNMENTS.find((a) => a.id === s.assignment)?.emoji} {s.label}
                <span className="ml-1 text-xs font-normal text-slate-400">{s.kind === "image" ? "зураг" : "текст"}</span>
              </td>
              <td className="p-2">
                <input type="date" value={s.start} onChange={(e) => set(s.id, { start: e.target.value })} className="rounded-lg border border-slate-200 px-2 py-1" />
              </td>
              <td className="p-2">
                <input type="date" value={s.end} onChange={(e) => set(s.id, { end: e.target.value })} className="rounded-lg border border-slate-200 px-2 py-1" />
              </td>
              <td className="p-2">
                <input type="number" min={0} max={100} value={s.max} onChange={(e) => set(s.id, { max: Number(e.target.value) })} className="w-16 rounded-lg border border-slate-200 px-2 py-1" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 flex items-center gap-3">
        <button onClick={save} className="rounded-xl bg-violet-600 px-5 py-2 font-bold text-white hover:bg-violet-700">
          Хадгалах
        </button>
        {msg && <span className={`text-sm font-semibold ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}>{msg.text}</span>}
      </div>
    </section>
  );
}
