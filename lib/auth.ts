import { createHash, createHmac, randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { listClasses, defaultClassId } from "./data";
import { repo } from "./repo";
import type { Student, Teacher } from "./types";

export const TEACHER_COOKIE = "teacher_session";
export const STUDENT_COOKIE = "student_session";
const SESSION_DAYS = 30;
export const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60;

function secret() {
  const s = process.env.SESSION_SECRET || process.env.TEACHER_PASSWORD;
  if (!s) throw new Error("SESSION_SECRET эсвэл TEACHER_PASSWORD тохируулаагүй байна");
  return createHash("sha256").update("iltgel:" + s).digest();
}

function safeEqual(a: string, b: string) {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}

function sign(payload: string, maxAge = SESSION_MAX_AGE) {
  const exp = Date.now() + maxAge * 1000;
  const body = `${payload}.${exp}`;
  return `${body}.${createHmac("sha256", secret()).update(body).digest("hex")}`;
}

function verify(token: string | undefined): string | null {
  if (!token || !(process.env.SESSION_SECRET || process.env.TEACHER_PASSWORD)) return null;
  const i = token.lastIndexOf(".");
  if (i < 0) return null;
  const body = token.slice(0, i);
  const sig = token.slice(i + 1);
  const j = body.lastIndexOf(".");
  if (j < 0) return null;
  const payload = body.slice(0, j);
  const exp = Number(body.slice(j + 1));
  if (!payload || !exp || exp < Date.now()) return null;
  return safeEqual(sig, createHmac("sha256", secret()).update(body).digest("hex")) ? payload : null;
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE,
};

// ---- Багш ----
// Админ: TEACHER_PASSWORD орчны хувьсагчаар нэвтэрнэ, бүх ангийг хардаг.
// Ангийн багш: teachers хүснэгтэд нууц үг нь scrypt-ээр хэшлэгдэж хадгалагдана.

export const TEACHER_MAX_AGE = 7 * 24 * 60 * 60;
export const CLASS_COOKIE = "active_class";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 32).toString("hex")}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = (stored ?? "").split(":");
  if (!salt || !hash) return false;
  const a = scryptSync(password, salt, 32);
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export type TeacherSession = { id: string | null; name: string; classId: string | null; isAdmin: boolean };

/** Нууц үгээр админ эсвэл ангийн багшийг олно */
export async function findTeacherByPassword(password: string): Promise<TeacherSession | null> {
  const admin = process.env.TEACHER_PASSWORD;
  if (admin && safeEqual(password, admin)) return { id: null, name: "Админ багш", classId: null, isAdmin: true };
  for (const t of await repo().select<Teacher>("teachers")) {
    if (verifyPassword(password, t.password_hash)) return { id: t.id, name: t.name, classId: t.class_id ?? null, isAdmin: false };
  }
  return null;
}

export const teacherToken = (session: TeacherSession) => sign(session.isAdmin ? "admin" : `teacher:${session.id}`, TEACHER_MAX_AGE);

/** Нэвтэрсэн багш (админ эсвэл ангийн багш) */
export async function currentTeacher(): Promise<TeacherSession | null> {
  const payload = verify((await cookies()).get(TEACHER_COOKIE)?.value);
  if (!payload) return null;
  if (payload === "admin") return { id: null, name: "Админ багш", classId: null, isAdmin: true };
  if (!payload.startsWith("teacher:")) return null;
  const [t] = await repo().select<Teacher>("teachers", { id: payload.slice(8) });
  return t ? { id: t.id, name: t.name, classId: t.class_id ?? null, isAdmin: false } : null;
}

export async function isTeacher() {
  return (await currentTeacher()) !== null;
}

/** Багшийн ажиллаж буй анги. Админ анги сольж болно (cookie-д хадгална). */
export async function activeClassId(session: TeacherSession): Promise<string> {
  if (!session.isAdmin && session.classId) return session.classId;
  const chosen = (await cookies()).get(CLASS_COOKIE)?.value;
  const classes = await listClasses();
  return classes.find((c) => c.id === chosen)?.id ?? (await defaultClassId());
}

/** Багш тухайн ангид хандах эрхтэй эсэх */
export function canAccessClass(session: TeacherSession, classId: string) {
  return session.isAdmin || session.classId === classId;
}

// ---- Сурагч ----

// Токен нэвтрэх кодын хэштэй холбогдсон тул багш код солиход хуучин сесс хүчингүй болно
const codeTag = (code: string) => createHash("sha256").update("code:" + code).digest("hex").slice(0, 12);
export const studentToken = (student: Pick<Student, "id" | "login_code">) =>
  sign(`student:${student.id}:${codeTag(student.login_code)}`);

export async function currentStudent(): Promise<Student | null> {
  const payload = verify((await cookies()).get(STUDENT_COOKIE)?.value);
  if (!payload?.startsWith("student:")) return null;
  const [, id, tag] = payload.split(":");
  const [student] = id ? await repo().select<Student>("students", { id }) : [];
  return student && tag === codeTag(student.login_code) ? student : null;
}

// Андуурагдах тэмдэгтгүй (0/O, 1/I/L) 6 оронтой код
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function generateCode() {
  return Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
}
export const normalizeCode = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, "");

// ---- Эцэг эхийн нууц холбоос ----
// Нэвтрэхгүйгээр зөвхөн тухайн хүүхдийн тайланг үзнэ. Холбоос нь таахын аргагүй.

export const reportToken = (studentId: string) =>
  createHmac("sha256", secret()).update("report:" + studentId).digest("hex").slice(0, 32);

export function verifyReportToken(studentId: string, token: string) {
  if (!token || token.length !== 32) return false;
  return safeEqual(token, reportToken(studentId));
}
