"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatUB } from "@/lib/stages";
import ZoomImage from "@/components/ZoomImage";
import { uploadImage } from "@/lib/uploadImage";

type Content = { title: string; body: string; images: string[]; updated_at: string };

type Props = {
  stage: { id: string; kind: "image" | "text"; label: string };
  deadline: string;
  /** Хугацаа дууссан ч багш нөхөлт нээсэн — илгээх боломжтой, ажил "хоцорсон" гэж тэмдэглэгдэнэ */
  catchup?: boolean;
  serverNow: string;
  existing: Content | null; // сүүлд илгээсэн
  serverDraft: Content | null; // серверт автоматаар хадгалагдсан, илгээгээгүй ноорог
  previous: { label: string; kind: "image" | "text"; title: string; body: string; images: string[] } | null;
};

type SaveState = { kind: "idle" | "saving" | "saved" | "error"; at?: string };

function useCountdown(deadline: string, serverNow: string) {
  // Компьютерийн цаг буруу байж болох тул серверийн цагтай зөрүүг тооцно
  const skew = useRef(new Date(serverNow).getTime() - Date.now());
  const [left, setLeft] = useState(() => new Date(deadline).getTime() - new Date(serverNow).getTime());
  useEffect(() => {
    const t = setInterval(() => setLeft(new Date(deadline).getTime() - (Date.now() + skew.current)), 1000);
    return () => clearInterval(t);
  }, [deadline]);
  return left;
}

function fmt(ms: number) {
  if (ms <= 0) return "Хугацаа дууслаа";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return d > 0 ? `${d} хоног ${h} цаг ${m} мин` : `${h} цаг ${m} мин ${sec} сек`;
}

const same = (a: { title: string; body: string; images: string[] }, b: { title: string; body: string; images: string[] } | null) =>
  !!b && a.title === b.title && a.body === b.body && a.images.join("|") === b.images.join("|");

