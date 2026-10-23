import Link from "next/link";
import Nav from "@/components/Nav";
import { currentStudent, isTeacher } from "@/lib/auth";
import { getStages, isPublic, listClasses, listStudents, listSubmissions } from "@/lib/data";
import { formatUB } from "@/lib/stages";
import { wordCount } from "@/lib/textTools";
import { publicName } from "@/lib/names";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [teacher, student, classes, students, subs] = await Promise.all([
    isTeacher(),
    currentStudent(),
    listClasses(),
    listStudents(),
    listSubmissions({ published: true }),
  ]);
  const names = new Map(students.map((s) => [s.id, s.name]));
  const classOf = new Map(students.map((s) => [s.id, s.class_id]));
  // Анги бүр өөрийн хуваартай тул тухайн сурагчийн ангийн хуваариар шалгана
  const stagesByClass = new Map(await Promise.all(classes.map(async (c) => [c.id, await getStages(c.id)] as const)));
  // Зөвхөн багш зөвшөөрсөн, хугацаа нь дууссан эцсийн бүтээлүүд
  const articles = subs
    .filter((s) => {
      const stages = stagesByClass.get(classOf.get(s.student_id) ?? "") ?? [];
      return isPublic(s, stages.find((st) => st.id === s.stage_id));
    })
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  return (
    <div className="pb-16">
      <Nav teacher={teacher} studentName={student?.name} />
      <div className="mx-auto max-w-6xl px-4">
        <section className="relative overflow-hidden rounded-3xl bg-[#0f0a1f] px-6 py-12 text-white sm:px-12">
          <div className="absolute -left-20 -top-24 h-72 w-72 rounded-full bg-violet-600/50 blur-3xl" />
          <div className="absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-fuchsia-500/40 blur-3xl" />
          <div className="relative">
            <p className="font-display text-sm font-semibold tracking-widest text-fuchsia-300">МОНГОЛ ХЭЛ · 8А</p>
            <h1 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-5xl">
              Бидний бичсэн
              <br />
              <span className="bg-gradient-to-r from-cyan-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">нийтлэлүүд</span>
            </h1>
            <p className="mt-4 max-w-xl text-white/75">
              Ноорог → засвар → эцсийн бүтээл. Багшийн шалгаж зөвшөөрсөн шилдэг нийтлэлүүд энд нийтлэгдэнэ.
            </p>
            {!teacher && !student && (
              <Link href="/login" className="mt-6 inline-block rounded-2xl bg-white px-6 py-3 font-bold text-violet-700 transition hover:scale-105">
                Кодоороо нэвтрэх →
              </Link>
            )}
            {student && (
              <Link href="/me" className="mt-6 inline-block rounded-2xl bg-white px-6 py-3 font-bold text-violet-700 transition hover:scale-105">
                Миний даалгаврууд →
              </Link>
            )}
          </div>
        </section>

        <h2 className="mb-4 mt-10 font-display text-xl font-bold">📰 Нийтлэгдсэн ({articles.length})</h2>
        {articles.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 p-12 text-center text-slate-500">
            Одоогоор нийтлэгдсэн нийтлэл алга. Эцсийн бүтээлийн хугацаа дуусч, багш зөвшөөрсний дараа энд харагдана.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => (
              <Link key={a.id} href={`/n/${a.id}`} className="group flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-lg">
                <h3 className="font-display text-lg font-bold leading-snug group-hover:text-violet-700">{a.title}</h3>
                <p className="mt-2 line-clamp-4 flex-1 font-serif text-slate-600">{a.body}</p>
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                  <span>✍️ {publicName(names.get(a.student_id) ?? "", a.author_display)}</span>
                  <span className="ml-auto">
                    {wordCount(a.body)} үг · 👀 {a.view_count}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-400">{formatUB(a.updated_at, false)}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
