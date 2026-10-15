import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Nav from "@/components/Nav";
import AcceptDraftButton from "@/components/teacher/AcceptDraftButton";
import ExtensionControl from "@/components/teacher/ExtensionControl";
import ParentLink from "@/components/teacher/ParentLink";
import { isTeacher, reportToken } from "@/lib/auth";
import { getStages, getStudent, listDrafts, listExtensions, listSubmissions, studentTotals } from "@/lib/data";
import { UUID_RE } from "@/lib/repo";
import { ASSIGNMENTS, ATTENDANCE_MAX, formatUB, now, rangeLabel, windowState } from "@/lib/stages";

export const dynamic = "force-dynamic";

export default async function TeacherStudentPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isTeacher())) redirect("/teacher");
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const student = await getStudent(id);
  if (!student) notFound();
  const [stages, subs, exts, drafts] = await Promise.all([
    getStages(),
    listSubmissions({ student_id: id }),
    listExtensions({ student_id: id }),
    listDrafts({ student_id: id }),
  ]);
  const totals = studentTotals(student, stages, subs);
  const at = now();

  return (
    <div className="pb-16">
      <Nav teacher />
      <div className="mx-auto max-w-4xl px-4">
        <Link href="/teacher" className="text-sm text-slate-500 hover:underline">
          ← Багшийн самбар
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold">{student.name}</h1>
          <span className="rounded-lg bg-slate-100 px-2 py-1 font-mono font-bold tracking-widest">{student.login_code}</span>
          <span className="ml-auto flex flex-wrap items-center gap-2">
            <ParentLink path={`/report/${id}.${reportToken(id)}`} />
            <Link href={`/teacher/report/${id}`} className="rounded-xl bg-violet-600 px-4 py-2 font-bold text-white hover:bg-violet-700">
              📄 Явцын тайлан
            </Link>
          </span>
        </div>
        <p className="mt-2 text-slate-600">
          Нийт: <b className="font-display text-lg">{totals.total}</b> (ирц/идэвх {totals.attendance ?? "—"}/{ATTENDANCE_MAX}, бүтээл {totals.works}, нэмэлт {totals.bonus})
        </p>

        {ASSIGNMENTS.map((a) => (
          <section key={a.id} className="mt-6">
            <h2 className="font-display font-bold">
              {a.emoji} {a.name}
            </h2>
            <div className="mt-2 flex flex-col gap-2">
              {stages
                .filter((s) => s.assignment === a.id)
                .map((st) => {
                  const sub = subs.find((s) => s.stage_id === st.id);
                  const ext = exts.find((e) => e.stage_id === st.id) ?? null;
                  const draft = drafts.find((d) => d.stage_id === st.id);
                  const state = windowState(st, ext?.until, at);
                  return (
                    <div key={st.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                      <div className="min-w-40">
                        <div className="font-bold">{st.label}</div>
                        <div className="text-xs text-slate-500">
                          {rangeLabel(st)} · {state === "open" ? "нээлттэй" : state === "upcoming" ? "нээгдээгүй" : "хаагдсан"}
                        </div>
                      </div>
                      <div className="text-sm">
                        {sub ? (
                          <Link href={`/teacher/s/${sub.id}`} className="font-semibold text-violet-700 hover:underline">
                            ✅ {formatUB(sub.updated_at)} · {sub.teacher_score ?? "—"}/{st.max} оноо →
                          </Link>
                        ) : (
                          <span className="text-slate-400">Илгээгээгүй</span>
                        )}
                        {draft && (
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <Link href={`/teacher/draft/${draft.id}`} className="font-semibold text-amber-700 hover:underline">
                              📝 Илгээгээгүй ноорог ({formatUB(draft.updated_at)}) →
                            </Link>
                            {state === "closed" && <AcceptDraftButton draftId={draft.id} submissionExists={!!sub} />}
                          </div>
                        )}
                      </div>
                      <div className="ml-auto">
                        <ExtensionControl studentId={id} stageId={st.id} until={ext?.until ?? null} stageEnd={st.end} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