export default function StageEditor({ stage, deadline, catchup = false, serverNow, existing, serverDraft, previous }: Props) {
  const router = useRouter();
  const localKey = `nootlog-${stage.id}`;
  const left = useCountdown(deadline, serverNow);
  const closed = left <= 0 && !catchup;

  // Илгээх үед ноорог устдаг тул ноорог байгаа бол илгээснээс хойш хийсэн өөрчлөлт гэсэн үг
  const draftIsNewer = !!serverDraft && !same(serverDraft, existing);
  const start = draftIsNewer ? serverDraft! : existing;

  const [title, setTitle] = useState(start?.title ?? "");
  const [body, setBody] = useState(start?.body ?? "");
  const [images, setImages] = useState<string[]>(start?.images ?? []);
  const [uploading, setUploading] = useState(0);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(
    draftIsNewer ? { ok: true, text: `📝 ${formatUB(serverDraft!.updated_at)}-д хадгалсан ноорог нээгдлээ. Дуусаад "Илгээх" товчоо дараарай!` } : null
  );
  const [edits, setEdits] = useState(0); // хадгалаагүй өөрчлөлтийн тоолуур
  const [save, setSave] = useState<SaveState>(draftIsNewer ? { kind: "saved", at: serverDraft!.updated_at } : { kind: "idle" });
  const pasted = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const latest = useRef({ title, body, images });
  latest.current = { title, body, images };

  const unsent = !same({ title, body, images }, existing);
  const touch = () => setEdits((n) => n + 1);

  // Серверт ноорог хадгалах (илгээсэнд тооцохгүй)
  const saveDraft = useCallback(
    async (keepalive = false) => {
      if (closed) return;
      setSave({ kind: "saving" });
      try {
        const res = await fetch("/api/drafts", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage_id: stage.id, ...latest.current }),
          keepalive,
        });
        const data = await res.json().catch(() => ({}));
        setSave(res.ok ? { kind: "saved", at: data.saved_at } : { kind: "error" });
      } catch {
        setSave({ kind: "error" });
      }
    },
    [closed, stage.id]
  );

  // Бичих зогссоноос 2.5 секундын дараа хадгална
  useEffect(() => {
    if (!edits) return;
    try {
      localStorage.setItem(localKey, JSON.stringify({ ...latest.current, savedAt: new Date().toISOString() }));
    } catch {}
    const t = setTimeout(() => saveDraft(), 2500);
    return () => clearTimeout(t);
  }, [edits, localKey, saveDraft]);

  // Утсан дээр апп солих, дэлгэц унтрахад шууд хадгална
  useEffect(() => {
    const flush = () => document.visibilityState === "hidden" && edits && saveDraft(true);
    document.addEventListener("visibilitychange", flush);
    return () => document.removeEventListener("visibilitychange", flush);
  }, [edits, saveDraft]);

  // Сервер рүү хадгалж чадаагүй (интернэтгүй) үед браузерт үлдсэн хувилбарыг сэргээнэ
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(localKey) || "null");
      const newest = [existing?.updated_at, serverDraft?.updated_at].filter(Boolean).sort().at(-1) ?? "";
      if (d && d.savedAt > newest && !same(d, start)) {
        setTitle(d.title ?? "");
        setBody(d.body ?? "");
        setImages(Array.isArray(d.images) ? d.images : []);
        setMsg({ ok: true, text: "📝 Хадгалагдаагүй үлдсэн бичвэр сэргээгдлээ" });
        touch();
      }
    } catch {}
    // зөвхөн анх ачаалахад
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!unsent) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsent]);

  async function addFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    for (const f of list) {
      setUploading((n) => n + 1);
      try {
        const url = await uploadImage(f, 2400); // гар бичмэл уншигдахуйц том хэмжээтэй
        setImages((arr) => [...arr, url].slice(0, 10));
        touch();
      } catch (e) {
        setMsg({ ok: false, text: (e as Error).message });
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  async function submit() {
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage_id: stage.id, title, body, images, paste_delta: pasted.current }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setMsg({ ok: false, text: data.error || "Илгээж чадсангүй" });
    pasted.current = 0;
    setEdits(0);
    setSave({ kind: "idle" });
    try {
      localStorage.removeItem(localKey);
    } catch {}
    setMsg({
      ok: true,
      text: catchup
        ? "✅ Илгээлээ! Хугацаа дууссаны дараа оруулсан тул багшид \"⏰ хоцорсон\" гэж харагдана."
        : "✅ Амжилттай илгээлээ! Хугацаа дуусахаас өмнө дахин засаж болно.",
    });
    router.refresh();
  }

  const words = body.trim() ? body.trim().split(/\s+/).length : 0;
  const urgent = left < 24 * 3600_000;
  const timerCls = catchup
    ? "bg-amber-500 text-white"
    : closed
      ? "bg-slate-900 text-white"
      : urgent
        ? "bg-rose-600 text-white"
        : "bg-violet-600 text-white";

  const saveLabel =
    save.kind === "saving"
      ? "☁️ Хадгалж байна…"
      : save.kind === "saved"
        ? `☁️ Ноорог хадгалагдсан ${save.at ? formatUB(save.at).slice(11) : ""}`
        : save.kind === "error"
          ? "⚠️ Хадгалж чадсангүй — интернэтээ шалгана уу"
          : "";

  return (
    <>
      {/* Утсан дээр хугацаа үргэлж харагдана */}
      <div className={`sticky top-0 z-30 -mx-4 mt-3 flex items-center justify-between px-4 py-2 text-sm font-bold lg:hidden ${timerCls}`}>
        <span>{catchup ? "⏰ Хоцорч нөхөж байна" : `⏳ ${fmt(left)}`}</span>
        {unsent && !closed && <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">Илгээгээгүй</span>}
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
          {stage.kind === "image" ? (
            <>
              <p className="text-slate-600">
                Гараар бичсэн ноорогоо <b>тод, бүтэн</b> харагдахаар зурагдаад оруулна уу. Олон хуудастай бол бүгдийг нь (10 хүртэл). Энэ зураг
                таны ноорогийн <b>баримт</b> болж хадгалагдана.
              </p>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => (e.preventDefault(), addFiles(e.dataTransfer.files))}
                className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3"
              >
                {images.map((src, i) => (
                  <div key={src + i} className="relative overflow-hidden rounded-xl ring-1 ring-slate-200">
                    <ZoomImage src={src} alt={`Хуудас ${i + 1}`} className="aspect-[3/4] w-full object-cover" />
                    <span className="absolute left-2 top-2 rounded-md bg-black/60 px-1.5 text-xs font-bold text-white">{i + 1}</span>
                    <button
                      onClick={() => (setImages((arr) => arr.filter((_, j) => j !== i)), touch())}
                      disabled={closed}
                      className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg bg-white/90 font-bold text-rose-600"
                      aria-label="Устгах"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {images.length < 10 && !closed && (
                  <div className="grid aspect-[3/4] grid-rows-2 gap-2">
                    <button
                      onClick={() => cameraRef.current?.click()}
                      disabled={uploading > 0}
                      className="rounded-xl bg-violet-600 text-center text-white hover:bg-violet-700 disabled:opacity-60"
                    >
                      <span className="block text-3xl">{uploading ? "⏳" : "📷"}</span>
                      <span className="block text-sm font-bold">{uploading ? "Оруулж байна…" : "Зураг авах"}</span>
                    </button>
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading > 0}
                      className="rounded-xl border-2 border-dashed border-violet-300 bg-violet-50 text-center text-violet-700 hover:bg-violet-100 disabled:opacity-60"
                    >
                      <span className="block text-2xl">🖼️</span>
                      <span className="block text-sm font-bold">Галерейгаас</span>
                    </button>
                  </div>
                )}
              </div>
              {/* capture — утсан дээр камерыг шууд нээнэ */}
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.heic,.heif"
                multiple
                hidden
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </>
          ) : (
            <>
              <input
                value={title}
                onChange={(e) => (setTitle(e.target.value), touch())}
                readOnly={closed}
                maxLength={150}
                placeholder="Нийтлэлийн гарчиг"
                className="w-full border-b-2 border-slate-100 pb-2 font-display text-xl font-bold outline-none focus:border-violet-400 sm:text-2xl"
              />
              <textarea
                value={body}
                onChange={(e) => (setBody(e.target.value), touch())}
                onPaste={(e) => (pasted.current += e.clipboardData.getData("text/plain").length)}
                readOnly={closed}
                maxLength={30000}
                placeholder="Энд бичнэ үү…"
                className="article-text mt-4 min-h-[55vh] w-full resize-y rounded-xl bg-slate-50 p-3 outline-none focus:bg-white focus:ring-2 focus:ring-violet-200 sm:min-h-[480px] sm:p-4"
              />
              <div className="mt-1 text-right text-sm text-slate-400">{words} үг</div>
            </>
          )}

          {msg && <p className={`mt-3 text-sm font-semibold ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}>{msg.text}</p>}

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            {saveLabel && <span className={save.kind === "error" ? "font-bold text-rose-600" : "text-slate-400"}>{saveLabel}</span>}
            {unsent && !closed && <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-800">⚠️ Илгээгээгүй өөрчлөлт байна</span>}
          </div>
          <button
            onClick={submit}
            disabled={saving || closed || uploading > 0 || !unsent}
            className="mt-2 w-full rounded-xl bg-violet-600 py-3.5 font-bold text-white shadow hover:bg-violet-700 disabled:opacity-50"
          >
            {closed
              ? "⛔ Хугацаа дууссан"
              : saving
                ? "Илгээж байна…"
                : !unsent
                  ? "✅ Илгээсэн (өөрчлөлтгүй)"
                  : catchup
                    ? existing
                      ? "💾 Хоцорсон ажлаа шинэчлэх"
                      : "⏰ Хоцорч илгээх"
                    : existing
                      ? "💾 Шинэчилж илгээх"
                      : "📤 Илгээх"}
          </button>
          <p className="mt-2 text-center text-xs text-slate-400">Бичсэн зүйл тань автоматаар хадгалагдана, гэхдээ багшид очихын тулд заавал &quot;Илгээх&quot; дарна.</p>
        </div>

        <aside className="flex flex-col gap-4">
          <div className={`hidden rounded-2xl p-4 text-center lg:block ${timerCls}`}>
            {catchup ? (
              <>
                <div className="text-xs font-bold uppercase tracking-wider opacity-80">Нөхөж оруулах</div>
                <div className="mt-1 font-display text-lg font-bold">⏰ Хугацаа дууссан</div>
                <div className="mt-1 text-xs opacity-90">Багш нөхөлт нээсэн. Оруулсан ажил &quot;хоцорсон&quot; гэж тэмдэглэгдэнэ.</div>
              </>
            ) : (
              <>
                <div className="text-xs font-bold uppercase tracking-wider opacity-80">Хугацаа дуусахад</div>
                <div className="mt-1 font-display text-xl font-bold">{fmt(left)}</div>
              </>
            )}
          </div>

          {previous && (
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <div className="text-sm font-bold text-slate-600">📎 Өмнөх шат: {previous.label}</div>
              {previous.kind === "image" ? (
                <div className="mt-2 grid grid-cols-3 gap-1">
                  {previous.images.map((src) => (
                    <ZoomImage key={src} src={src} className="aspect-[3/4] w-full rounded object-cover" />
                  ))}
                </div>
              ) : (
                <>
                  <p className="mt-2 line-clamp-6 font-serif text-sm text-slate-600">{previous.body}</p>
                  {stage.kind === "text" && !body.trim() && !closed && (
                    <button
                      onClick={() => (setTitle(previous.title), setBody(previous.body), touch())}
                      className="mt-2 w-full rounded-lg bg-slate-100 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                    >
                      Үүнээс эхэлж засах
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
            <b>Санамж</b>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              <li>Бүтээлийг зөвхөн та болон багш харна.</li>
              <li>
                {catchup
                  ? "Багш нөхөлтийг хаахад оруулах боломж дуусна — хойшлуулалгүй илгээчихээрэй."
                  : "Хугацаа дууссаны дараа засах, оруулах боломжгүй."}
              </li>
              <li>Илгээх бүр хувилбар болж хадгалагдана — багш таны засварын явцыг харна.</li>
              <li>Өөрийн үгээр бичээрэй — бусдын текстийг хуулсан эсэхийг систем шалгадаг.</li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
