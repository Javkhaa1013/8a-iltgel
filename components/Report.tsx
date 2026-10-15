import Link from "next/link";
import { notFound } from "next/navigation";
import PrintButton from "@/components/PrintButton";
import ZoomImage from "@/components/ZoomImage";
import {
  getStages,
  getStudent,
  isPublic,
  listComments,
  listExtensions,
  listReviews,
  listStudents,
  listSubmissions,
  listVersions,
  peerTargets,
  studentTotals,
} from "@/lib/data";
import { average, ratingsToScore } from "@/lib/rubric";
import { UUID_RE } from "@/lib/repo";
import { ASSIGNMENTS, ATTENDANCE_MAX, formatUB, now, rangeLabel, stageEnd } from "@/lib/stages";
import { diffStats, wordCount, wordDiff } from "@/lib/textTools";
import type { Comment, Version } from "@/lib/types";


// Эцэг эхэд өгөх явцын тайлан (хэвлэж эсвэл PDF болгож өгнө)
/** Явцын тайлан. Багш болон (нууц холбоосоор) эцэг эх хоёулаа үзнэ. */
export default async function Report({ id, forParent = false }: { id: string; forParent?: boolean }) {
  if (!UUID_RE.test(id)) notFound();
  const student = await getStudent(id);
  if (!student) notFound();

  const [stages, subs, exts] = await Promise.all([getStages(), listSubmissions({ student_id: id }), listExtensions({ student_id: id })]);
  const comments = new Map<string, Comment[]>();
  const versions = new Map<string, Version[]>();
  const [allReviews, allStudents, allSubs] = await Promise.all([listReviews(), listStudents(), listSubmissions()]);
  await Promise.all(
    subs.map(async (s) => {
      comments.set(s.id, await listComments(s.id));
      versions.set(s.id, await listVersions(s.id));
    })
  );
  // Шалгуурын үнэлгээнээс тооцсон оноо: авсан (өөрийн, найзуудын) ба өгсөн (хөндлөнгийн үнэлгээ хийсэн эсэх)
  const reviewScores = (subId: string, role: "self" | "peer", max: number) =>
    average(
      allReviews
        .filter((r) => r.submission_id === subId && r.role === role)
        .map((r) => ratingsToScore(r.ratings, max))
        .filter((x): x is number => x !== null)
    );
  const peerDuty = (stageId: string) => {
    const st = stages.find((s) => s.id === stageId)!;
    const targets = peerTargets(st, id, allStudents, allSubs);
    const done = targets.filter((t) => allReviews.some((r) => r.role === "peer" && r.reviewer_student_id === id && r.submission_id === t.id)).length;
    return { done, total: targets.length, closed: now() > stageEnd(st) };
  };
  const totals = studentTotals(student, stages, subs);
  const maxTotal = ATTENDANCE_MAX + stages.reduce((n, s) => n + s.max, 0);

  return (
    <div className="mx-auto max-w-4xl bg-white p-6 text-slate-800 sm:p-10">
      <div className="no-print mb-6 flex items-center gap-3">
        {!forParent && (
          <Link href={`/teacher/student/${id}`} className="text-sm text-slate-500 hover:underline">
            ← Буцах
          </Link>
        )}
        <PrintButton label="🖨️ Хэвлэх / PDF болгох" />
      </div>

      <header className="border-b-4 border-violet-600 pb-4">
        <p className="text-sm font-bold tracking-widest text-violet-600">8А АНГИ · МОНГОЛ ХЭЛ · БИЕ ДААЛТ</p>
        <h1 className="mt-1 font-display text-3xl font-bold">Явцын тайлан</h1>
        <div className="mt-2 flex flex-wrap gap-x-6 text-slate-600">
          <span>
            Сурагч: <b className="text-slate-900">{student.name}</b>
          </span>
          <span>Тайлан гаргасан: {formatUB(now(), false)}</span>
        </div>
      </header>

      {/* Онооны хүснэгт — хичээлийн үнэлгээний хүснэгттэй ижил бүтэцтэй */}
      <section className="mt-6">
        <h2 className="font-display text-lg font-bold">1. Үнэлгээ</h2>
        <table className="mt-2 w-full border-collapse text-sm">
          <thead>
            <tr className="bg-violet-50 text-left">
              <th className="border border-slate-200 p-2">Даалгавар</th>
              <th className="border border-slate-200 p-2">Хугацаа</th>
              <th className="border border-slate-200 p-2">Илгээсэн</th>
              <th className="border border-slate-200 p-2 text-center">Оноо</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-200 p-2">Хичээлийн ирц, тэмдэглэл, гэрийн даалгавар, идэвх оролцоо</td>
              <td className="border border-slate-200 p-2">—</td>
              <td className="border border-slate-200 p-2">—</td>
              <td className="border border-slate-200 p-2 text-center font-bold">
                {totals.attendance ?? "—"} / {ATTENDANCE_MAX}
              </td>
            </tr>
            {ASSIGNMENTS.map((a) => (
              <AssignmentRows key={a.id} name={`${a.name} (багшийн, өөрийн, хөндлөнгийн үнэлгээ)`}>
                {stages
                  .filter((s) => s.assignment === a.id)
                  .map((st) => {
                    const sub = subs.find((s) => s.stage_id === st.id);
                    const ext = exts.find((e) => e.stage_id === st.id);
                    const late = sub && new Date(sub.updated_at) > stageEnd(st);
                    return (
                      <tr key={st.id}>
                        <td className="border border-slate-200 p-2 pl-6">{st.label}</td>
                        <td className="border border-slate-200 p-2">{rangeLabel(st)}</td>
                        <td className="border border-slate-200 p-2">
                          {sub ? (
                            <>
                              {formatUB(sub.updated_at)}
                              {late ? <span className="ml-1 text-amber-700">(сунгалтаар)</span> : <span className="ml-1 text-emerald-700">✓ хугацаандаа</span>}
                            </>
                          ) : (
                            <span className="text-rose-600">Илгээгээгүй{ext ? " (сунгалттай)" : ""}</span>
                          )}
                        </td>
                        <td className="border border-slate-200 p-2 text-center font-bold">
                          {sub?.teacher_score ?? "—"} / {st.max}
                        </td>
                      </tr>
                    );
                  })}
              </AssignmentRows>
            ))}
            <tr>
              <td className="border border-slate-200 p-2" colSpan={3}>
                Нэмэлт оноо (сайн дурын ажил, бүтээл олон хүнд хүрсэн){student.bonus_note ? `: ${student.bonus_note}` : ""}
              </td>
              <td className="border border-slate-200 p-2 text-center font-bold">{totals.bonus || "—"}</td>
            </tr>
            <tr className="bg-violet-600 text-white">
              <td className="p-2 font-bold" colSpan={3}>
                НИЙТ
              </td>
              <td className="p-2 text-center font-display text-lg font-bold">
                {totals.total} / {maxTotal}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Бүтээл бүрийн явц */}
      {ASSIGNMENTS.map((a, ai) => {
        const aStages = stages.filter((s) => s.assignment === a.id);
        const aSubs = aStages.map((st) => ({ st, sub: subs.find((s) => s.stage_id === st.id) }));
        const texts = aSubs.filter((x) => x.sub && x.st.kind === "text");
        const first = texts[0]?.sub;
        const last = texts[texts.length - 1]?.sub;
        const diff = first && last && first.id !== last.id ? wordDiff(first.body, last.body) : null;
        const stats = diff && diffStats(diff);

        return (
          <section key={a.id} className={`mt-8 ${ai > 0 ? "print-break" : ""}`}>
            <h2 className="font-display text-lg font-bold">
              {ai + 2}. {a.name}: ноорогоос эцсийн бүтээл хүртэл
            </h2>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {aSubs.map(({ st, sub }) => {
                const cs = sub ? comments.get(sub.id) ?? [] : [];
                return (
                  <div key={st.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                    <div className="font-bold">{st.label}</div>
                    {sub ? (
                      <>
                        <div className="text-slate-500">{st.kind === "image" ? `📷 ${sub.images.length} хуудас гар бичмэл` : `✍️ ${wordCount(sub.body)} үг`}</div>
                        {(() => {
                          const vs = versions.get(sub.id) ?? [];
                          return vs.length > 1 ? (
                            <div className="mt-1 text-slate-600">
                              🕘 {vs.length} удаа засаж илгээсэн:{" "}
                              <span className="text-slate-500">
                                {vs.map((v) => (st.kind === "text" ? `${formatUB(v.created_at).slice(5)} (${wordCount(v.body)} үг)` : formatUB(v.created_at).slice(5))).join(" → ")}
                              </span>
                            </div>
                          ) : null;
                        })()}
                        <div className="mt-1 text-slate-600">
                          Сэтгэгдэл: багш {cs.filter((c) => c.author_role === "teacher").length}, ангийнхан {cs.filter((c) => c.author_role === "peer").length}, өөрөө{" "}
                          {cs.filter((c) => c.author_role === "self").length}
                        </div>
                        <div className="text-slate-600">
                          Өөрийн үнэлгээ: {reviewScores(sub.id, "self", st.max) ?? "—"} · Найзуудын дундаж: {reviewScores(sub.id, "peer", st.max) ?? "—"} (/{st.max})
                        </div>
                        {(() => {
                          const d = peerDuty(st.id);
                          return d.closed && d.total > 0 ? (
                            <div className={d.done === d.total ? "text-emerald-700" : "text-amber-700"}>
                              Ангийнхныг үнэлсэн: {d.done}/{d.total}
                            </div>
                          ) : null;
                        })()}
                        {st.final && isPublic(sub, st) && <div className="font-semibold text-emerald-700">🌐 Сайтад нийтлэгдсэн · {sub.view_count} уншсан</div>}
                      </>
                    ) : (
                      <div className="text-rose-600">Илгээгээгүй</div>
                    )}
                  </div>
                );
              })}
            </div>

            {aSubs
              .filter((x) => x.sub && x.st.kind === "image")
              .map(({ st, sub }) => (
                <div key={st.id} className="mt-4">
                  <div className="text-sm font-bold text-slate-600">{st.label} — гараар бичсэн ноорог (баримт)</div>
                  <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {sub!.images.map((src) => (
                      <ZoomImage key={src} src={src} className="aspect-[3/4] w-full rounded-lg border border-slate-200 object-cover" />
                    ))}
                  </div>
                </div>
              ))}

            {diff && stats && (
              <div className="mt-5">
                <div className="text-sm font-bold text-slate-600">
                  Хэрхэн сайжруулсан: {texts[0].st.label} ({wordCount(first!.body)} үг) → {texts[texts.length - 1].st.label} ({wordCount(last!.body)} үг)
                  <span className="ml-2 rounded bg-emerald-100 px-1.5 text-emerald-800">+{stats.added} үг нэмсэн</span>
                  <span className="ml-1 rounded bg-rose-100 px-1.5 text-rose-800">−{stats.removed} үг хассан/зассан</span>
                </div>
                <div className="article-text mt-2 rounded-xl border border-slate-200 p-4 text-base">
                  {diff.map((p, i) => (p.type === "same" ? <span key={i}>{p.text}</span> : <span key={i} className={p.type === "add" ? "diff-add" : "diff-del"}>{p.text}</span>))}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  <span className="diff-add px-1">ногоон</span> — нэмсэн, <span className="diff-del px-1">улаан</span> — хассан хэсэг
                </p>
              </div>
            )}

            {(() => {
              const teacherNotes = aSubs.flatMap(({ st, sub }) =>
                sub ? (comments.get(sub.id) ?? []).filter((c) => c.author_role === "teacher").map((c) => ({ st, c })) : []
              );
              return teacherNotes.length ? (
                <div className="mt-5">
                  <div className="text-sm font-bold text-slate-600">Багшийн сэтгэгдэл</div>
                  <ul className="mt-2 space-y-2 text-sm">
                    {teacherNotes.map(({ st, c }) => (
                      <li key={c.id} className="rounded-lg bg-amber-50 p-2">
                        <span className="font-semibold text-amber-800">{st.label}:</span>{" "}
                        {c.quote && <span className="font-serif italic text-slate-500">“{c.quote.slice(0, 120)}” — </span>}
                        {c.body}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null;
            })()}
          </section>
        );
      })}

      <footer className="mt-12 grid grid-cols-2 gap-8 text-sm text-slate-600">
        <div className="border-t border-slate-300 pt-2">Багш:</div>
        <div className="border-t border-slate-300 pt-2">Эцэг эх / асран хамгаалагч:</div>
      </footer>
    </div>
  );
}

function AssignmentRows({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <>
      <tr className="bg-slate-50">
        <td className="border border-slate-200 p-2 font-semibold" colSpan={4}>
          {name}
        </td>
      </tr>
      {children}
    </>
  );
}
