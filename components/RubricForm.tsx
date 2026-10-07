"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LEVELS, type Criterion } from "@/lib/rubric";

type Props = {
  submissionId: string;
  role: "self" | "peer";
  criteria: Criterion[];
  existing: { ratings: Record<string, number>; strength: string; suggestion: string } | null;
  open: boolean; // үнэлэх хугацаа нээлттэй эсэх
  closesAt: string; // "2026.10.16 23:59"
};

const LEVEL_COLORS = ["", "bg-rose-500", "bg-amber-500", "bg-sky-500", "bg-emerald-500"];

export default function RubricForm({ submissionId, role, criteria, existing, open, closesAt }: Props) {
  const router = useRouter();
  const [ratings, setRatings] = useState<Record<string, number>>(existing?.ratings ?? {});
  const [strength, setStrength] = useState(existing?.strength ?? "");
  const [suggestion, setSuggestion] = useState(existing?.suggestion ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const missing = criteria.filter((c) => !ratings[c.id]).length;

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/submissions/${submissionId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ratings, strength, suggestion }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg({ ok: false, text: data.error || "Хадгалж чадсангүй" });
    setMsg({ ok: true, text: "✅ Үнэлгээ хадгалагдлаа" });
    router.refresh();
  }

  const title = role === "self" ? "🙋 Өөрийн үнэлгээ" : "👥 Хөндлөнгийн үнэлгээ";
  const prompt =
    role === "self" ? "Өөрийн бүтээлээ шалгуур бүрээр шударгаар үнэлээрэй." : "Ангийн найзынхаа бүтээлийг шалгуур бүрээр үнэлж, хүндэтгэлтэйгээр зөвлөөрэй.";

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-2 ring-emerald-200 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-display text-lg font-bold">{title}</h3>
        {existing && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">Хадгалсан</span>}
        <span className="ml-auto text-xs text-slate-500">{open ? `${closesAt} хүртэл засаж болно` : "Хугацаа дууссан"}</span>
      </div>
      <p className="mt-1 text-sm text-slate-500">{prompt}</p>

      <div className="mt-4 flex flex-col gap-4">
        {criteria.map((c) => (
          <div key={c.id}>
            <div className="font-semibold text-slate-800">{c.label}</div>
            <div className="text-sm text-slate-500">{c.hint}</div>
            <div className="mt-2 grid grid-cols-4 gap-1.5" role="radiogroup" aria-label={c.label}>
              {LEVELS.map((l) => {
                const active = ratings[c.id] === l.value;
                return (
                  <button
                    key={l.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={!open}
                    onClick={() => setRatings((r) => ({ ...r, [c.id]: l.value }))}
                    className={`rounded-xl border-2 px-1 py-2 text-center text-xs font-semibold leading-tight transition sm:text-sm ${
                      active ? `${LEVEL_COLORS[l.value]} border-transparent text-white` : "border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <span className="block text-base font-bold">{l.short}</span>
                    {l.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <label className="block">
          <span className="font-semibold text-slate-800">👍 Хамгийн сайн тал нь юу вэ?</span>
          <textarea
            value={strength}
            onChange={(e) => setStrength(e.target.value)}
            disabled={!open}
            maxLength={1000}
            placeholder={role === "self" ? "Би ... хэсгийг сайн бичсэн гэж бодож байна, учир нь ..." : "Надад ... хэсэг хамгийн их таалагдсан, учир нь ..."}
            className="mt-1 min-h-20 w-full rounded-xl border border-slate-200 p-2 text-base outline-none focus:border-emerald-400 sm:text-sm"
          />
        </label>
        <label className="block">
          <span className="font-semibold text-slate-800">💡 Юуг сайжруулбал илүү дээр болох вэ?</span>
          <textarea
            value={suggestion}
            onChange={(e) => setSuggestion(e.target.value)}
            disabled={!open}
            maxLength={1000}
            placeholder={role === "self" ? "Дараагийн хувилбарт ... -г сайжруулна." : "... хэсэгт жишээ нэмбэл илүү ойлгомжтой болно."}
            className="mt-1 min-h-20 w-full rounded-xl border border-slate-200 p-2 text-base outline-none focus:border-emerald-400 sm:text-sm"
          />
        </label>
      </div>

      {msg && <p className={`mt-3 text-sm font-semibold ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}>{msg.text}</p>}
      {open && (
        <button
          onClick={save}
          disabled={busy || missing > 0}
          className="mt-3 w-full rounded-xl bg-emerald-600 py-3 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy ? "Хадгалж байна…" : missing > 0 ? `${missing} шалгуур үнэлээгүй байна` : existing ? "💾 Үнэлгээг шинэчлэх" : "✅ Үнэлгээ илгээх"}
        </button>
      )}
    </section>
  );
}
