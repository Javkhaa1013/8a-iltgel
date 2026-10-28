"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ASSIGNMENTS, ATTENDANCE_MAX, rangeLabel, windowState } from "@/lib/stages";
import type { TeacherData } from "./TeacherHome";

export default function Gradebook({ now, stages, students, submissions, extensions, drafts }: TeacherData) {
  const router = useRouter();
  const [error, setError] = useState("");
  const at = new Date(now);

  async function saveStudent(id: string, field: "attendance_score" | "bonus_score", value: string) {
    setError("");
    const res = await fetch(`/api/students/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value === "" ? null : Number(value) }),
    });
    if (!res.ok) setError((await res.json().catch(() => ({}))).error || "Хадгалж чадсангүй");
    else router.refresh();
  }

  function exportCsv() {
    const header = ["Нэр", `Ирц/идэвх (${ATTENDANCE_MAX})`, ...stages.map((s) => `${ASSIGNMENTS.find((a) => a.id === s.assignment)?.name} ${s.label} (${s.max})`), "Нэмэлт", "Нийт"];
    const rows = students.map((s) => [s.name, s.totals.attendance ?? "", ...s.totals.stageScores.map((x) => x ?? ""), s.totals.bonus || "", s.totals.total]);
    const csv = "﻿" + [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "8A-onoo.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!students.length) return <p className="rounded-2xl bg-white p-8 text-center text-slate-500">Эхлээд &quot;Сурагчид ба код&quot; хэсэгт ангийн нэрсийг оруулна уу.</p>;

  const counts = stages.map((st) => submissions.filter((s) => s.stage_id === st.id).length);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
        <span>
          ✅ илгээсэн · ⏰ хоцорч нөхсөн · ⏳ нээлттэй, илгээгээгүй · ❌ хугацаа дууссан, илгээгээгүй · 📝 илгээгээгүй ноорог байна · ⌛ сунгалттай ·
          🔓 нөхөлт нээлттэй · нүдэн дээр дарж үнэлнэ
        </span>
        <button onClick={exportCsv} className="ml-auto rounded-xl bg-white px-3 py-2 font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
          ⬇️ Excel (CSV)
        </button>
      </div>
      {error && <p className="mb-2 font-semibold text-rose-600">{error}</p>}
      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
              <th className="sticky left-0 bg-white p-3">Сурагч</th>
              <th className="p-3 text-center">
                Ирц, идэвх
                <br />/{ATTENDANCE_MAX}
              </th>
              {stages.map((st, i) => (
                <th key={st.id} className="p-3 text-center">
                  {ASSIGNMENTS.find((a) => a.id === st.assignment)?.emoji} {st.label}
                  <br />
                  <span className="font-normal">
                    {rangeLabel(st)} · /{st.max} · {counts[i]}/{students.length}
                  </span>
                </th>
              ))}
              <th className="p-3 text-center">Нэмэлт</th>
              <th className="p-3 text-center">Нийт</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-b border-slate-50 hover:bg-violet-50/40">
                <td className="sticky left-0 bg-white p-3 font-semibold">
                  <Link href={`/teacher/student/${s.id}`} className="hover:text-violet-700 hover:underline">
                    {s.name}
                  </Link>
                </td>
                <td className="p-2 text-center">
                  <input
                    type="number"
                    min={0}
                    max={ATTENDANCE_MAX}
                    defaultValue={s.attendance_score ?? ""}
                    onBlur={(e) => e.target.value !== String(s.attendance_score ?? "") && saveStudent(s.id, "attendance_score", e.target.value)}
                    className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-center"
                  />
                </td>
                {stages.map((st) => {
                  const sub = submissions.find((x) => x.student_id === s.id && x.stage_id === st.id);
                  const ext = extensions.find((e) => e.student_id === s.id && e.stage_id === st.id);
                  const state = windowState(st, ext?.until, at);
                  const draft = drafts.find((d) => d.student_id === s.id && d.stage_id === st.id);
                  const unsentDraft = draft ?? null; // илгээх үед ноорог устдаг
                  const icon = sub ? (sub.late ? "⏰" : "✅") : state === "upcoming" ? "·" : state === "open" ? "⏳" : "❌";
                  const cell = (
                    <span className="inline-flex items-center gap-1">
                      <span title={sub?.late ? "Хугацаа дууссаны дараа нөхөж илгээсэн" : undefined}>{icon}</span>
                      {ext && <span title="Сунгалттай">⌛</span>}
                      {!sub && st.catchup && state === "closed" && <span title="Нөхөлт нээлттэй — сурагч нөхөж оруулж болно">🔓</span>}
                      {sub && <b className={sub.teacher_score === null ? "text-slate-300" : ""}>{sub.teacher_score ?? "—"}</b>}
                    </span>
                  );
                  return (
                    <td key={st.id} className="whitespace-nowrap p-2 text-center">
                      {sub ? (
                        <Link href={`/teacher/s/${sub.id}`} className="rounded-lg px-2 py-1 hover:bg-violet-100">
                          {cell}
                        </Link>
                      ) : (
                        cell
                      )}
                      {unsentDraft && (
                        <Link href={`/teacher/draft/${unsentDraft.id}`} title="Илгээгээгүй ноорог" className="ml-0.5 rounded px-1 hover:bg-amber-100">
                          📝
                        </Link>
                      )}
                    </td>
                  );
                })}
                <td className="p-2 text-center">
                  <input
                    type="number"
                    min={0}
                    max={20}
                    defaultValue={s.bonus_score ?? ""}
                    onBlur={(e) => e.target.value !== String(s.bonus_score ?? "") && saveStudent(s.id, "bonus_score", e.target.value)}
                    className="w-14 rounded-lg border border-slate-200 px-2 py-1 text-center"
                  />
                </td>
                <td className="p-3 text-center font-display font-bold">{s.totals.total}</td>
                <td className="p-2">
                  <Link href={`/teacher/report/${s.id}`} className="whitespace-nowrap rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold hover:bg-slate-200">
                    📄 Тайлан
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
