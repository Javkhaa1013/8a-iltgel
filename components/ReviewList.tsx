import { LEVELS, type Criterion } from "@/lib/rubric";
import type { ReviewView } from "@/lib/views";

const CHIP = ["", "bg-rose-100 text-rose-800", "bg-amber-100 text-amber-800", "bg-sky-100 text-sky-800", "bg-emerald-100 text-emerald-800"];

/** Шалгуурын үнэлгээнүүдийг жагсаана (шалгуур бүрийн дундаж + сэтгэгдэл) */
export default function ReviewList({ reviews, criteria, max, empty }: { reviews: ReviewView[]; criteria: Criterion[]; max: number; empty?: string }) {
  if (!reviews.length) return empty ? <p className="rounded-2xl bg-white/60 p-4 text-center text-sm text-slate-400">{empty}</p> : null;

  const peers = reviews.filter((r) => r.role === "peer");
  const avg = (id: string) => (peers.length ? Math.round((peers.reduce((n, r) => n + (r.ratings[id] ?? 0), 0) / peers.length) * 10) / 10 : null);

  return (
    <div className="flex flex-col gap-3">
      {peers.length > 1 && (
        <div className="overflow-x-auto rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <div className="text-sm font-bold text-slate-600">👥 Хөндлөнгийн үнэлгээний дундаж ({peers.length} хүн)</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {criteria.map((c) => (
              <span key={c.id} className="rounded-lg bg-slate-100 px-2 py-1 text-sm">
                {c.label}: <b>{avg(c.id)}</b>/4
              </span>
            ))}
          </div>
        </div>
      )}
      {reviews.map((r) => (
        <article key={r.id} className="rounded-2xl bg-white p-4 text-sm shadow-sm ring-1 ring-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <b className="text-slate-700">{r.author}</b>
            {r.score !== null && (
              <span className="ml-auto rounded-md bg-slate-900 px-2 py-0.5 font-bold text-white">
                {r.score}/{max}
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {criteria.map((c) => {
              const v = r.ratings[c.id];
              return (
                <span key={c.id} className={`rounded-md px-2 py-0.5 text-xs font-semibold ${v ? CHIP[v] : "bg-slate-100 text-slate-400"}`} title={v ? LEVELS[v - 1].label : ""}>
                  {c.label}: {v ?? "—"}
                </span>
              );
            })}
          </div>
          {r.strength && (
            <p className="mt-2 whitespace-pre-wrap text-slate-700">
              <span className="font-semibold">👍 </span>
              {r.strength}
            </p>
          )}
          {r.suggestion && (
            <p className="mt-1 whitespace-pre-wrap text-slate-700">
              <span className="font-semibold">💡 </span>
              {r.suggestion}
            </p>
          )}
        </article>
      ))}
    </div>
  );
}
