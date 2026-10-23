import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Nav from "@/components/Nav";
import SubmissionReview from "@/components/SubmissionReview";
import ScorePanel from "@/components/teacher/ScorePanel";
import { canAccessClass, currentTeacher } from "@/lib/auth";
import { findStage, getDraft, getExtension, getStages, getStudent, getSubmission, listSubmissions } from "@/lib/data";
import { UUID_RE } from "@/lib/repo";
import { ASSIGNMENTS, formatUB, now, stageEnd } from "@/lib/stages";
import { overlap, wordCount } from "@/lib/textTools";
import { commentViews, reviewViews, versionViews } from "@/lib/views";
import ReviewList from "@/components/ReviewList";
import { average, rubricFor } from "@/lib/rubric";

export const dynamic = "force-dynamic";

export default async function TeacherSubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await currentTeacher();
  if (!session) redirect("/teacher");
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const sub = await getSubmission(id);
  const owner = sub ? await getStudent(sub.student_id) : null;
  if (!owner || !canAccessClass(session, owner.class_id)) notFound();
  const stages = await getStages(owner.class_id);
  const stage = sub && findStage(stages, sub.stage_id);
  if (!sub || !stage) notFound();

  const [student, comments, ext, own, all, versions, draft] = await Promise.all([
    getStudent(sub.student_id),
    commentViews(sub.id, "teacher", null),
    getExtension(sub.student_id, stage.id),
    listSubmissions({ student_id: sub.student_id }),
    listSubmissions(),
    versionViews(sub.id),
    getDraft(sub.student_id, stage.id),
  ]);
  const assignment = ASSIGNMENTS.find((a) => a.id === stage.assignment)!;
  const deadline = ext && new Date(ext.until) > stageEnd(stage) ? new Date(ext.until) : stageEnd(stage);
  const late = new Date(sub.updated_at) > stageEnd(stage);

  const reviews = await reviewViews(sub.id, "teacher", null, stage.max);
  const scoresOf = (role: "self" | "peer") => reviews.filter((r) => r.role === role && r.score !== null).map((r) => r.score!);

  // Энэ бүтээлтэй хамгийн төстэй бусдын бүтээл
  const similar =
    stage.kind === "text"
      ? all
          .filter((o) => o.student_id !== sub.student_id && stages.find((s) => s.id === o.stage_id)?.assignment === stage.assignment)
          .map((o) => ({ o, p: Math.round(Math.max(overlap(sub.body, o.body), overlap(o.body, sub.body)) * 100) }))
          .filter((x) => x.p >= 20)
          .sort((a, b) => b.p - a.p)
          .slice(0, 3)
      : [];

  return (
    <div className="pb-16">
      <Nav teacher />
      <div className="mx-auto max-w-6xl px-4">
        <Link href="/teacher" className="text-sm text-slate-500 hover:underline">
          ← Багшийн самбар
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold">
            {assignment.emoji} {assignment.name} · {stage.label}
          </h1>
          <Link href={`/teacher/student/${sub.student_id}`} className="rounded-lg bg-violet-100 px-2 py-1 font-semibold text-violet-800 hover:underline">
            {student?.name}
          </Link>
        </div>

        {/* Бусад шат руу */}
        <div className="mt-3 flex flex-wrap gap-2">
          {stages
            .filter((s) => s.assignment === stage.assignment)
            .map((s) => {
              const o = own.find((x) => x.stage_id === s.id);
              return o ? (
                <Link key={s.id} href={`/teacher/s/${o.id}`} className={`rounded-lg px-3 py-1 text-sm font-semibold ${s.id === stage.id ? "bg-violet-600 text-white" : "bg-white text-slate-600 hover:bg-violet-50"}`}>
                  {s.label}
                </Link>
              ) : (
                <span key={s.id} className="rounded-lg bg-slate-100 px-3 py-1 text-sm text-slate-400">
                  {s.label} (илгээгээгүй)
                </span>
              );
            })}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Анх илгээсэн" value={formatUB(sub.submitted_at)} />
          <Info
            label="Сүүлд илгээсэн"
            value={`${formatUB(sub.updated_at)} · ${Math.max(1, versions.length)} удаа`}
            warn={late ? "сунгалтаар" : undefined}
          />
          <Info label="Хугацаа" value={`${formatUB(deadline)}${now() > deadline ? " (дууссан)" : ""}`} />
          <Info
            label={stage.kind === "text" ? "Үг / хуулж тавьсан" : "Зураг"}
            value={stage.kind === "text" ? `${wordCount(sub.body)} үг / ${sub.paste_chars.toLocaleString()} тэмдэгт` : `${sub.images.length} хуудас`}
            warn={stage.kind === "text" && sub.body.length > 200 && sub.paste_chars > sub.body.length * 0.5 ? "ихэнхийг хуулж тавьсан" : undefined}
          />
        </div>

        {draft && (
          <div className="mt-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
            📝 Сурагч илгээснээсээ хойш ноорогт өөрчлөлт хийсэн ч дахин илгээгээгүй байна ({formatUB(draft.updated_at)}).{" "}
            <Link href={`/teacher/draft/${draft.id}`} className="font-semibold underline">
              Ноорогийг харах
            </Link>
          </div>
        )}

        {similar.length > 0 && (
          <div className="mt-3 rounded-2xl bg-rose-50 p-4 text-sm">
            <b className="text-rose-700">🔁 Ижил төстэй бүтээл:</b>{" "}
            {similar.map(({ o, p }) => (
              <Link key={o.id} href={`/teacher/s/${o.id}`} className="ml-2 underline">
                {stages.find((s) => s.id === o.stage_id)?.label} ({p}%)
              </Link>
            ))}
          </div>
        )}

        <ScorePanel
          id={sub.id}
          max={stage.max}
          score={sub.teacher_score}
          selfAvg={average(scoresOf("self"))}
          peerAvg={average(scoresOf("peer"))}
          publishable={!!stage.final}
          published={sub.published}
          canPublish={now() > stageEnd(stage)}
          authorName={student?.name ?? ""}
          authorDisplay={sub.author_display}
        />

        <section className="mt-5">
          <h2 className="mb-2 font-display font-bold">📋 Өөрийн ба хөндлөнгийн үнэлгээ (шалгуураар)</h2>
          <ReviewList reviews={reviews} criteria={rubricFor(stage)} max={stage.max} empty="Шалгуурын үнэлгээ хараахан ирээгүй" />
        </section>

        <div className="mt-5">
          <SubmissionReview
            submission={{ id: sub.id, title: sub.title, body: sub.body, images: sub.images, kind: stage.kind }}
            comments={comments}
            versions={versions}
            role="teacher"
            canComment
          />
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, warn }: { label: string; value: string; warn?: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
      <div className="text-xs font-bold text-slate-400">{label}</div>
      <div className="font-semibold">{value}</div>
      {warn && <div className="text-xs font-bold text-amber-700">⚠️ {warn}</div>}
    </div>
  );
}
