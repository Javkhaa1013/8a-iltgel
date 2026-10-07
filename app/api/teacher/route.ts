import { checkTeacherPassword, cookieOptions, isTeacher, TEACHER_COOKIE, TEACHER_MAX_AGE, teacherToken } from "@/lib/auth";
import { fail, ok, readJson } from "@/lib/http";
import { clearHits, clientIp, hit, hitCount } from "@/lib/rateLimit";

// GET: багш нэвтэрсэн эсэх, POST: нэвтрэх, DELETE: гарах

export async function GET() {
  return ok({ teacher: await isTeacher() });
}

export async function POST(req: Request) {
  if (!process.env.TEACHER_PASSWORD) return fail("Сервер дээр TEACHER_PASSWORD тохируулаагүй байна", 500);
  const ipKey = `teacher:${clientIp(req)}`;
  const [mine, all] = await Promise.all([hitCount(ipKey), hitCount("teacher:all")]);
  if (mine >= 8 || (all >= 50 && mine >= 2)) return fail("Олон удаа буруу оруулсан. 10 минутын дараа оролдоно уу", 429);

  const { password } = await readJson(req);
  if (typeof password !== "string" || !checkTeacherPassword(password)) {
    await Promise.all([hit(ipKey), hit("teacher:all")]);
    return fail("Нууц үг буруу байна", 403);
  }
  await clearHits(ipKey);
  const res = ok({ teacher: true });
  res.cookies.set(TEACHER_COOKIE, teacherToken(), { ...cookieOptions, maxAge: TEACHER_MAX_AGE });
  return res;
}

export async function DELETE() {
  const res = ok({ teacher: false });
  res.cookies.delete(TEACHER_COOKIE);
  return res;
}
