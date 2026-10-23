import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Nav from "@/components/Nav";
import SubmissionReview from "@/components/SubmissionReview";
import { currentStudent } from "@/lib/auth";
import { accessTo, findStage, getStages, getSubmission } from "@/lib/data";
import { UUID_RE } from "@/lib/repo";
import { ASSIGNMENTS, formatUB, peerReviewEnd } from "@/lib/stages";
import { rubricFor } from "@/lib/rubric";
import { commentViews, reviewViews } from "@/lib/views";
import RubricForm from "@/components/RubricForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Хөндлөнгийн үнэлгээ · 8А" };

// Ангийн найзын бүтээлийг нэргүйгээр үнэлэх
export default async function PeerReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await currentStudent();
  if (!me) redirect("/login");
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const sub = await getSubmission(id);
  const stage = sub && findStage(await getStages(me.class_id), sub.stage_id);
  if (!sub || !stage) notFound();
  if (sub.student_id === me.id) redirect(`/me/${stage.id}`);

  // Хугацаа дуусаагүй, эсвэл танд хуваарилагдаагүй бол харуулахгүй
  const access = await accessTo(sub, stage, { teacher: false, student: me });
  if (access !== "peer") notFound();

  const assignment = ASSIGNMENTS.find((a) => a.id === stage.assignment)!;
  const [mine] = await reviewViews(sub.id, "peer", me.id, stage.max);
  return (
    <div className="pb-16">
      <Nav studentName={me.name} />
      <div className="mx-auto max-w-6xl px-4">
        <Link href="/me" className="text-sm text-slate-500 hover:underline">
          ← Миний даалгаврууд
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold">
          👥 Хөндлөнгийн үнэлгээ · {assignment.name} {stage.label}
        </h1>
        <p className="mt-1 text-slate-500">
          Ангийн найзынхаа бүтээлийг уншаад сайн тал, сайжруулах зүйлийг нь хүндэтгэлтэйгээр бичээрэй. Зохиогчийн нэр нууц, таны нэр ч түүнд
          харагдахгүй (багш харна). {formatUB(peerReviewEnd(stage))} хүртэл нээлттэй.
        </p>
        <div className="mt-5">
          <RubricForm
            submissionId={sub.id}
            role="peer"
            criteria={rubricFor(stage)}
            existing={mine ? { ratings: mine.ratings, strength: mine.strength, suggestion: mine.suggestion } : null}
            open
            closesAt={formatUB(peerReviewEnd(stage))}
          />
        </div>
        <h2 className="mb-2 mt-8 font-display text-lg font-bold">💬 Тодорхой хэсэгт сэтгэгдэл (заавал биш)</h2>
        <div>
          <SubmissionReview
            submission={{ id: sub.id, title: sub.title, body: sub.body, images: sub.images, kind: stage.kind }}
            comments={await commentViews(sub.id, "peer", me.id)}
            role="peer"
            canComment
          />
        </div>
      </div>
    </div>
  );
}
