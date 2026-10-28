"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ASSIGNMENTS, formatUB, stageEnd, timeLeft, windowState } from "@/lib/stages";
import type { TeacherData } from "./TeacherHome";

// Самбарын дээд талд: нээлттэй даалгаврын илгээгээгүй хүүхдүүд, хийгдээгүй хөндлөнгийн үнэлгээ.
// Нэрсийг хуулж ангийн групп руу сануулга болгон явуулж болно.

function CopyNames({ names }: { names: string[] }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(names.join(", "));
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          prompt("Хуулж авна уу:", names.join(", "));
        }
      }}
      className="shrink-0 rounded-lg bg-white/80 px-2.5 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-white"
    >
      {copied ? "✅ Хуулсан" : "📋 Нэрс хуулах"}
    </button>
  );
}

export default function DeadlineAlerts({ now, stages, students, submissions, extensions, drafts, peer, onOpenPeer }: TeacherData & { onOpenPeer: () => void }) {
  const router = useRouter();
  const at = new Date(now);
  const name = new Map(students.map((s) => [s.id, s.name]));
  const [busy, setBusy] = useState("");

  // Нөхөлтийг нэг товшилтоор нээх/хаах (Хуваарь хэсэгт ч байгаа тохиргоо)
  async function toggleCatchup(stageId: string, on: boolean) {
    setBusy(stageId);
    const payload = stages.map((s) => (s.id === stageId ? { ...s, catchup: on || undefined } : s));
    const res = await fetch("/api/stages", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stages: payload }),
    });
    setBusy("");
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Хадгалж чадсангүй");
      return;
    }
    router.refresh();
  }

  // Хугацаа нь дууссан, илгээгээгүй хүүхэдтэй шатууд — нөхөлт нээх боломжтой
  const closedMissing = stages
    .filter((st) => windowState(st, null, at) === "closed")
    .map((st) => ({
      st,
      missing: students.filter(
        (s) =>
          !submissions.some((x) => x.student_id === s.id && x.stage_id === st.id) &&
          // сунгалт нь хүчинтэй хүүхэд дээрх "сунгалттай" хэсэгт гарна
          !extensions.some((e) => e.student_id === s.id && e.stage_id === st.id && windowState(st, e.until, at) === "open")
      ),
      lateCount: submissions.filter((x) => x.stage_id === st.id && x.late).length,
    }))
    .filter(({ st, missing, lateCount }) => st.catchup || missing.length > 0 || lateCount > 0)
    .sort((a, b) => stageEnd(b.st).getTime() - stageEnd(a.st).getTime())
    .slice(0, 3);

  const openStages = stages
    .filter((st) => windowState(st, null, at) === "open")
    .map((st) => {
      const missing = students.filter((s) => !submissions.some((x) => x.student_id === s.id && x.stage_id === st.id));
      const left = stageEnd(st).getTime() - at.getTime();
      return { st, missing, left, urgent: left < 48 * 3600_000 };
    })
    .sort((a, b) => a.left - b.left);

  // Хугацаа нь дууссан ч сунгалттай, хараахан илгээгээгүй
  const extended = stages.flatMap((st) =>
    windowState(st, null, at) === "closed"
      ? extensions
          .filter((e) => e.stage_id === st.id && windowState(st, e.until, at) === "open")
          .filter((e) => !submissions.some((x) => x.student_id === e.student_id && x.stage_id === st.id))
          .map((e) => ({ st, e }))
      : []
  );

  const peerOpen = peer
    .filter((p) => p.open)
    .map((p) => ({
      p,
      st: stages.find((s) => s.id === p.stage_id)!,
      pending: p.rows.filter((r) => r.targets.some((t) => !t.done)).map((r) => name.get(r.student_id) ?? "?"),
    }))
    .filter((x) => x.pending.length);

  if (!openStages.length && !extended.length && !peerOpen.length && !closedMissing.length) return null;

  const label = (stageId: string) => {
    const st = stages.find((s) => s.id === stageId)!;
    return `${ASSIGNMENTS.find((a) => a.id === st.assignment)?.emoji} ${ASSIGNMENTS.find((a) => a.id === st.assignment)?.name} · ${st.label}`;
  };

  return (
    <div className="mt-4 grid gap-3 lg:grid-cols-2">
      {openStages.map(({ st, missing, left, urgent }) => (
        <div key={st.id} className={`rounded-2xl p-4 ring-1 ${urgent ? "bg-rose-50 ring-rose-200" : "bg-violet-50 ring-violet-100"}`}>
          <div className="flex flex-wrap items-center gap-2">
            <b>{label(st.id)}</b>
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${urgent ? "bg-rose-600 text-white" : "bg-violet-600 text-white"}`}>
              ⏳ {timeLeft(stageEnd(st), at)} үлдсэн
            </span>
            <span className="ml-auto text-sm font-semibold text-slate-600">
              {students.length - missing.length}/{students.length} илгээсэн
            </span>
          </div>
          {missing.length > 0 ? (
            <>
              <div className="mt-2 flex items-start gap-2">
                <p className="flex-1 text-sm text-slate-700">
                  <span className="font-semibold">Илгээгээгүй ({missing.length}):</span>{" "}
                  {missing.map((s, i) => {
                    const hasDraft = drafts.some((d) => d.student_id === s.id && d.stage_id === st.id);
                    return (
                      <span key={s.id}>
                        {i > 0 && ", "}
                        <Link href={`/teacher/student/${s.id}`} className="hover:underline">
                          {s.name}
                        </Link>
                        {hasDraft && <span title="Ноорог бичиж байгаа, илгээгээгүй"> 📝</span>}
                      </span>
                    );
                  })}
                </p>
                <CopyNames names={missing.map((s) => s.name)} />
              </div>
              <p className="mt-1 text-xs text-slate-500">📝 — ноорог бичиж эхэлсэн ч илгээгээгүй · хугацаа {formatUB(stageEnd(st))}</p>
            </>
          ) : (
            <p className="mt-2 text-sm font-semibold text-emerald-700">🎉 Бүгд илгээсэн</p>
          )}
        </div>
      ))}

      {closedMissing.map(({ st, missing, lateCount }) => (
        <div key={`c-${st.id}`} className={`rounded-2xl p-4 ring-1 ${st.catchup ? "bg-amber-50 ring-amber-200" : "bg-slate-50 ring-slate-200"}`}>
          <div className="flex flex-wrap items-center gap-2">
            <b>{label(st.id)}</b>
            <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs font-bold text-white">⛔ {formatUB(stageEnd(st), false)}-д дууссан</span>
            {st.catchup && <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">🔓 Нөхөлт нээлттэй</span>}
            <button
              disabled={busy === st.id}
              onClick={() => toggleCatchup(st.id, !st.catchup)}
              className={`ml-auto rounded-lg px-2.5 py-1 text-xs font-bold disabled:opacity-40 ${
                st.catchup ? "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50" : "bg-amber-500 text-white hover:bg-amber-600"
              }`}
            >
              {busy === st.id ? "…" : st.catchup ? "🔒 Нөхөлтийг хаах" : "🔓 Нөхөлт нээх"}
            </button>
          </div>
          <p className="mt-2 text-sm text-slate-700">
            {missing.length > 0 ? (
              <>
                <span className="font-semibold">Илгээгээгүй ({missing.length}):</span>{" "}
                {missing.map((s, i) => (
                  <span key={s.id}>
                    {i > 0 && ", "}
                    <Link href={`/teacher/student/${s.id}`} className="hover:underline">
                      {s.name}
                    </Link>
                  </span>
                ))}
              </>
            ) : (
              <span className="font-semibold text-emerald-700">🎉 Бүгд илгээсэн</span>
            )}
            {lateCount > 0 && <span className="ml-2 font-semibold text-amber-700">⏰ {lateCount} хүүхэд хоцорч нөхсөн</span>}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {st.catchup
              ? "Зөвхөн илгээгээгүй хүүхдүүд оруулж байна. Оруулсан ажил нь ⏰ хоцорсон гэж тэмдэглэгдэнэ."
              : "Нөхөлт нээвэл зөвхөн илгээгээгүй хүүхдүүд оруулж чадна (хоцорсон гэж тэмдэглэгдэнэ)."}
          </p>
        </div>
      ))}

      {extended.length > 0 && (
        <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
          <b>⏰ Сунгалттай, хараахан илгээгээгүй</b>
          <ul className="mt-2 space-y-1 text-sm">
            {extended.map(({ st, e }) => (
              <li key={e.id}>
                <Link href={`/teacher/student/${e.student_id}`} className="font-semibold hover:underline">
                  {name.get(e.student_id)}
                </Link>{" "}
                — {label(st.id)}, {formatUB(e.until)} хүртэл
              </li>
            ))}
          </ul>
        </div>
      )}

      {peerOpen.map(({ p, st, pending }) => (
        <div key={p.stage_id} className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
          <div className="flex flex-wrap items-center gap-2">
            <b>👥 Хөндлөнгийн үнэлгээ · {label(st.id)}</b>
            <span className="ml-auto text-xs text-slate-600">{formatUB(p.ends)} хүртэл</span>
          </div>
          <div className="mt-2 flex items-start gap-2">
            <p className="flex-1 text-sm text-slate-700">
              <span className="font-semibold">Үнэлгээ дуусгаагүй ({pending.length}):</span> {pending.join(", ")}
            </p>
            <CopyNames names={pending} />
          </div>
          <button onClick={onOpenPeer} className="mt-1 text-xs font-semibold text-emerald-800 underline">
            Дэлгэрэнгүй харах
          </button>
        </div>
      ))}
    </div>
  );
}
