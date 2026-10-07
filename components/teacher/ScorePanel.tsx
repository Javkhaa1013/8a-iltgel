"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AUTHOR_DISPLAYS, publicName, type AuthorDisplay } from "@/lib/names";

type Props = {
  id: string;
  max: number;
  score: number | null;
  selfAvg: number | null;
  peerAvg: number | null;
  publishable: boolean;
  published: boolean;
  canPublish: boolean;
  authorName: string;
  authorDisplay: AuthorDisplay;
};

export default function ScorePanel({ id, max, score, selfAvg, peerAvg, publishable, published, canPublish, authorName, authorDisplay }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(score === null ? "" : String(score));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function patch(body: Record<string, unknown>, okText: string) {
    setMsg(null);
    const res = await fetch(`/api/submissions/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setMsg({ ok: false, text: data.error || "Алдаа" });
    setMsg({ ok: true, text: okText });
    router.refresh();
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl border-2 border-amber-200 bg-amber-50 p-4">
      <label className="flex items-center gap-2 font-bold text-amber-900">
        👩‍🏫 Багшийн оноо
        <input
          type="number"
          min={0}
          max={max}
          step={0.5}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-20 rounded-lg border border-amber-300 bg-white px-2 py-1.5 text-center text-lg"
        />
        / {max}
      </label>
      <button
        onClick={() => patch({ teacher_score: value === "" ? null : Number(value) }, "Оноо хадгаллаа ✓")}
        className="rounded-xl bg-amber-500 px-4 py-2 font-bold text-white hover:bg-amber-600"
      >
        Хадгалах
      </button>
      <span className="text-sm text-amber-900">
        🙋 Өөрийн: <b>{selfAvg ?? "—"}</b> · 👥 Хөндлөнгийн дундаж: <b>{peerAvg ?? "—"}</b>
      </span>
      {publishable && (
        <span className="ml-auto flex flex-wrap items-center gap-2">
          <label className="text-xs font-semibold text-amber-900">
            Нийтлэл дээрх нэр{" "}
            <select
              value={authorDisplay}
              onChange={(e) => patch({ author_display: e.target.value }, "Нэрийн хэлбэр хадгалагдлаа")}
              className="rounded-lg border border-amber-300 bg-white px-2 py-1.5 text-sm text-slate-800"
            >
              {AUTHOR_DISPLAYS.map((d) => (
                <option key={d.id} value={d.id}>
                  {publicName(authorName, d.id)}
                  {d.id === "full" ? " (бүтэн)" : ""}
                </option>
              ))}
            </select>
          </label>
          {published ? (
            <button onClick={() => patch({ published: false }, "Нийтээс нуулаа")} className="rounded-xl bg-white px-4 py-2 font-bold text-slate-700 ring-1 ring-slate-200">
              ✅ Нийтлэгдсэн · Нуух
            </button>
          ) : (
            <button
              disabled={!canPublish}
              title={canPublish ? "" : "Хугацаа дууссаны дараа нийтлэх боломжтой"}
              onClick={() => patch({ published: true }, "Нийтэллээ 🌐")}
              className="rounded-xl bg-violet-600 px-4 py-2 font-bold text-white hover:bg-violet-700 disabled:opacity-40"
            >
              🌐 Сайтад нийтлэх
            </button>
          )}
        </span>
      )}
      {msg && <span className={`w-full text-sm font-semibold ${msg.ok ? "text-emerald-700" : "text-rose-600"}`}>{msg.text}</span>}
    </div>
  );
}
