import { generateCode, isTeacher } from "@/lib/auth";
import { getStudent, listStudents } from "@/lib/data";
import { fail, ok, readJson, score, str } from "@/lib/http";
import { repo } from "@/lib/repo";
import { ATTENDANCE_MAX } from "@/lib/stages";

type Ctx = { params: Promise<{ id: string }> };

// Багш: нэр, ирц/идэвхийн оноо, нэмэлт оноо засах, код шинэчлэх
export async function PATCH(req: Request, { params }: Ctx) {
  if (!(await isTeacher())) return fail("Зөвхөн багш", 403);
  const { id } = await params;
  if (!(await getStudent(id))) return fail("Сурагч олдсонгүй", 404);

  const body = await readJson(req);
  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const name = str(body.name, 80).trim();
    if (!name) return fail("Нэр хоосон байна");
    patch.name = name;
  }
  const attendance = score(body.attendance_score, ATTENDANCE_MAX);
  if (body.attendance_score !== undefined) {
    if (attendance === undefined) return fail(`Ирцийн оноо 0-${ATTENDANCE_MAX} байна`);
    patch.attendance_score = attendance;
  }
  const bonus = score(body.bonus_score, 20);
  if (body.bonus_score !== undefined) {
    if (bonus === undefined) return fail("Нэмэлт оноо 0-20 байна");
    patch.bonus_score = bonus;
  }
  if (body.bonus_note !== undefined) patch.bonus_note = str(body.bonus_note, 500);
  if (body.reset_code === true) {
    const used = new Set((await listStudents()).map((s) => s.login_code));
    let code = generateCode();
    while (used.has(code)) code = generateCode();
    patch.login_code = code;
  }

  if (!Object.keys(patch).length) return fail("Өөрчлөх зүйл алга");
  const [updated] = await repo().update("students", { id }, patch);
  return ok(updated);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  if (!(await isTeacher())) return fail("Зөвхөн багш", 403);
  const { id } = await params;
  // Бүтээл, сэтгэгдэл, сунгалтыг хамт устгана (локал JSON-д cascade байхгүй тул гараар)
  const subs = await repo().select<{ id: string }>("submissions", { student_id: id });
  for (const s of subs) {
    await repo().remove("comments", { submission_id: s.id });
    await repo().remove("submission_versions", { submission_id: s.id });
    await repo().remove("reviews", { submission_id: s.id });
  }
  await repo().remove("reviews", { reviewer_student_id: id });
  await repo().remove("drafts", { student_id: id });
  await repo().remove("comments", { author_student_id: id });
  await repo().remove("extensions", { student_id: id });
  await repo().remove("submissions", { student_id: id });
  await repo().remove("students", { id });
  return ok();
}
