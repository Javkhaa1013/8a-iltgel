"use client";

import Link from "next/link";
import { useState } from "react";
import { ASSIGNMENTS, formatUB } from "@/lib/stages";
import type { TeacherData } from "./TeacherHome";

// Хөндлөнгийн үнэлгээний хяналт: хэн хэнийг үнэлэх ёстой, үнэлсэн эсэх, хэдэн үнэлгээ хүлээн авсан
export default function PeerOverview({ stages, students, peer }: TeacherData) {
  const [stageId, setStageId] = useState(peer.find((p) => p.open)?.stage_id ?? peer.at(-1)?.stage_id ?? "");
  const name = new Map(students.map((s) => [s.id, s.name]));

  if (!peer.length)
    return (
      <p className="rounded-2xl bg-white p-8 text-center text-slate-500">
        Хөндлөнгийн үнэлгээ үе шатын хугацаа дууссаны дараа нээгдэнэ. Эхнийх нь Ноорог-1-ийн хугацаа дуусмагц эхэлнэ.
      </p>
    );

  const current = peer.find((p) => p.stage_id === stageId) ?? peer[0];
  const st = stages.find((s) => s.id === current.stage_id)!;
  const assignment = ASSIGNMENTS.find((a) => a.id === st.assignment)!;
  const withTargets = current.rows.filter((r) => r.targets.length);
  const complete = withTargets.filter((r) => r.targets.every((t) => t.done)).length;
  const reviewsDone = current.rows.reduce((n, r) => n + r.targets.filter((t) => t.done).length, 0);
  const reviewsTotal = current.rows.reduce((n, r) => n + r.targets.length, 0);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {peer.map((p) => {
          const s = stages.find((x) => x.id === p.stage_id)!;
          return (
            <button
              key={p.stage_id}
              onClick={() => setStageId(p.stage_id)}
              className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${
                p.stage_id === current.stage_id ? "bg-emerald-600 text-white" : "bg-white text-slate-600 hover:bg-emerald-50"
              }`}
            >
              {ASSIGNMENTS.find((a) => a.id === s.assignment)?.emoji} {s.label}
              <span className="ml-1 text-xs opacity-80">{p.open ? "· нээлттэй" : "· хаагдсан"}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Бүрэн үнэлсэн сурагч" value={`${complete}/${withTargets.length}`} />
        <Stat label="Хийгдсэн үнэлгээ" value={`${reviewsDone}/${reviewsTotal}`} />
        <Stat label={current.open ? "Хаагдах хугацаа" : "Хаагдсан"} value={formatUB(current.ends)} />
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
              <th className="p-3">Сурагч</th>
              <th className="p-3">
                Үнэлэх ёстой ({assignment.name} {st.label})
              </th>
              <th className="p-3 text-center">Өөрийн үнэлгээ</th>
              <th className="p-3 text-center">Хүлээн авсан</th>
            </tr>
          </thead>
          <tbody>
            {current.rows.map((r) => {
              const allDone = r.targets.length > 0 && r.targets.every((t) => t.done);
              return (
                <tr key={r.student_id} className={`border-b border-slate-50 ${!allDone && r.targets.length ? "bg-amber-50/40" : ""}`}>
                  <td className="p-3 font-semibold">
                    <Link href={`/teacher/student/${r.student_id}`} className="hover:underline">
                      {name.get(r.student_id)}
                    </Link>
                    {!r.submitted && <span className="ml-1 text-xs font-normal text-slate-400">(илгээгээгүй)</span>}
                  </td>
                  <td className="p-3">
                    {r.targets.length ? (
                      <div className="flex flex-wrap gap-2">
                        {r.targets.map((t) => (
                          <Link
                            key={t.submission_id}
                            href={`/teacher/s/${t.submission_id}`}
                            className={`rounded-lg px-2 py-1 text-xs font-semibold ${t.done ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}
                          >
                            {t.done ? "✅" : "⏳"} {name.get(t.author_id)}
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Хуваарилагдаагүй (сунгалттай эсвэл бүтээл цөөн)</span>
                    )}
                  </td>
                  <td className="p-3 text-center">{r.submitted ? (r.selfDone ? "✅" : "—") : ""}</td>
                  <td className="p-3 text-center">{r.submitted ? r.received : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Хүн бүр бүтээл илгээсэн 2 ангийнхнаа нэргүйгээр үнэлнэ. Сурагчид бие биенийхээ нэрийг харахгүй — энд зөвхөн багшид харагдана.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
      <div className="text-xs font-bold text-slate-400">{label}</div>
      <div className="font-display text-lg font-bold">{value}</div>
    </div>
  );
}
