import { generateCode, isTeacher } from "@/lib/auth";
import { listStudents } from "@/lib/data";
import { fail, ok, readJson } from "@/lib/http";
import { repo } from "@/lib/repo";

// Багш: ангийн нэрсийг (мөр бүрт нэг нэр) бөөнөөр нэмнэ. Хүүхэд бүрт давхцахгүй код үүснэ.
export async function POST(req: Request) {
  if (!(await isTeacher())) return fail("Зөвхөн багш", 403);
  const { names } = await readJson(req);
  const list = String(names ?? "")
    .split("\n")
    .map((n) => n.replace(/^\s*\d+[.)]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 100);
  if (!list.length) return fail("Нэр оруулна уу");
  if (list.some((n) => n.length > 80)) return fail("Нэр хэт урт байна");

  const used = new Set((await listStudents()).map((s) => s.login_code));
  const rows = list.map((name) => {
    let code = generateCode();
    while (used.has(code)) code = generateCode();
    used.add(code);
    return { name, login_code: code, attendance_score: null, bonus_score: null, bonus_note: "" };
  });
  await repo().insertMany("students", rows); // нэг хүсэлтээр: дунд нь алдаа гарвал хагас бичигдэхгүй
  return ok(await listStudents(), 201);
}
