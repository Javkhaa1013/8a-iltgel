import { createHash } from "node:crypto";
import { repo } from "./repo";
import {
  DEFAULT_STAGES,
  now,
  PEERS_PER_STUDENT,
  peerReviewEnd,
  sanitizeStages,
  stageEnd,
  windowState,
  type Stage,
} from "./stages";
import type { Class, Comment, Draft, Extension, Review, Student, Submission, Teacher, Version } from "./types";

// ---- Анги ----

/** Анхны ангийг үүсгэж, ангигүй сурагчдыг түүнд хамруулна (нэг удаагийн шилжилт) */
export async function listClasses(): Promise<Class[]> {
  let rows = await repo().select<Class>("classes");
  if (!rows.length) {
    await repo().insert("classes", { name: "8А" });
    rows = await repo().select<Class>("classes");
  }
  rows = rows.sort((a, b) => a.name.localeCompare(b.name, "mn"));
  const orphans = (await repo().select<Student>("students")).filter((s) => !s.class_id);
  if (orphans.length) {
    const first = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
    for (const o of orphans) await repo().update("students", { id: o.id }, { class_id: first.id });
  }
  return rows;
}

export async function getClass(id: string) {
  return (await listClasses()).find((c) => c.id === id) ?? null;
}

/** Анги заагаагүй үед ашиглах анхны анги */
export async function defaultClassId() {
  const rows = await listClasses();
  return [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at))[0].id;
}

/** Ангийн багш нар (нууц үгийн хэш хасаад) */
export async function listTeachers() {
  const rows = await repo().select<Teacher>("teachers");
  return rows.map((t) => ({ id: t.id, name: t.name, class_id: t.class_id ?? null }));
}

// ---- Хуваарь (анги тус бүрт) ----

const stagesKey = (classId: string) => `stages:${classId}`;

export async function getStages(classId: string): Promise<Stage[]> {
  const [row] = await repo().select<{ key: string; value: unknown }>("settings", { key: stagesKey(classId) });
  if (row) return sanitizeStages(row.value) || DEFAULT_STAGES;
  // Анги нэмэхээс өмнөх нийтлэг хуваарь — анхны ангид хэвээр үлдэнэ
  if (classId === (await defaultClassId())) {
    const [legacy] = await repo().select<{ value: unknown }>("settings", { key: "stages" });
    if (legacy) return sanitizeStages(legacy.value) || DEFAULT_STAGES;
  }
  return DEFAULT_STAGES;
}

export async function saveStages(classId: string, stages: Stage[]) {
  const key = stagesKey(classId);
  const existing = await repo().select("settings", { key });
  if (existing.length) await repo().update("settings", { key }, { value: stages });
  else await repo().insert("settings", { key, value: stages });
}

/** Сурагчийн бүтээл аль ангийн хуваариар явахыг тодорхойлно */
export async function stagesForSubmission(sub: Submission) {
  const student = await getStudent(sub.student_id);
  return student ? await getStages(student.class_id) : DEFAULT_STAGES;
}

export const findStage = (stages: Stage[], id: string) => stages.find((s) => s.id === id);

// ---- Сурагч, бүтээл ----

/** classId өгвөл зөвхөн тухайн ангийн сурагчид */
export async function listStudents(classId?: string) {
  await listClasses(); // ангигүй сурагч үлдээхгүй
  const rows = await repo().select<Student>("students", classId ? { class_id: classId } : {});
  return rows.sort((a, b) => a.name.localeCompare(b.name, "mn"));
}

/** Тухайн ангийн сурагчдын бүх бүтээл */
export async function listClassSubmissions(classId: string) {
  const ids = new Set((await listStudents(classId)).map((s) => s.id));
  return (await listSubmissions()).filter((s) => ids.has(s.student_id));
}

export async function getStudent(id: string) {
  const [s] = await repo().select<Student>("students", { id });
  return s ?? null;
}

