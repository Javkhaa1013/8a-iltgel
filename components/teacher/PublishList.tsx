"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AUTHOR_DISPLAYS, publicName } from "@/lib/names";
import { formatUB, stageEnd } from "@/lib/stages";
import type { TeacherData } from "./TeacherHome";

export default function PublishList({ now, stages, students, submissions, extensions }: TeacherData) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const finals = stages.filter((s) => s.final);
  const names = new Map(students.map((s) => [s.id, s.name]));

  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(id);
    setError("");
    const res = await fetch(`/api/submissions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(null);
    if (!res.ok) setError((await res.json().catch(() => ({}))).error || "Алдаа");
    else router.refresh();
  }
  const toggle = (id: string, published: boolean) => patch(id, { published });

  return (
    <div className="flex flex-col gap-6">
      {finals.map((st) => {
        const ended = new Date(now) > stageEnd(st);
        const list = submissions.filter((s) => s.stage_id === st.id);
        const openExt = extensions.filter((e) => e.stage_id === st.id && new Date(e.until) > new Date(now));
        return (
          <section key={st.id}>
            <h2 className="font-display text-lg font-bold">📰 Нийтлэл · {st.label}</h2>
            <p className="mt-1 text-sm text-slate-500">
              Нийтэлсэн бүтээл нүүр хуудсанд <b>интернэтэд бүх хүнд</b> харагдана — хүүхдийн нэрийг хэрхэн харуулахаа сонгоно уу (анхдагч нь товчилсон
              нэр). Хуулахаас сэргийлж хугацаа ({formatUB(stageEnd(st))}) дууссаны дараа л нийтлэх боломжтой.
            </p>
            {!ended && <p className="mt-2 rounded-xl bg-slate-100 p-3 text-sm font-semibold text-slate-600">🔒 Хугацаа дуусаагүй байна</p>}
            {ended && openExt.length > 0 && (
              <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                ⚠️ {openExt.map((e) => names.get(e.student_id)).join(", ")} сунгалттай байна. Тэд дуусгахаас өмнө нийтэлбэл бусдынхыг харж болзошгүй.
              </p>
            )}
            {error && <p className="mt-2 font-semibold text-rose-600">{error}</p>}
            <div className="mt-3 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
              <table className="w-full min-w-[640px] text-sm">
                <tbody>
                  {list.length === 0 && (
                    <tr>
                      <td className="p-6 text-center text-slate-400">Бүтээл алга</td>
                    </tr>
                  )}
                  {list.map((s) => (
                    <tr key={s.id} className="border-b border-slate-50">
                      <td className="p-3">
                        <Link href={`/teacher/s/${s.id}`} className="font-semibold hover:text-violet-700 hover:underline">
                          {s.title || "(гарчиггүй)"}
                        </Link>
                        <div className="text-xs text-slate-500">
                          {names.get(s.student_id)} · {s.words} үг
                        </div>
                      </td>
                      <td className="p-3">
                        {/* Интернэтэд бүх хүнд харагдах нэр */}
                        <label className="block text-xs text-slate-500">
                          Нийтлэл дээрх нэр
                          <select
                            value={s.author_display}
                            disabled={busy === s.id}
                            onChange={(e) => patch(s.id, { author_display: e.target.value })}
                            className="mt-0.5 block w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800"
                          >
                            {AUTHOR_DISPLAYS.map((d) => (
                              <option key={d.id} value={d.id}>
                                {publicName(names.get(s.student_id) ?? "", d.id)}
                                {d.id === "full" ? " (бүтэн)" : ""}
                              </option>
                            ))}
                          </select>
                        </label>
                      </td>
                      <td className="p-3 text-center">{s.teacher_score ?? "—"} оноо</td>
                      <td className="p-3 text-center">👀 {s.view_count}</td>
                      <td className="p-3 text-right">
                        {s.published ? (
                          <span className="inline-flex items-center gap-2">
                            <Link href={`/n/${s.id}`} className="font-semibold text-emerald-700 hover:underline">
                              ✅ Нийтлэгдсэн
                            </Link>
                            <button disabled={busy === s.id} onClick={() => toggle(s.id, false)} className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100">
                              Нуух
                            </button>
                          </span>
                        ) : (
                          <button
                            disabled={!ended || busy === s.id}
                            onClick={() => toggle(s.id, true)}
                            className="rounded-lg bg-violet-600 px-3 py-1.5 font-bold text-white hover:bg-violet-700 disabled:opacity-40"
                          >
                            🌐 Нийтлэх
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
