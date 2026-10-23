"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ASSIGNMENTS, PEER_REVIEW_DAYS, rangeLabel, type AssignmentId, type Stage } from "@/lib/stages";
import type { TeacherData } from "./TeacherHome";

// Багш хуваарийг бүрэн удирдана: шат нэмэх/устгах, нэр, төрөл, огноо, цаг, оноо, дараалал.
export default function Schedule({ stages, submissions, drafts }: TeacherData) {
  const router = useRouter();
  const [rows, setRows] = useState<Stage[]>(stages);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const dirty = JSON.stringify(rows) !== JSON.stringify(stages);
  const used = (id: string) => submissions.filter((s) => s.stage_id === id).length + drafts.filter((d) => d.stage_id === id).length;

  const set = (id: string, patch: Partial<Stage>) => setRows((r) => r.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const remove = (s: Stage) => confirm(`"${s.label}" шатыг устгах уу?`) && setRows((r) => r.filter((x) => x.id !== s.id));

  // Нэг даалгаврын дотор дээш/доош зөөнө
  function move(s: Stage, dir: -1 | 1) {
    setRows((r) => {
      const group = r.filter((x) => x.assignment === s.assignment);
      const swap = group[group.indexOf(s) + dir];
      if (!swap) return r;
      return r.map((x) => (x === s ? swap : x === swap ? s : x));
    });
  }

  function add(assignment: AssignmentId) {
    const today = new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);
    const n = rows.filter((s) => s.assignment === assignment).length + 1;
    // id-г сервер өөрөө үүсгэнэ
    setRows((r) => [...r, { id: `new-${Date.now()}`, assignment, label: `Шат ${n}`, kind: "text", start: today, end: today, max: 10 }]);
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    const payload = rows.map((s) => ({ ...s, id: s.id.startsWith("new-") ? "" : s.id }));
    const res = await fetch("/api/stages", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stages: payload }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg({ ok: false, text: data.error || "Алдаа" });
    setRows(data);
    setMsg({ ok: true, text: "Хадгаллаа ✓" });
    router.refresh();
  }

  const input = "rounded-lg border border-slate-200 px-2 py-1";

  return (
    <section className="max-w-5xl rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <h2 className="font-display font-bold">🗓 Хуваарь</h2>
      <p className="mt-1 text-sm text-slate-500">
        Шат нэмэх, нэр, төрөл, огноо, оноог өөрчилж болно. Сурагчид эхлэх өдрийн 00:00-оос дуусах цаг хүртэл (Улаанбаатарын цагаар) оруулна —
        цагийг хоосон орхивол 23:59 болно. Хугацаа дууссанаас хойш {PEER_REVIEW_DAYS} хоног хөндлөнгийн үнэлгээ нээлттэй. Бүтээлтэй шатыг устгах
        боломжгүй.
      </p>

      {ASSIGNMENTS.map((a) => {
        const group = rows.filter((s) => s.assignment === a.id);
        return (
          <div key={a.id} className="mt-5">
            <h3 className="font-display font-bold">
              {a.emoji} {a.name}{" "}
              <span className="text-sm font-normal text-slate-400">
                — {group.length} шат, нийт {group.reduce((n, s) => n + (Number(s.max) || 0), 0)} оноо
              </span>
            </h3>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500">
                    <th className="p-2">Дараалал</th>
                    <th className="p-2">Нэр</th>
                    <th className="p-2">Төрөл</th>
                    <th className="p-2">Эхлэх</th>
                    <th className="p-2">Дуусах</th>
                    <th className="p-2">Цаг</th>
                    <th className="p-2">Оноо</th>
                    <th className="p-2" title="Энэ шатны бүтээлийг сайтад нийтэлж болно">
                      Нийтлэх
                    </th>
                    <th className="p-2" />
                  </tr>
                </thead>
                <tbody>
                  {group.map((s, i) => (
                    <tr key={s.id} className="border-t border-slate-50">
                      <td className="whitespace-nowrap p-2 text-slate-400">
                        <button onClick={() => move(s, -1)} disabled={i === 0} className="px-1 disabled:opacity-20">
                          ↑
                        </button>
                        <button onClick={() => move(s, 1)} disabled={i === group.length - 1} className="px-1 disabled:opacity-20">
                          ↓
                        </button>
                      </td>
                      <td className="p-2">
                        <input value={s.label} onChange={(e) => set(s.id, { label: e.target.value })} maxLength={40} className={`${input} w-40`} />
                      </td>
                      <td className="p-2">
                        <select value={s.kind} onChange={(e) => set(s.id, { kind: e.target.value as Stage["kind"] })} className={input}>
                          <option value="text">текст</option>
                          <option value="image">зураг</option>
                        </select>
                      </td>
                      <td className="p-2">
                        <input type="date" value={s.start} onChange={(e) => set(s.id, { start: e.target.value })} className={input} />
                      </td>
                      <td className="p-2">
                        <input type="date" value={s.end} onChange={(e) => set(s.id, { end: e.target.value })} className={input} />
                      </td>
                      <td className="p-2">
                        <input
                          type="time"
                          value={s.endTime ?? ""}
                          onChange={(e) => set(s.id, { endTime: e.target.value || undefined })}
                          title="Хоосон бол 23:59"
                          className={input}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={s.max}
                          onChange={(e) => set(s.id, { max: Number(e.target.value) })}
                          className={`${input} w-16`}
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={!!s.final}
                          onChange={(e) =>
                            setRows((r) =>
                              r.map((x) => (x.assignment === s.assignment ? { ...x, final: x.id === s.id ? e.target.checked : false } : x))
                            )
                          }
                          className="h-4 w-4 accent-violet-600"
                        />
                      </td>
                      <td className="whitespace-nowrap p-2 text-right text-xs">
                        <span className="text-slate-400">{rangeLabel(s)}</span>
                        <button
                          onClick={() => remove(s)}
                          disabled={used(s.id) > 0}
                          title={used(s.id) > 0 ? `${used(s.id)} бүтээл/ноорогтой тул устгах боломжгүй` : "Устгах"}
                          className="ml-2 rounded-lg px-2 py-1 text-rose-500 hover:bg-rose-50 disabled:opacity-25"
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={() => add(a.id)}
              className="mt-2 rounded-xl bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"
            >
              ➕ {a.name}-д шат нэмэх
            </button>
          </div>
        );
      })}

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
        <button
          onClick={save}
          disabled={busy || !dirty}
          className="rounded-xl bg-violet-600 px-5 py-2 font-bold text-white hover:bg-violet-700 disabled:opacity-40"
        >
          {busy ? "Хадгалж байна…" : "Хадгалах"}
        </button>
        {dirty && (
          <button onClick={() => (setRows(stages), setMsg(null))} className="text-sm text-slate-500 hover:underline">
            Буцаах
          </button>
        )}
        {msg && <span className={`text-sm font-semibold ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}>{msg.text}</span>}
        {dirty && !msg && <span className="text-sm text-amber-700">Хадгалаагүй өөрчлөлт байна</span>}
      </div>
    </section>
  );
}