function normalizeSubmission(s: Partial<Submission>): Submission {
  // Зурган бүтээлд текст байхгүй, текстэн бүтээлд зураг байхгүй — талбар бүрт анхны утга өгнө
  // (Supabase багануудын default-тай ижил; локал JSON-д байхгүй байж болно)
  return {
    ...(s as Submission),
    title: s.title ?? "",
    body: s.body ?? "",
    images: Array.isArray(s.images) ? s.images : [],
    paste_chars: Number(s.paste_chars ?? 0),
    late: s.late === true,
    view_count: Number(s.view_count ?? 0),
    published: s.published === true,
    author_display: s.author_display === "full" || s.author_display === "anon" ? s.author_display : "short",
    teacher_score: s.teacher_score === null || s.teacher_score === undefined ? null : Number(s.teacher_score),
  };
}

export async function listSubmissions(where: Partial<Submission> = {}) {
  return (await repo().select<Submission>("submissions", where)).map(normalizeSubmission);
}

export async function getSubmission(id: string) {
  const [s] = await listSubmissions({ id });
  return s ?? null;
}

export async function listComments(submissionId: string) {
  const rows = await repo().select<Comment>("comments", { submission_id: submissionId });
  return rows
    .map((c) => ({ ...c, score: c.score == null ? null : Number(c.score), version_no: c.version_no == null ? null : Number(c.version_no) }))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

// ---- Шалгуурын хуудсаар өгсөн үнэлгээ ----

export async function listReviews(where: Partial<Review> = {}): Promise<Review[]> {
  const rows = await repo().select<Review>("reviews", where);
  return rows.map((r) => ({
    ...r,
    ratings: r.ratings && typeof r.ratings === "object" ? Object.fromEntries(Object.entries(r.ratings).map(([k, v]) => [k, Number(v)])) : {},
    strength: r.strength ?? "",
    suggestion: r.suggestion ?? "",
  }));
}

// ---- Хувилбар (засварын түүх) ба ноорог ----

const withImages = <T extends { images?: unknown }>(r: T) => ({ ...r, images: Array.isArray(r.images) ? (r.images as string[]) : [] });

export async function listVersions(submissionId: string): Promise<Version[]> {
  const rows = await repo().select<Version>("submission_versions", { submission_id: submissionId });
  return rows
    .map((v) => ({ ...withImages(v), version_no: Number(v.version_no), title: v.title ?? "", body: v.body ?? "" }))
    .sort((a, b) => a.version_no - b.version_no);
}

export async function listDrafts(where: Partial<Draft> = {}): Promise<Draft[]> {
  return (await repo().select<Draft>("drafts", where)).map((d) => ({ ...withImages(d), title: d.title ?? "", body: d.body ?? "" }));
}

export async function getDraft(studentId: string, stageId: string) {
  const [d] = await listDrafts({ student_id: studentId, stage_id: stageId });
  return d ?? null;
}

type Content = { title?: string; body?: string; images?: string[]; paste_chars?: number };

/**
 * Бүтээлийг хадгална: шинээр үүсгэх эсвэл шинэчлэх, хувилбарын түүхэнд нэмэх, ноорогийг устгах.
 * Хугацааны шалгалтыг дуудаж буй газар хийнэ.
 */
export async function saveSubmission(studentId: string, stageId: string, content: Content, pastedDelta = 0, late = false) {
  const at = now().toISOString();
  const [existing] = await listSubmissions({ student_id: studentId, stage_id: stageId });
  let sub: Submission;
  if (existing) {
    const [updated] = await repo().update<Submission>("submissions", { id: existing.id }, {
      ...content,
      paste_chars: existing.paste_chars + pastedDelta,
      updated_at: at,
    });
    sub = normalizeSubmission(updated);
  } else {
    sub = normalizeSubmission(
      await repo().insert<Submission>("submissions", {
        ...content,
        student_id: studentId,
        stage_id: stageId,
        paste_chars: pastedDelta,
        late,
        // Supabase-ийн default-уудыг локал JSON хадгалалтад ч бичнэ —
        // байхгүй бол уншсан тоо (view_count) харьцуулж шинэчлэхэд таарахгүй
        teacher_score: null,
        published: false,
        view_count: 0,
        author_display: "short",
        submitted_at: at,
        updated_at: at,
      })
    );
  }
  const versions = await listVersions(sub.id);
  await repo().insert("submission_versions", {
    submission_id: sub.id,
    version_no: (versions[versions.length - 1]?.version_no ?? 0) + 1,
    title: sub.title,
    body: sub.body,
    images: sub.images,
    created_at: at,
  });
  await repo().remove("drafts", { student_id: studentId, stage_id: stageId });
  return { submission: sub, created: !existing };
}

export async function listExtensions(where: Partial<Extension> = {}) {
  return repo().select<Extension>("extensions", where);
}

export async function getExtension(studentId: string, stageId: string) {
  const [e] = await listExtensions({ student_id: studentId, stage_id: stageId });
  return e ?? null;
}

// ---- Хөндлөнгийн үнэлгээний хуваарилалт ----
// Сурагчдыг тухайн үе шатаар "холилдсон" дараалалд оруулж, хүн бүр дараагийн 2 (бүтээл оруулсан)
// ангийнхнаа үнэлнэ. Санамсаргүй мэт боловч тогтмол тул хадгалах шаардлагагүй.

const mixKey = (stageId: string, studentId: string) => createHash("sha256").update(stageId + studentId).digest("hex");

export function peerTargets(stage: Stage, reviewerId: string, students: Student[], submissions: Submission[]) {
  // Хоцорч нөхсөн ажлыг хуваарилалтад оруулахгүй — үнэлгээний хугацаа дундуур
  // шинэ ажил нэмэгдвэл бусдын хуваарь хөдөлнө
  const byStudent = new Map(submissions.filter((s) => s.stage_id === stage.id && !s.late).map((s) => [s.student_id, s]));
  const order = students.map((s) => s.id).sort((a, b) => (mixKey(stage.id, a) < mixKey(stage.id, b) ? -1 : 1));
  const start = order.indexOf(reviewerId);
  if (start < 0) return [];
  const out: Submission[] = [];
  for (let i = 1; i < order.length && out.length < PEERS_PER_STUDENT; i++) {
    const sub = byStudent.get(order[(start + i) % order.length]);
    if (sub) out.push(sub);
  }
  return out;
}

/**
 * Хөндлөнгийн үнэлгээ хийх боломжтой эсэх.
 * Хуулахаас сэргийлж: зөвхөн хугацаа дууссаны дараа (бүтээлүүд түгжигдсэн үед), 7 хоногийн дотор,
 * мөн тухайн сурагч хугацаа сунгалттай бөгөөд хараахан дуусаагүй бол ангийнхны ажлыг харуулахгүй.
 */
export function peerReviewOpen(stage: Stage, reviewerExtension: Extension | null, at = now()) {
  return at > stageEnd(stage) && at <= peerReviewEnd(stage) && windowState(stage, reviewerExtension?.until, at) === "closed";
}

export type Access = "teacher" | "self" | "peer" | null;

export async function accessTo(
  submission: Submission,
  stage: Stage,
  viewer: { teacher: boolean; student: Student | null }
): Promise<Access> {
  if (viewer.teacher) return "teacher";
  const me = viewer.student;
  if (!me) return null;
  if (submission.student_id === me.id) return "self";
  // Хөндлөнгийн үнэлгээ зөвхөн өөрийн анги дотор
  const owner = await getStudent(submission.student_id);
  if (!owner || owner.class_id !== me.class_id) return null;
  if (!peerReviewOpen(stage, await getExtension(me.id, stage.id))) return null;
  const students = await listStudents(me.class_id);
  const ids = new Set(students.map((x) => x.id));
  const subs = (await listSubmissions({ stage_id: stage.id })).filter((x) => ids.has(x.student_id));
  return peerTargets(stage, me.id, students, subs).some((s) => s.id === submission.id) ? "peer" : null;
}

/** Нийтэд харагдах эсэх: эцсийн бүтээл + багш зөвшөөрсөн + хугацаа дууссан */
export function isPublic(sub: Submission, stage: Stage | undefined, at = now()) {
  return !!stage?.final && sub.published && at > stageEnd(stage);
}

// ---- Оноо ----

export function studentTotals(student: Student, stages: Stage[], subs: Submission[]) {
  const stageScores = stages.map((st) => subs.find((s) => s.student_id === student.id && s.stage_id === st.id)?.teacher_score ?? null);
  const works = stageScores.reduce<number>((a, b) => a + (b ?? 0), 0);
  const attendance = student.attendance_score == null ? null : Number(student.attendance_score);
  const bonus = student.bonus_score == null ? 0 : Number(student.bonus_score);
  return { stageScores, works, attendance, bonus, total: works + (attendance ?? 0) + bonus };
}
