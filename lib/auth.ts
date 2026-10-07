import { createHash, createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { repo } from "./repo";
import type { Student } from "./types";

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

export function checkTeacherPassword(password: string) {
  const expected = process.env.TEACHER_PASSWORD;
  return !!expected && safeEqual(password, expected);
}
export const TEACHER_MAX_AGE = 7 * 24 * 60 * 60;
export const teacherToken = () => sign("teacher", TEACHER_MAX_AGE);

export async function isTeacher() {
  return verify((await cookies()).get(TEACHER_COOKIE)?.value) === "teacher";
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
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function generateCode() {
  return Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}
export const normalizeCode = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, "");
