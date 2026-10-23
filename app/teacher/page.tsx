import Nav from "@/components/Nav";
import TeacherHome from "@/components/teacher/TeacherHome";
import TeacherLogin from "@/components/TeacherLogin";
import { currentTeacher } from "@/lib/auth";
import { activeClassId } from "@/lib/auth";
import { listTeachers } from "@/lib/data";
import { getClass, getStages, listClasses, listDrafts, listExtensions, listReviews, listStudents, listSubmissions, peerTargets, studentTotals } from "@/lib/data";
import { now, peerReviewEnd, stageEnd } from "@/lib/stages";
import { overlap, wordCount } from "@/lib/textTools";

export const dynamic = "force-dynamic";
export const metadata = { title: "Багшийн самбар · 8А" };


export default async function TeacherPage() {
  const session = await currentTeacher();
  if (!session) return <TeacherLogin />;
  const classId = await activeClassId(session);

  const [stages, students, allSubs, allExtensions, allDrafts, reviews, classes, cls] = await Promise.all([
    getStages(classId),
    listStudents(classId),
    listSubmissions(),
    listExtensions(),
    listDrafts(),
    listReviews(),
    listClasses(),
    getClass(classId),
  ]);
  const teachers = session.isAdmin ? await listTeachers() : [];
  // Зөвхөн энэ ангийн сурагчдын мэдээлэл
  const mine = new Set(students.map((s) => s.id));
  const subs = allSubs.filter((s) => mine.has(s.student_id));
  const extensions = allExtensions.filter((e) => mine.has(e.student_id));
  const drafts = allDrafts.filter((d) => mine.has(d.student_id));
  const at = now();

  // Хөндлөнгийн үнэлгээний хяналт: хугацаа нь дууссан үе шат бүрд хэн хэнийг үнэлэх, үнэлсэн эсэх
  const peer = stages
    .filter((st) => at > stageEnd(st))
    .map((st) => {
      const stageSubs = subs.filter((s) => s.stage_id === st.id);
      return {
        stage_id: st.id,
        open: at <= peerReviewEnd(st),
        ends: peerReviewEnd(st).toISOString(),
        rows: students.map((stu) => ({
          student_id: stu.id,
          targets: peerTargets(st, stu.id, students, subs).map((t) => ({
            submission_id: t.id,
            author_id: t.student_id,
            done: reviews.some((r) => r.role === "peer" && r.reviewer_student_id === stu.id && r.submission_id === t.id),
          })),
          received: reviews.filter((r) => r.role === "peer" && stageSubs.find((s) => s.id === r.submission_id)?.student_id === stu.id).length,
          selfDone: reviews.some((r) => r.role === "self" && r.reviewer_student_id === stu.id && stageSubs.some((s) => s.id === r.submission_id)),
          submitted: stageSubs.some((s) => s.student_id === stu.id),
        })),
      };
    });

  // Хуулбар шалгах: нэг даалгаврын (нийтлэл/эргэцүүлэл) бүх текстийг хоорондоо харьцуулна
  const textSubs = subs.filter((s) => stages.find((st) => st.id === s.stage_id)?.kind === "text");
  const flags: { a: string; b: string; percent: number }[] = [];
  for (let i = 0; i < textSubs.length; i++) {
    for (let j = i + 1; j < textSubs.length; j++) {
      const a = textSubs[i];
      const b = textSubs[j];
      if (a.student_id === b.student_id) continue;
      if (stages.find((s) => s.id === a.stage_id)?.assignment !== stages.find((s) => s.id === b.stage_id)?.assignment) continue;
      const p = Math.max(overlap(a.body, b.body), overlap(b.body, a.body));
      if (p >= 0.2) flags.push({ a: a.id, b: b.id, percent: Math.round(p * 100) });
    }
  }

  return (
    <div className="pb-16">
      <Nav teacher />
      <TeacherHome
        now={at.toISOString()}
        peer={peer}
        stages={stages}
        students={students.map((s) => ({ ...s, totals: studentTotals(s, stages, subs) }))}
        submissions={subs.map((s) => ({
          id: s.id,
          student_id: s.student_id,
          stage_id: s.stage_id,
          title: s.title,
          words: wordCount(s.body),
          images: s.images.length,
          paste_chars: s.paste_chars,
          body_chars: s.body.length,
          teacher_score: s.teacher_score,
          published: s.published,
          author_display: s.author_display,
          view_count: s.view_count,
          updated_at: s.updated_at,
        }))}
        classes={classes}
        activeClass={classId}
        teacherName={session.name}
        isAdmin={session.isAdmin}
        teachers={teachers}
        extensions={extensions}
        drafts={drafts.map((d) => ({ id: d.id, student_id: d.student_id, stage_id: d.stage_id, updated_at: d.updated_at }))}
        flags={flags.sort((x, y) => y.percent - x.percent)}
      />
    </div>
  );
}
