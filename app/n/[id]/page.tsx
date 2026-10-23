import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import ViewCounter from "@/components/ViewCounter";
import { currentStudent, isTeacher } from "@/lib/auth";
import { findStage, getStudent, getSubmission, isPublic, stagesForSubmission } from "@/lib/data";
import { UUID_RE } from "@/lib/repo";
import { formatUB } from "@/lib/stages";
import { wordCount } from "@/lib/textTools";
import { publicName } from "@/lib/names";

type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  if (!UUID_RE.test(id)) return null;
  const sub = await getSubmission(id);
  if (!sub || !isPublic(sub, findStage(await stagesForSubmission(sub), sub.stage_id))) return null;
  return { sub, author: await getStudent(sub.student_id) };
}

export async function generateMetadata({ params }: Props) {
  const data = await load((await params).id);
  return { title: data ? `${data.sub.title} · 8А Нийтлэл` : "Олдсонгүй" };
}

export default async function ArticlePage({ params }: Props) {
  const data = await load((await params).id);
  if (!data) notFound();
  const { sub, author } = data;
  const [teacher, student] = await Promise.all([isTeacher(), currentStudent()]);

  return (
    <div className="pb-20">
      <Nav teacher={teacher} studentName={student?.name} />
      <ViewCounter id={sub.id} />
      <article className="mx-auto max-w-2xl px-5">
        <p className="font-display text-xs font-semibold tracking-widest text-violet-600">8А · НИЙТЛЭЛ</p>
        <h1 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl">{sub.title}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-3 border-b border-slate-200 pb-6 text-sm text-slate-500">
          <span className="font-semibold text-slate-700">✍️ {publicName(author?.name ?? "", sub.author_display)}</span>
          <span>{formatUB(sub.updated_at, false)}</span>
          <span>{wordCount(sub.body)} үг</span>
          <span>👀 {sub.view_count}</span>
        </div>
        <div className="article-text mt-8 text-slate-800">{sub.body}</div>
      </article>
    </div>
  );
}
