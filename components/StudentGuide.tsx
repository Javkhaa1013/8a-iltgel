"use client";

import { useEffect, useState } from "react";

// Сурагч анх нэвтрэхэд гарах товч заавар. "❓ Заавар" товчоор дахин нээнэ.

const STEPS = [
  {
    icon: "📅",
    title: "Хуваарийг анхаар",
    text: "Даалгавар бүр зөвхөн тодорхой долоо хоногт нээгдэнэ. Хугацаа дуусвал оруулах, засах боломжгүй — сүүлийн өдөр хүртэл бүү хүлээ.",
  },
  {
    icon: "✍️",
    title: "Бич эсвэл зургаа оруул",
    text: "Ноорог-1: гараар бичсэн ноорогоо утсаараа зурагдаж оруулна. Дараагийн шатуудад текстээр бичнэ. Бичсэн зүйл тань автоматаар хадгалагдана.",
  },
  {
    icon: "📤",
    title: "Заавал ИЛГЭЭХ дар!",
    text: "Дуусаад \"Илгээх\" товчийг дарахгүй бол багшид очихгүй. Хугацаа дуусахаас өмнө дахин засаж, дахин илгээж болно.",
    important: true,
  },
  {
    icon: "👥",
    title: "Үнэл",
    text: "Хугацаа дууссаны дараа өөрийн бүтээлээ болон ангийн 2 найзынхаа бүтээлийг шалгуурын хуудсаар үнэлнэ. Нэр нь нууц.",
  },
];

export default function StudentGuide({ studentId }: { studentId: string }) {
  const key = `guide-seen-v1-${studentId}`;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(key)) setOpen(true);
    } catch {
      /* хадгалах боломжгүй браузер — заавал нээхгүй */
    }
  }, [key]);

  function close() {
    setOpen(false);
    try {
      localStorage.setItem(key, "1");
    } catch {}
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-violet-700 shadow-sm ring-1 ring-violet-200 hover:bg-violet-50">
        ❓ Заавар
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="guide-title">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7">
            <p className="font-display text-xs font-semibold tracking-widest text-violet-600">ХЭРХЭН АЖИЛЛАХ ВЭ</p>
            <h2 id="guide-title" className="mt-1 font-display text-2xl font-bold">
              4 алхам 👋
            </h2>
            <ol className="mt-4 flex flex-col gap-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className={`flex gap-3 rounded-2xl p-3 ${s.important ? "bg-rose-50 ring-2 ring-rose-300" : "bg-slate-50"}`}>
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xl ${s.important ? "bg-rose-600" : "bg-violet-600"}`}>{s.icon}</span>
                  <div>
                    <div className={`font-bold ${s.important ? "text-rose-700" : "text-slate-800"}`}>
                      {i + 1}. {s.title}
                    </div>
                    <p className="mt-0.5 text-sm text-slate-600">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <ul className="mt-4 space-y-1 text-sm text-slate-500">
              <li>🔒 Бүтээлийг чинь зөвхөн чи болон багш харна.</li>
              <li>🔑 Нэвтрэх кодоо бусдад бүү өг.</li>
              <li>✋ Өөрийн үгээр бич — хуулсан эсэхийг систем шалгадаг.</li>
            </ul>
            <button onClick={close} autoFocus className="mt-5 w-full rounded-xl bg-violet-600 py-3.5 font-bold text-white hover:bg-violet-700">
              Ойлголоо, эхэлье! 🚀
            </button>
          </div>
        </div>
      )}
    </>
  );
}
