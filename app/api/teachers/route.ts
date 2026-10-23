import { currentTeacher, hashPassword } from "@/lib/auth";
import { getClass } from "@/lib/data";
import { fail, ok, readJson, str } from "@/lib/http";
import { repo } from "@/lib/repo";
import type { Teacher } from "@/lib/types";

// Админ: ангийн багш нарыг удирдана. Багш бүр өөрийн нууц үгээр нэвтэрч, зөвхөн ангиа хардаг.
// Нууц үг нь scrypt хэш хэлбэрээр хадгалагдах тул буцааж харах боломжгүй — зөвхөн шинээр тавина.

const publicFields = (t: Teacher) => ({ id: t.id, name: t.name, class_id: t.class_id, created_at: t.created_at });

export async function GET() {
  const t = await currentTeacher();
  if (!t?.isAdmin) return fail("Зөвхөн админ багш", 403);
  return ok((await repo().select<Teacher>("teachers")).map(publicFields));
}

export async function POST(req: Request) {
  const admin = await currentTeacher();
  if (!admin?.isAdmin) return fail("Зөвхөн админ багш", 403);
  const body = await readJson(req);
  const name = str(body.name, 60).trim();
  const password = String(body.password ?? "");
  const classId = String(body.class_id ?? "");
  if (!name) return fail("Багшийн нэрийг бичнэ үү");
  if (password.length < 8) return fail("Нууц үг 8-аас дээш тэмдэгт байх ёстой");
  if (password === process.env.TEACHER_PASSWORD) return fail("Админы нууц үгтэй ижил байж болохгүй");
  if (!(await getClass(classId))) return fail("Анги олдсонгүй", 404);

  const created = await repo().insert<Teacher>("teachers", { name, class_id: classId, password_hash: hashPassword(password) });
  return ok(publicFields(created), 201);
}

export async function PATCH(req: Request) {
  const admin = await currentTeacher();
  if (!admin?.isAdmin) return fail("Зөвхөн админ багш", 403);
  const body = await readJson(req);
  const id = String(body.id ?? "");
  const [t] = await repo().select<Teacher>("teachers", { id });
  if (!t) return fail("Багш олдсонгүй", 404);
  const password = String(body.password ?? "");
  if (password.length < 8) return fail("Нууц үг 8-аас дээш тэмдэгт байх ёстой");
  if (password === process.env.TEACHER_PASSWORD) return fail("Админы нууц үгтэй ижил байж болохгүй");
  const [updated] = await repo().update<Teacher>("teachers", { id }, { password_hash: hashPassword(password) });
  return ok(publicFields(updated));
}

export async function DELETE(req: Request) {
  const admin = await currentTeacher();
  if (!admin?.isAdmin) return fail("Зөвхөн админ багш", 403);
  await repo().remove("teachers", { id: String((await readJson(req)).id ?? "") });
  return ok();
}
