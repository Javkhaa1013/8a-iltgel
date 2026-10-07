"use client";

import Link from "next/link";
import { ASSIGNMENTS } from "@/lib/stages";
import type { TeacherData } from "./TeacherHome";

export default function Integrity({ stages, students, submissions, flags }: TeacherData) {
  const names = new Map(students.map((s) => [s.id, s.name]));
  const byId = new Map(submissions.map((s) => [s.id, s]));
  const label = (subId: string) => {
    const s = byId.get(subId)!;
    const st = stages.find((x) => x.id === s.stage_id);
    return `${names.get(s.student_id)} — ${ASSIGNMENTS.find((a) => a.id === st?.assignment)?.name} ${st?.label}`;
  };
  // Текстийнхээ ихэнхийг хуулж тавьсан бүтээлүүд
  const pasted = submissions.filter((s) => s.body_chars > 200 && s.paste_chars > s.body_chars * 0.5);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <h2 className="font-display font-bold">🔁 Ижил төстэй текст</h2>
        <p className="mt-1 text-sm text-slate-500">
          Хоёр өөр сурагчийн бүтээлд ижил 5 үгийн хэллэг олон давхцсан бол энд гарна (20%-иас дээш). Энэ нь заавал хуулсан гэсэн үг биш —
          өөрөө уншиж шийднэ үү.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {flags.length === 0 && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">✅ Сэжигтэй давхцал илрээгүй</p>}
          {flags.map((f) => (
            <div key={f.a + f.b} className="rounded-xl bg-rose-50 p-3 text-sm">
              <div className="font-display text-lg font-bold text-rose-700">{f.percent}% давхцал</div>
              <Link href={`/teacher/s/${f.a}`} className="block hover:underline">
                {label(f.a)}
              </Link>
              <Link href={`/teacher/s/${f.b}`} className="block hover:underline">
                {label(f.b)}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <h2 className="font-display font-bold">📋 Хуулж тавьсан текст</h2>
        <p className="mt-1 text-sm text-slate-500">
          Бичих талбарт гараас бичилгүй, өөр газраас хуулж (paste) оруулсан тэмдэгт нь текстийн талаас илүү хувийг эзэлсэн бүтээлүүд. Word-д бичээд
          хуулсан байж ч болно.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {pasted.length === 0 && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">✅ Алга</p>}
          {pasted.map((s) => (
            <Link key={s.id} href={`/teacher/s/${s.id}`} className="rounded-xl bg-amber-50 p-3 text-sm hover:underline">
              <b>{label(s.id)}</b>
              <div className="text-amber-800">
                Хуулж тавьсан: {s.paste_chars.toLocaleString()} тэмдэгт / нийт {s.body_chars.toLocaleString()}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
