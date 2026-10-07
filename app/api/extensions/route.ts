import { isTeacher } from "@/lib/auth";
import { findStage, getExtension, getStages, getStudent } from "@/lib/data";
import { fail, ok, readJson } from "@/lib/http";
import { repo } from "@/lib/repo";

// Багш: тодорхой сурагчид тухайн үе шатын хугацааг сунгах (өвчтэй г.м.) эсвэл сунгалтыг цуцлах
export async function POST(req: Request) {
  if (!(await isTeacher())) return fail("Зөвхөн багш", 403);
  const body = await readJson(req);
  const studentId = String(body.student_id);
  const stage = findStage(await getStages(), String(body.stage_id));
  if (!stage || !(await getStudent(studentId))) return fail("Олдсонгүй", 404);

  const existing = await getExtension(studentId, stage.id);
  if (body.until === null) {
    if (existing) await repo().remove("extensions", { id: existing.id });
    return ok({ removed: true });
  }
  const until = new Date(String(body.until));
  if (Number.isNaN(until.getTime())) return fail("Огноо буруу");

  if (existing) return ok((await repo().update("extensions", { id: existing.id }, { until: until.toISOString() }))[0]);
  return ok(await repo().insert("extensions", { student_id: studentId, stage_id: stage.id, until: until.toISOString() }), 201);
}
