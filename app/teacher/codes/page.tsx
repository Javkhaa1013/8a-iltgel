import { headers } from "next/headers";
import { redirect } from "next/navigation";
import PrintButton from "@/components/PrintButton";
import { isTeacher } from "@/lib/auth";
import { listStudents } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Нэвтрэх кодууд · 8А" };

// Хайчилж хүүхэд бүрт өгөх кодын картууд (сайтын хаяг, товч заавартай)
export default async function CodesPage() {
  if (!(await isTeacher())) redirect("/teacher");
  const [students, h] = await Promise.all([listStudents(), headers()]);
  const site = `${h.get("host") ?? "iltgel-8a.vercel.app"}/login`;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="no-print mb-4 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-xl font-bold">🖨️ Нэвтрэх кодууд</h1>
        <PrintButton />
        <p className="w-full text-sm text-slate-500">Хайчилж хүүхэд бүрт өгнө. Карт бүр дээр сайтын хаяг ба товч заавар байгаа.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {students.map((s) => (
          <div key={s.id} className="break-inside-avoid rounded-xl border-2 border-dashed border-slate-300 p-3 text-center">
            <div className="text-xs text-slate-500">8А Нийтлэл · нэвтрэх код</div>
            <div className="mt-1 font-bold">{s.name}</div>
            <div className="mt-1 font-mono text-2xl font-bold tracking-[0.25em]">{s.login_code}</div>
            <div className="mt-1 break-all font-mono text-[11px] font-semibold text-violet-700">{site}</div>
            <ol className="mt-2 space-y-0.5 text-left text-[10px] leading-tight text-slate-600">
              <li>1. Дээрх хаягаар орж кодоо оруул</li>
              <li>2. Нээлттэй даалгавраа бичих / зургаа оруулах</li>
              <li>
                3. <b>Заавал &quot;Илгээх&quot; дар</b> — хугацаа дуусвал хаагдана
              </li>
            </ol>
            <div className="mt-1 text-[10px] text-slate-400">Кодоо бусдад бүү өг</div>
          </div>
        ))}
      </div>
    </div>
  );
}
