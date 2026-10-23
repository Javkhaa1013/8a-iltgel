"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Class } from "@/lib/types";

type TeacherRow = { id: string; name: string; class_id: string | null };

// Зөвхөн админ багш: анги нэмэх/нэр солих/устгах, ангийн багш нарыг удирдах.
export default function ClassAdmin({ classes, teachers, activeClass }: { classes: Class[]; teachers: TeacherRow[]; activeClass: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [className, setClassName] = useState("");
  const [tName, setTName] = useState("");
  const [tPass, setTPass] = useState("");
  const [tClass, setTClass] = useState(activeClass);

  async function call(url: string, method: string, body?: unknown, okText = "Хадгаллаа ✓") {
    setBusy(true);
    setMsg(null);
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg({ ok: false, text: data.error || "Алдаа гарлаа" });
      return false;
    }
    setMsg({ ok: true, text: okText });
    router.refresh();
    return true;
  }

  const input = "rounded-lg border border-slate-200 px-3 py-2";

  return (
    <div className="grid max-w-5xl gap-5 lg:grid-cols-2">
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <h2 className="font-display font-bold">🏫 Ангиуд</h2>
        <p className="mt-1 text-sm text-slate-500">
          Анги бүр өөрийн сурагч, хуваарь, үнэлгээтэй. Хөндлөнгийн үнэлгээ зөвхөн нэг ангийн дотор явна.
        </p>
        <table className="mt-3 w-full text-sm">
          <tbody>
            {classes.map((c) => (
              <tr key={c.id} className="border-b border-slate-50">
                <td className="p-2">
                  <input
                    defaultValue={c.name}
                    maxLength={40}
                    onBlur={(e) => e.target.value.trim() !== c.name && call("/api/classes", "PATCH", { id: c.id, name: e.target.value })}
                    className="w-full rounded-lg px-2 py-1 font-semibold hover:bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-200"
                  />
                </td>
                <td className="whitespace-nowrap p-2 text-right text-xs text-slate-500">
                  {c.id === activeClass ? (
                    <span className="rounded-lg bg-violet-100 px-2 py-1 font-bold text-violet-700">Идэвхтэй</span>
                  ) : (
                    <button
                      disabled={busy}
                      onClick={() => call("/api/classes", "PATCH", { id: c.id, activate: true }, `${c.name} ангид шилжлээ`)}
                      className="rounded-lg px-2 py-1 font-semibold text-violet-700 hover:bg-violet-50"
                    >
                      Энэ ангид ажиллах
                    </button>
                  )}
                  <button
                    disabled={busy}
                    onClick={() => confirm(`"${c.name}" ангийг устгах уу?`) && call("/api/classes", "DELETE", { id: c.id }, "Устгалаа")}
                    className="ml-1 rounded-lg px-2 py-1 text-rose-500 hover:bg-rose-50"
                  >
                    🗑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 flex gap-2">
          <input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="Жишээ: 8Б" className={`${input} flex-1`} />
          <button
            disabled={busy || !className.trim()}
            onClick={async () => (await call("/api/classes", "POST", { name: className }, "Анги нэмэгдлээ")) && setClassName("")}
            className="rounded-xl bg-violet-600 px-4 py-2 font-bold text-white hover:bg-violet-700 disabled:opacity-40"
          >
            ➕ Анги нэмэх
          </button>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <h2 className="font-display font-bold">👩‍🏫 Ангийн багш нар</h2>
        <p className="mt-1 text-sm text-slate-500">
          Багш бүр өөрийн нууц үгээр нэвтэрч, зөвхөн өөрийн ангиа хардаг. Таны админ нууц үг бүх ангид хүчинтэй.
        </p>
        <table className="mt-3 w-full text-sm">
          <tbody>
            {teachers.length === 0 && (
              <tr>
                <td className="p-3 text-center text-slate-400">Багш нэмээгүй байна</td>
              </tr>
            )}
            {teachers.map((t) => (
              <tr key={t.id} className="border-b border-slate-50">
                <td className="p-2 font-semibold">{t.name}</td>
                <td className="p-2 text-slate-500">{classes.find((c) => c.id === t.class_id)?.name ?? "—"}</td>
                <td className="whitespace-nowrap p-2 text-right text-xs">
                  <button
                    disabled={busy}
                    onClick={() => {
                      const p = prompt(`${t.name}-д шинэ нууц үг (8-аас дээш тэмдэгт):`);
                      if (p) call("/api/teachers", "PATCH", { id: t.id, password: p }, "Нууц үг солигдлоо");
                    }}
                    className="rounded-lg px-2 py-1 text-slate-600 hover:bg-slate-100"
                  >
                    🔑 Нууц үг солих
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => confirm(`${t.name}-г устгах уу?`) && call("/api/teachers", "DELETE", { id: t.id }, "Устгалаа")}
                    className="ml-1 rounded-lg px-2 py-1 text-rose-500 hover:bg-rose-50"
                  >
                    🗑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input value={tName} onChange={(e) => setTName(e.target.value)} placeholder="Багшийн нэр" className={input} />
          <select value={tClass} onChange={(e) => setTClass(e.target.value)} className={input}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            value={tPass}
            onChange={(e) => setTPass(e.target.value)}
            type="password"
            placeholder="Нууц үг (8+ тэмдэгт)"
            className={input}
            autoComplete="new-password"
          />
          <button
            disabled={busy || !tName.trim() || tPass.length < 8}
            onClick={async () => {
              if (await call("/api/teachers", "POST", { name: tName, password: tPass, class_id: tClass }, `${tName} нэмэгдлээ`)) {
                setTName("");
                setTPass("");
              }
            }}
            className="rounded-xl bg-violet-600 px-4 py-2 font-bold text-white hover:bg-violet-700 disabled:opacity-40"
          >
            ➕ Багш нэмэх
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">Нууц үгийг хэн ч буцааж харах боломжгүй (хэш хэлбэрээр хадгалагдана). Мартвал шинээр тавина.</p>
      </section>

      {msg && <p className={`text-sm font-semibold lg:col-span-2 ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}>{msg.text}</p>}
    </div>
  );
}
