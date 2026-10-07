import { cookieOptions, normalizeCode, STUDENT_COOKIE, studentToken } from "@/lib/auth";
import { fail, ok, readJson } from "@/lib/http";
import { clientIp, hit, hitCount } from "@/lib/rateLimit";
import { repo } from "@/lib/repo";
import type { Student } from "@/lib/types";

// POST: сурагч кодоороо нэвтрэх, DELETE: гарах

// Анги бүхэлдээ сургуулийн нэг Wi-Fi (нэг IP)-аас орох тул IP-ийн хязгаарыг хэт бага тавихгүй.
// 6 оронтой код ~887 сая хувилбартай тул 10 минутад 100 оролдлого таахад хангалтгүй.
const PER_IP = 40; // нэг IP-ээс 10 минутад буруу оролдлого
const GLOBAL = 100; // бүх IP-ээс нийлээд (олон төхөөрөмжөөр таах оролдлогоос сэргийлнэ)

export async function POST(req: Request) {
  const ipKey = `code:${clientIp(req)}`;
  const [mine, all] = await Promise.all([hitCount(ipKey), hitCount("code:all")]);
  // Нийт хязгаарт хүрсэн үед зөвхөн өөрөө буруу оролдсон төхөөрөмжийг хаана —
  // нэг хүн олон буруу код оруулаад бүх ангийг түгжихгүйн тулд
  if (mine >= PER_IP || (all >= GLOBAL && mine >= 3)) return fail("Олон удаа буруу оруулсан. 10 минутын дараа оролдоно уу", 429);

  const { code } = await readJson(req);
  const normalized = typeof code === "string" ? normalizeCode(code) : "";
  const [student] = normalized.length === 6 ? await repo().select<Student>("students", { login_code: normalized }) : [];
  if (!student) {
    // Зөв код оруулсан ч тоолуур тэглэхгүй — нэг зөв кодтой хүн дахин дахин таахаас сэргийлнэ
    await Promise.all([hit(ipKey), hit("code:all")]);
    return fail("Код буруу байна. Багшаасаа кодоо асуугаарай", 403);
  }
  const res = ok({ name: student.name });
  res.cookies.set(STUDENT_COOKIE, studentToken(student), cookieOptions);
  return res;
}

export async function DELETE() {
  const res = ok();
  res.cookies.delete(STUDENT_COOKIE);
  return res;
}
