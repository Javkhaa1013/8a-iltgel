import Link from "next/link";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import StudentGuide from "@/components/StudentGuide";
import { currentStudent } from "@/lib/auth";
import { getStages, listComments, listExtensions, listReviews, listStudents, listSubmissions, peerReviewOpen, peerTargets } from "@/lib/data";
import { ASSIGNMENTS, assignmentMax, catchupOpen, countsLate, formatUB, isLate, now, peerReviewEnd, rangeLabel, stageEnd, stageStart, timeLeft, windowState } from "@/lib/stages";

export const dynamic = "force-dynamic";
export const metadata = { title: "Миний даалгаврууд · 8А" };

export default async function MePage() {
  const me = await currentStudent();
  if (!me) redirect("/login");

  const [stages, mySubs, exts, students, allSubs] = await Promise.all([
    getStages(me.class_id),
    listSubmissions({ student_id: me.id }),
    listExtensions({ student_id: me.id }),
    listStudents(),
    listSubmissions(),
  ]);
  const at = now();

  const commentCounts = new Map<string, number>();
  await Promise.all(mySubs.map(async (s) => commentCounts.set(s.id, (await listComments(s.id)).filter((c) => c.author_role !== "self").length)));

  // Хөндлөнгийн үнэлгээний даалгавар (хугацаа дууссан үе шатууд)
  const peerTasks = await Promise.all(
    stages
      .filter((st) => peerReviewOpen(st, exts.find((e) => e.stage_id === st.id) ?? null, at))
      .map(async (st) => {
        const targets = peerTargets(st, me.id, students, allSubs);
        const done = await Promise.all(
          // Шалгуурын хуудсаа илгээсэн бол хийсэнд тооцно
          targets.map(async (t) => (await listReviews({ submission_id: t.id, reviewer_student_id: me.id, role: "peer" })).length > 0)
        );
        return { stage: st, targets: targets.map((t, i) => ({ id: t.id, done: done[i] })) };
      })
  );

  return (
    <div className="pb-16">
      <Nav studentName={me.name} />
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold">Сайн уу, {me.name}! 👋</h1>
          <span className="ml-auto">
            <StudentGuide studentId={me.id} />
          </span>
        </div>
        <p className="mt-1 text-slate-500">
          Хугацааг анхаараарай: хугацаа дууссаны дараа <b>оруулах боломжгүй</b>. Хугацааны өмнө хэдэн ч удаа засаж болно. Дуусаад заавал{" "}
          <b>&quot;Илгээх&quot;</b> дарна. Багш нөхөлт нээсэн тохиолдолд хоцорсон ажлыг оруулж болох ч <b>&quot;хоцорсон&quot;</b> гэж тэмдэглэгдэнэ.
        </p>

        {peerTasks.some((t) => t.targets.length) && (
          <section className="mt-6 rounded-2xl bg-emerald-50 p-5 ring-1 ring-emerald-100">
            <h2 className="font-display font-bold text-emerald-900">👥 Хөндлөнгийн үнэлгээ хийх</h2>
            <p className="mt-1 text-sm text-emerald-800">
              Ангийн найзуудынхаа бүтээлийг уншаад шалгуурын хуудсаар үнэлж, сайн тал ба зөвлөгөөгөө бичээрэй. Нэр нь нууц. Багш таны хийсэн эсэхийг харна.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {peerTasks.map(({ stage, targets }) =>
                targets.map((t, i) => (
                  <Link key={t.id} href={`/review/${t.id}`} className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 hover:ring-2 hover:ring-emerald-300">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${t.done ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                      {t.done ? "✅ Үнэлсэн" : "📝 Үнэлээгүй"}
                    </span>
                    <span className="font-semibold">
                      {ASSIGNMENTS.find((a) => a.id === stage.assignment)?.name} · {stage.label} — Бүтээл {String.fromCharCode(65 + i)}
                    </span>
                    <span className="ml-auto text-sm text-slate-500">{formatUB(peerReviewEnd(stage))} хүртэл</span>
                  </Link>
                ))
              )}
            </div>
          </section>
        )}

        {ASSIGNMENTS.map((a) => (
          <section key={a.id} className="mt-8">
            <h2 className="mb-3 font-display text-lg font-bold">
              {a.emoji} {a.name} <span className="text-sm font-normal text-slate-400">({assignmentMax(stages, a.id)} оноо)</span>
            </h2>
            <div className="grid gap-3 md:grid-cols-3">
              {stages
                .filter((s) => s.assignment === a.id)
                .map((st, idx) => {
                  const sub = mySubs.find((s) => s.stage_id === st.id);
                  const ext = exts.find((e) => e.stage_id === st.id);
                  const state = windowState(st, ext?.until, at);
                  const deadline = ext && new Date(ext.until) > stageEnd(st) ? new Date(ext.until) : stageEnd(st);
                  // Багш нөхөлт нээсэн бол хоцорсон сурагч хугацаа дууссан ч оруулж болно
                  const catchup = catchupOpen(st, state, sub);
                  const lateNow = countsLate(st, at); // хугацаа хойшилсон — одоо оруулбал хоцорсон
                  const badge =
                    state === "upcoming"
                      ? { cls: "bg-slate-100 text-slate-600", text: `🔒 ${formatUB(stageStart(st), false)}-нд нээгдэнэ` }
                      : state === "open"
                        ? {
                            cls: lateNow ? "bg-amber-100 text-amber-900" : "bg-violet-100 text-violet-800",
                            text: lateNow ? `⏰ Хоцорсон — ${timeLeft(deadline, at)} үлдсэн` : `⏳ ${timeLeft(deadline, at)} үлдсэн`,
                          }
                        : catchup
                          ? { cls: "bg-amber-100 text-amber-900", text: "⏰ Нөхөж оруулах нээлттэй" }
                          : { cls: "bg-slate-800 text-white", text: "⛔ Хугацаа дууссан" };
                  return (
                    <div key={st.id} className={`flex flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ${state === "open" ? "ring-violet-300" : "ring-slate-100"}`}>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                        <span>{idx + 1}-Р ШАТ</span>
                        <span className="ml-auto">{rangeLabel(st)}</span>
                      </div>
                      <div className="mt-1 font-display text-lg font-bold">{st.label}</div>
                      <div className="text-sm text-slate-500">{st.kind === "image" ? "📷 Гараар бичсэн ноорогийн зураг" : "⌨️ Текстээр"}</div>
                      <span className={`mt-3 w-fit rounded-full px-2.5 py-1 text-xs font-bold ${badge.cls}`}>{badge.text}</span>
                      {ext && <span className="mt-1 text-xs font-semibold text-amber-700">Багш {formatUB(ext.until)} хүртэл сунгасан</span>}
                      {lateNow && !sub && (
                        <span className="mt-1 text-xs font-semibold text-amber-700">Хугацаа нь {formatUB(st.lateAfter!)}-д дуусчихсан — одоо оруулбал хоцорсон гэж тэмдэглэгдэнэ</span>
                      )}
                      <div className="mt-3 flex-1 text-sm">
                        {sub ? (
                          <>
                            {isLate(sub, st, ext?.until) ? (
                              <div className="text-amber-700">⏰ Хоцорч нөхсөн: {formatUB(sub.updated_at)}</div>
                            ) : (
                              <div className="text-emerald-700">✅ Илгээсэн: {formatUB(sub.updated_at)}</div>
                            )}
                            {(commentCounts.get(sub.id) ?? 0) > 0 && <div className="text-amber-700">💬 {commentCounts.get(sub.id)} сэтгэгдэл</div>}
                            {sub.teacher_score !== null && (
                              <div className="font-bold text-slate-800">
                                Оноо: {sub.teacher_score} / {st.max}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className={catchup ? "font-semibold text-amber-700" : "text-slate-400"}>
                            {catchup ? "⏰ Илгээгээгүй — нөхөж оруулж болно" : state === "closed" ? "❌ Илгээгээгүй" : "Илгээгээгүй"}
                          </div>
                        )}
                      </div>
                      {state !== "upcoming" && (
                        <Link
                          href={`/me/${st.id}`}
                          className={`mt-3 rounded-xl px-3 py-2 text-center text-sm font-bold ${
                            state === "open"
                              ? "bg-violet-600 text-white hover:bg-violet-700"
                              : catchup
                                ? "bg-amber-500 text-white hover:bg-amber-600"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {state === "open"
                            ? sub
                              ? "✏️ Засах / сэтгэгдэл"
                              : "📤 Оруулах"
                            : catchup
                              ? sub
                                ? "✏️ Хоцорсон ажлаа засах"
                                : "⏰ Нөхөж оруулах"
                              : sub
                                ? "👀 Харах"
                                : "Дэлгэрэнгүй"}
                        </Link>
                      )}
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
