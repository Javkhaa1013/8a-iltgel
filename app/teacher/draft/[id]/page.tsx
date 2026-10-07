import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Nav from "@/components/Nav";
import AcceptDraftButton from "@/components/teacher/AcceptDraftButton";
import { isTeacher } from "@/lib/auth";
import { findStage, getStages, getStudent, listDrafts, listSubmissions } from "@/lib/data";
import { UUID_RE } from "@/lib/repo";
import { ASSIGNMENTS, formatUB, stageEnd } from "@/lib/stages";
import { wordCount } from "@/lib/textTools";

export const dynamic = "force-dynamic";

// Багш: сурагчийн илгээгээгүй ноорогийг харах
export default async function DraftPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isTeacher())) redirect("/teacher");
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const [draft] = await listDrafts({ id });
  const stage = draft && findStage(await getStages(), draft.stage_id);
  if (!draft || !stage) notFound();
  const [student, [sub]] = await Promise.all([getStudent(draft.student_id), listSubmissions({ student_id: draft.student_id, stage_id: stage.id })]);
  const assignment = ASSIGNMENTS.find((a) => a.id === stage.assignment)!;

  return (
    <div className="pb-16">
      <Nav teacher />
      <div className="mx-auto max-w-4xl px-4">
        <Link href={`/teacher/student/${draft.student_id}`} className="text-sm text-slate-500 hover:underline">
          ← {student?.name}
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold">
          📝 Илгээгээгүй ноорог · {assignment.name} {stage.label}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
          <span>
            Сүүлд хадгалсан: <b>{formatUB(draft.updated_at)}</b> (хугацаа {formatUB(stageEnd(stage))})
            {sub ? ` · Илгээсэн хувилбар: ${formatUB(sub.updated_at)}` : " · Илгээгээгүй"}
          </span>
          <span className="ml-auto">
            <AcceptDraftButton draftId={draft.id} submissionExists={!!sub} />
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-500">Ноорог зөвхөн хугацаа нээлттэй үед хадгалагддаг тул хугацаанаас хойш бичсэн зүйл энд байхгүй.</p>

        <div className="mt-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          {stage.kind === "image" ? (
            draft.images.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {draft.images.map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={src} src={src} alt="" className="w-full rounded-xl ring-1 ring-slate-200" />
                ))}
              </div>
            ) : (
              <p className="text-slate-400">Зураг алга</p>
            )
          ) : (
            <>
              <h2 className="font-display text-xl font-bold">{draft.title || "(гарчиггүй)"}</h2>
              <div className="mt-1 text-sm text-slate-400">{wordCount(draft.body)} үг</div>
              <div className="article-text mt-4">{draft.body || "(хоосон)"}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
