"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatUB } from "@/lib/stages";

type Props = { studentId: string; stageId: string; until: string | null; stageEnd: string };

/** Тухайн сурагчид хугацаа сунгах (Улаанбаатарын цагаар) */
export default function ExtensionControl({ studentId, stageId, until, stageEnd }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(`${stageEnd}T23:59`);
  const [error, setError] = useState("");

  async function save(untilValue: string | null) {
    setError("");
    const res = await fetch("/api/extensions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: studentId, stage_id: stageId, until: untilValue }),
    });
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error || "Алдаа");
    setOpen(false);
    router.refresh();
  }

  if (until && !open)
    return (
      <span className="flex items-center gap-2 text-sm">
        <span className="rounded-lg bg-amber-100 px-2 py-1 font-semibold text-amber-800">⏰ {formatUB(until)} хүртэл сунгасан</span>
        <button onClick={() => save(null)} className="text-slate-500 hover:text-rose-600">
          Цуцлах
        </button>
      </span>
    );

  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100">
        ⏰ Хугацаа сунгах
      </button>
    );

  return (
    <span className="flex flex-wrap items-center gap-2 text-sm">
      <input type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1" />
      <button onClick={() => save(`${value}:00+08:00`)} className="rounded-lg bg-amber-500 px-3 py-1 font-bold text-white">
        Сунгах
      </button>
      <button onClick={() => setOpen(false)} className="text-slate-500">
        Болих
      </button>
      {error && <span className="text-rose-600">{error}</span>}
    </span>
  );
}
