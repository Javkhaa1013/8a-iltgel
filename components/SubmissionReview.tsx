"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatUB } from "@/lib/stages";
import { wordDiff } from "@/lib/textTools";
import type { CommentRole } from "@/lib/types";
import type { CommentView, VersionView } from "@/lib/views";

type Props = {
  submission: { id: string; title: string; body: string; images: string[]; kind: "image" | "text" };
  comments: CommentView[];
  role: CommentRole; // харж буй хүний үүрэг
  canComment: boolean;
  versions?: VersionView[]; // засварын түүх (багш, зохиогч)
};

type Resolved = CommentView & { s: number; e: number };

/** Сэтгэгдлийг текст дээр байрлуулна. exact=false бол текст засагдсан үед иш татсан хэсгийг хайж олно. */
function resolve(c: CommentView, body: string, exact: boolean): Resolved | null {
  if (c.start === null || c.end === null) return null;
  if (body.slice(c.start, c.end) === c.quote) return { ...c, s: c.start, e: c.end };
  if (exact || !c.quote) return null;
  const i = body.indexOf(c.quote);
  return i >= 0 ? { ...c, s: i, e: i + c.quote.length } : null;
}

export default function SubmissionReview({ submission, comments, role, canComment, versions = [] }: Props) {
  const router = useRouter();
  const textRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<{ start: number; end: number; quote: string; x: number; y: number } | null>(null);
  const [draft, setDraft] = useState<{ start?: number; end?: number; quote?: string } | null>(null);
  const [body, setBody] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState<string | null>(null);

  const currentNo = versions.at(-1)?.no ?? null;
  const [viewNo, setViewNo] = useState<number | null>(currentNo);
  const [showDiff, setShowDiff] = useState(false);
  // Дахин илгээсний дараа (router.refresh) шинэ хувилбар руу шилжинэ
  useEffect(() => setViewNo(currentNo), [currentNo]);
  const isCurrent = viewNo === currentNo;
  const viewed = isCurrent ? submission : { ...submission, ...versions.find((v) => v.no === viewNo)! };
  const prevVersion = versions.filter((v) => v.no < (viewNo ?? Infinity)).at(-1);
  const commentable = canComment && isCurrent && !showDiff;

  // Одоогийн хувилбар дээр бүх сэтгэгдлийг, хуучин хувилбар дээр зөвхөн тухайн хувилбарт бичсэнийг харуулна
  const visible = isCurrent ? comments : comments.filter((c) => c.version === viewNo);
  const anchored = useMemo(
    () =>
      visible
        .map((c) => resolve(c, viewed.body, !isCurrent))
        .filter((c): c is Resolved => !!c)
        .sort((a, b) => a.s - b.s),
    [visible, viewed.body, isCurrent]
  );
  const general = visible.filter((c) => c.start === null);
  const orphaned = visible.filter((c) => c.start !== null && !anchored.some((a) => a.id === c.id));

  const segments = useMemo(() => {
    const text = viewed.body;
    const cuts = new Set([0, text.length]);
    anchored.forEach((c) => (cuts.add(c.s), cuts.add(c.e)));
    const points = [...cuts].sort((a, b) => a - b);
    return points.slice(0, -1).map((from, i) => {
      const to = points[i + 1];
      return { from, text: text.slice(from, to), covers: anchored.filter((c) => c.s <= from && c.e >= to) };
    });
  }, [anchored, viewed.body]);

  const diff = useMemo(() => (showDiff && prevVersion ? wordDiff(prevVersion.body, viewed.body) : null), [showDiff, prevVersion, viewed.body]);

  function readSelection() {
    if (!commentable || submission.kind !== "text") return;
    const sel = window.getSelection();
    const root = textRef.current;
    if (!sel || sel.isCollapsed || !root || !sel.rangeCount) return setSelection(null);
    const range = sel.getRangeAt(0);
    if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return setSelection(null);
    const pre = document.createRange();
    pre.setStart(root, 0);
    pre.setEnd(range.startContainer, range.startOffset);
    let start = pre.toString().length;
    let end = start + range.toString().length;
    while (start < end && /\s/.test(submission.body[start])) start++;
    while (end > start && /\s/.test(submission.body[end - 1])) end--;
    if (end <= start) return setSelection(null);
    const rect = range.getBoundingClientRect();
    const box = root.getBoundingClientRect();
    setSelection({ start, end, quote: submission.body.slice(start, end), x: rect.left - box.left + rect.width / 2, y: rect.top - box.top });
  }

  // Утсан дээр сонголтыг бариулаар сунгахад touchend биш selectionchange ирдэг
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const onChange = () => {
      clearTimeout(t);
      t = setTimeout(readSelection, 250);
    };
    document.addEventListener("selectionchange", onChange);
    return () => (document.removeEventListener("selectionchange", onChange), clearTimeout(t));
  });

  function openDraft(d: { start?: number; end?: number; quote?: string }) {
    setDraft(d);
    setSelection(null);
    // Утсан дээр маягт текстийн доор байдаг тул тийш гүйлгэнэ
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  }

  async function save() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/submissions/${submission.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, start: draft?.start, end: draft?.end }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || "Хадгалж чадсангүй");
    setDraft(null);
    setBody("");
    window.getSelection()?.removeAllRanges();
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Сэтгэгдлийг устгах уу?")) return;
    await fetch(`/api/comments/${id}`, { method: "DELETE" });
    router.refresh();
  }


  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <div className="min-w-0">
        {/* Засварын түүх */}
        {versions.length > 1 && (
          <div className="no-print mb-3 flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 text-sm shadow-sm ring-1 ring-slate-100">
            <span className="font-bold text-slate-600">🕘 Хувилбар:</span>
            {versions.map((v) => (
              <button
                key={v.no}
                onClick={() => (setViewNo(v.no), setShowDiff(false))}
                className={`rounded-lg px-2.5 py-1 font-semibold ${v.no === viewNo ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-violet-100"}`}
                title={formatUB(v.created_at)}
              >
                #{v.no}
                <span className="ml-1 font-normal opacity-75">{formatUB(v.created_at).slice(5)}</span>
                {v.no === currentNo && " (сүүлийн)"}
              </button>
            ))}
            {submission.kind === "text" && prevVersion && (
              <label className="ml-auto flex cursor-pointer items-center gap-1.5 font-semibold text-slate-600">
                <input type="checkbox" checked={showDiff} onChange={(e) => setShowDiff(e.target.checked)} className="h-4 w-4 accent-violet-600" />
                #{prevVersion.no}-тай харьцуулах
              </label>
            )}
          </div>
        )}
        {!isCurrent && (
          <div className="no-print mb-3 rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-900">
            Та хуучин хувилбар (#{viewNo}) харж байна. Сэтгэгдлийг зөвхөн сүүлийн хувилбар дээр бичнэ.
          </div>
        )}

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-8">
          {submission.kind === "image" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {viewed.images.map((src, i) => (
                <button key={src + i} onClick={() => setZoom(src)} className="overflow-hidden rounded-xl ring-1 ring-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Ноорог ${i + 1}`} className="w-full object-contain" />
                </button>
              ))}
            </div>
          ) : (
            <>
              <h2 className="font-display text-xl font-bold sm:text-2xl">{viewed.title}</h2>
              {commentable && (
                <p className="no-print mt-1 text-sm text-slate-400">💡 Үг, өгүүлбэрээ сонгоод сэтгэгдэл бичнэ (утсан дээр үг дээр удаан дарж сонгоно)</p>
              )}
              <div className="relative mt-5">
                {diff ? (
                  <div className="article-text text-slate-800">
                    {diff.map((p, i) => (p.type === "same" ? <span key={i}>{p.text}</span> : <span key={i} className={p.type === "add" ? "diff-add" : "diff-del"}>{p.text}</span>))}
                  </div>
                ) : (
                  <div ref={textRef} className="article-text text-slate-800" onMouseUp={readSelection}>
                    {segments.map((seg) =>
                      seg.covers.length ? (
                        <mark
                          key={seg.from}
                          className={`hl hl-${seg.covers[0].role} ${seg.covers.some((c) => c.id === active) ? "hl-active" : ""}`}
                          onClick={() => setActive(seg.covers[0].id)}
                        >
                          {seg.text}
                        </mark>
                      ) : (
                        <span key={seg.from}>{seg.text}</span>
                      )
                    )}
                  </div>
                )}
                {diff && (
                  <p className="mt-3 text-xs text-slate-500">
                    <span className="diff-add px-1">ногоон</span> — #{viewNo}-д нэмсэн, <span className="diff-del px-1">улаан</span> — хассан
                  </p>
                )}
                {/* Компьютер дээр сонголтын дээр гарах товч */}
                {selection && !draft && (
                  <button
                    className="no-print absolute z-10 hidden -translate-x-1/2 -translate-y-full rounded-xl bg-slate-900 px-3 py-1.5 text-sm font-bold text-white shadow-lg sm:block"
                    style={{ left: selection.x, top: selection.y - 6 }}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => openDraft({ start: selection.start, end: selection.end, quote: selection.quote })}
                  >
                    💬 Сэтгэгдэл
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Утсан дээр: доод талд тогтмол товч (утасны өөрийн цэс сонголтын дээр гардаг тул) */}
      {selection && !draft && (
        <div className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 backdrop-blur sm:hidden">
          <div className="mb-2 line-clamp-2 font-serif text-sm italic text-slate-500">“{selection.quote}”</div>
          <button
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => openDraft({ start: selection.start, end: selection.end, quote: selection.quote })}
            className="w-full rounded-xl bg-violet-600 py-3 font-bold text-white"
          >
            💬 Сонгосон хэсэгт сэтгэгдэл бичих
          </button>
        </div>
      )}

      <aside className="flex flex-col gap-3">
        {commentable && !draft && (
          <button onClick={() => openDraft({})} className="no-print rounded-xl bg-white px-4 py-3 text-left text-sm font-semibold text-violet-700 shadow-sm ring-1 ring-violet-200 hover:bg-violet-50">
            ➕ Ерөнхий сэтгэгдэл бичих
          </button>
        )}

        {draft && (
          <div ref={formRef} className="no-print rounded-2xl bg-white p-4 shadow-md ring-2 ring-violet-400">
            {draft.quote && <blockquote className="mb-2 border-l-4 border-violet-400 pl-2 font-serif text-sm italic text-slate-600">“{draft.quote.slice(0, 200)}”</blockquote>}
            <textarea
              autoFocus
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={2000}
              placeholder={draft.quote ? "Энэ хэсгийн талаар…" : "Ерөнхий сэтгэгдэл…"}
              className="min-h-24 w-full rounded-xl border border-slate-200 p-2 text-base outline-none focus:border-violet-400 sm:text-sm"
            />
            {error && <p className="mt-1 text-sm text-rose-600">{error}</p>}
            <div className="mt-2 flex gap-2">
              <button onClick={save} disabled={busy} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                {busy ? "…" : "Хадгалах"}
              </button>
              <button onClick={() => (setDraft(null), setError(""))} className="rounded-lg px-3 py-2 text-sm text-slate-500">
                Болих
              </button>
            </div>
          </div>
        )}

        {visible.length === 0 && <p className="rounded-2xl bg-white/60 p-4 text-center text-sm text-slate-400">Сэтгэгдэл алга</p>}

        {[...anchored, ...general, ...orphaned].map((c) => {
          const isOrphan = orphaned.includes(c);
          return (
            <div
              key={c.id}
              onClick={() => setActive(c.id)}
              className={`cursor-pointer rounded-2xl bg-white p-3 text-sm shadow-sm ring-1 transition ${active === c.id ? "ring-2 ring-indigo-400" : "ring-slate-100"}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${c.role === "teacher" ? "bg-amber-400" : c.role === "self" ? "bg-blue-500" : "bg-emerald-500"}`} />
                <span className="font-bold text-slate-700">{c.author}</span>
                {c.version !== null && versions.length > 1 && <span className="text-xs text-slate-400">#{c.version}</span>}
                {c.score !== null && <span className="ml-auto rounded-md bg-slate-100 px-1.5 font-bold">{c.score} оноо</span>}
              </div>
              {c.quote && (
                <blockquote className="mt-1.5 border-l-4 border-slate-200 pl-2 font-serif italic text-slate-500">
                  “{c.quote.slice(0, 160)}
                  {c.quote.length > 160 ? "…" : ""}”
                </blockquote>
              )}
              {isOrphan && (
                <div className="mt-1 text-xs text-amber-700">
                  Энэ хэсэг дараа нь засагдсан.{" "}
                  {c.version !== null && versions.some((v) => v.no === c.version) && (
                    <button onClick={(e) => (e.stopPropagation(), setViewNo(c.version), setShowDiff(false))} className="font-semibold underline">
                      #{c.version} хувилбар дээр харах
                    </button>
                  )}
                </div>
              )}
              {c.body && <p className="mt-1.5 whitespace-pre-wrap text-slate-800">{c.body}</p>}
              {c.canDelete && (
                <button onClick={(e) => (e.stopPropagation(), remove(c.id))} className="no-print mt-1 text-xs text-slate-400 hover:text-rose-600">
                  Устгах
                </button>
              )}
            </div>
          );
        })}
      </aside>

      {zoom && (
        <button onClick={() => setZoom(null)} className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="" className="max-h-full max-w-full rounded-lg" />
        </button>
      )}
    </div>
  );
}
