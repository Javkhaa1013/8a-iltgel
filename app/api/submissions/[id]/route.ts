import { isTeacher } from "@/lib/auth";
import { findStage, getStages, getSubmission } from "@/lib/data";
import { fail, ok, readJson, score } from "@/lib/http";
import { isAuthorDisplay } from "@/lib/names";
import { repo } from "@/lib/repo";
import { now, stageEnd } from "@/lib/stages";

// Багш: оноо өгөх, эцсийн бүтээлийг нийтлэх/нуух
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isTeacher())) return fail("Зөвхөн багш", 403);
  const { id } = await params;
  const sub = await getSubmission(id);
  if (!sub) return fail("Бүтээл олдсонгүй", 404);
  const stage = findStage(await getStages(), sub.stage_id);
  if (!stage) return fail("Үе шат олдсонгүй", 404);

  const body = await readJson(req);
  const patch: Record<string, unknown> = {};
  if (body.teacher_score !== undefined) {
    const s = score(body.teacher_score, stage.max);
    if (s === undefined) return fail(`Оноо 0-${stage.max} байна`);
    patch.teacher_score = s;
  }
  if (body.published !== undefined) {
    if (!stage.final) return fail("Зөвхөн эцсийн бүтээлийг нийтэлнэ");
    // Хугацаа дуусахаас өмнө нийтэлбэл бусад хүүхэд харж хуулах эрсдэлтэй
    if (body.published && now() <= stageEnd(stage)) return fail("Хугацаа дууссаны дараа нийтлэх боломжтой");
    patch.published = body.published === true;
  }
  if (body.author_display !== undefined) {
    if (!isAuthorDisplay(body.author_display)) return fail("Нэрийн хэлбэр буруу");
    patch.author_display = body.author_display;
  }
  const [updated] = await repo().update("submissions", { id }, patch);
  return ok(updated);
}
