import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Nav from "@/components/Nav";
import StageEditor from "@/components/StageEditor";
import SubmissionReview from "@/components/SubmissionReview";
import { currentStudent } from "@/lib/auth";
import { findStage, getDraft, getExtension, getStages, listSubmissions } from "@/lib/data";
import ReviewList from "@/components/ReviewList";
import RubricForm from "@/components/RubricForm";
import { rubricFor } from "@/lib/rubric";
import { ASSIGNMENTS, catchupOpen, formatUB, now, peerReviewEnd, rangeLabel, stageEnd, windowState } from "@/lib/stages";
import { commentViews, reviewViews, versionViews } from "@/lib/views";

export const dynamic = "force-dynamic";

export default async function StagePage({ params }: { params: Promise<{ stageId: string }> }) {
  const me = await currentStudent();
  if (!me) redirect("/login");
  const { stageId } = await params;
  const stages = await getStages(me.class_id);
  const stage = findStage(stages, stageId);
  if (!stage) notFound();

  const [ext, [sub], draft] = await Promise.all([
    getExtension(me.id, stage.id),
    listSubmissions({ student_id: me.id, stage_id: stage.id }),
    getDraft(me.id, stage.id),
  ]);
  const at = now();
  const state = windowState(stage, ext?.until, at);
  if (state === "upcoming") redirect("/me");
  const deadline = ext && new Date(ext.until) > stageEnd(stage) ? new Date(ext.until) : stageEnd(stage);
  // Багш нөхөлт нээсэн бол хоцорсон сурагч хугацаа дууссан ч оруулна (ажил нь "хоцорсон" гэж тэмдэглэгдэнэ)
  const catchup = catchupOpen(stage, state, sub);
  const assignment = ASSIGNMENTS.find((a) => a.id === stage.assignment)!;

  // Өмнөх үе шатын бүтээл (жишээ нь Ноорог-2 бичихэд Ноорог-1-ийг харах, эцсийн бүтээлд Ноорог-2-оос эхлэх)
  const sameAssignment = stages.filter((s) => s.assignment === stage.assignment);
  const prevStage = sameAssignment[sameAssignment.indexOf(stage) - 1];
  const [prev] = prevStage ? await listSubmissions({ student_id: me.id, stage_id: prevStage.id }) : [];

  const [comments, versions, reviews] = sub
    ? await Promise.all([commentViews(sub.id, "self", me.id), versionViews(sub.id), reviewViews(sub.id, "self", me.id, stage.max)])
    : [[], [], []];
  const selfReview = reviews.find((r) => r.role === "self");
  const peerReviews = reviews.filter((r) => r.role === "peer");
  const reviewEnd = peerReviewEnd(stage);
  const pick = (x: { title: string; body: string; images: string[]; updated_at: string }) => ({
    title: x.title,
    body: x.body,
    images: x.images,
    updated_at: x.updated_at,
  });

  return (
    <div className="pb-16">
      <Nav studentName={me.name} />
      <div className="mx-auto max-w-6xl px-4">
        <Link href="/me" className="text-sm text-slate-500 hover:underline">
          ← Миний даалгаврууд
        </Link>
        <div className="mt-2 flex flex-wrap items-end gap-x-3">
          <h1 className="font-display text-xl font-bold sm:text-2xl">
            {assignment.emoji} {assignment.name} · {stage.label}
          </h1>
          <span className="text-slate-500">
            {rangeLabel(stage)} · {stage.max} оноо
          </span>
        </div>

        {state === "open" || catchup ? (
          <StageEditor
            catchup={catchup}
            stage={{ id: stage.id, kind: stage.kind, label: stage.label }}
            deadline={deadline.toISOString()}
            serverNow={at.toISOString()}
            existing={sub ? pick(sub) : null}
            serverDraft={draft ? pick(draft) : null}
            previous={prev ? { label: prevStage.label, kind: prevStage.kind, title: prev.title, body: prev.body, images: prev.images } : null}
          />
        ) : (
          <div className="mt-4 rounded-2xl bg-slate-900 px-5 py-4 text-white">
            ⛔ Хугацаа {formatUB(deadline)}-д дууссан.{" "}
            {sub ? (sub.late ? "Таны хоцорч нөхсөн бүтээл доор байна." : "Таны илгээсэн бүтээл доор байна.") : "Та энэ шатыг илгээгээгүй байна."}
            {!sub && draft && <div className="mt-1 text-sm text-amber-300">Танд илгээгээгүй ноорог үлдсэн байна — багшдаа хэлээрэй.</div>}
          </div>
        )}

        {sub && (
          <section className="mt-8">
            <h2 className="mb-3 font-display text-lg font-bold">
              💬 Илгээсэн бүтээл ба сэтгэгдлүүд
              {sub.teacher_score !== null && (
                <span className="ml-3 whitespace-nowrap rounded-lg bg-emerald-100 px-2 py-1 text-base text-emerald-800">
                  Багшийн оноо: {sub.teacher_score}/{stage.max}
                </span>
              )}
            </h2>
            <div className="mb-5 grid gap-5 lg:grid-cols-2">
              <RubricForm
                submissionId={sub.id}
                role="self"
                criteria={rubricFor(stage)}
                existing={selfReview ? { ratings: selfReview.ratings, strength: selfReview.strength, suggestion: selfReview.suggestion } : null}
                open={at <= reviewEnd}
                closesAt={formatUB(reviewEnd)}
              />
              <div>
                <h3 className="mb-2 font-display font-bold">👥 Ангийн найзуудын үнэлгээ</h3>
                <ReviewList
                  reviews={peerReviews}
                  criteria={rubricFor(stage)}
                  max={stage.max}
                  empty={state === "closed" ? "Одоогоор үнэлгээ ирээгүй байна" : "Хугацаа дууссаны дараа ангийн 2 найз тань нэргүйгээр үнэлнэ"}
                />
              </div>
            </div>
            <p className="mb-3 text-sm text-slate-500">Текстээс үг, өгүүлбэр сонгож тэмдэглэл үлдээж болно.</p>
            <SubmissionReview
              submission={{ id: sub.id, title: sub.title, body: sub.body, images: sub.images, kind: stage.kind }}
              comments={comments}
              versions={versions}
              role="self"
              canComment
            />
          </section>
        )}
      </div>
    </div>
  );
}
