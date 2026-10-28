import { currentStudent } from "@/lib/auth";
import { readContent } from "@/lib/content";
import { findStage, getDraft, getExtension, getStages, listSubmissions } from "@/lib/data";
import { fail, ok, readJson } from "@/lib/http";
import { repo } from "@/lib/repo";
import { catchupOpen, now, windowState } from "@/lib/stages";

// Бичих явцад автоматаар хадгалах ноорог. Илгээсэнд тооцогдохгүй.
// Хугацаа дууссаны дараа ноорог ч хадгалахгүй (хугацаанаас хойш бичсэнийг баримт болгохгүйн тулд).
export async function PUT(req: Request) {
  const me = await currentStudent();
  if (!me) return fail("Эхлээд кодоороо нэвтэрнэ үү", 401);

  const body = await readJson(req);
  const stage = findStage(await getStages(me.class_id), String(body.stage_id));
  if (!stage) return fail("Үе шат олдсонгүй", 404);
  const [ext, [sent]] = await Promise.all([
    getExtension(me.id, stage.id),
    listSubmissions({ student_id: me.id, stage_id: stage.id }),
  ]);
  const state = windowState(stage, ext?.until);
  // Нөхөлт нээлттэй үед ч ноорог хадгалагдана (хоцорсон сурагч бичиж байхдаа ажлаа алдахгүйн тулд)
  if (state !== "open" && !catchupOpen(stage, state, sent)) return fail("Хугацаа нээлттэй биш байна", 403);

  const parsed = readContent(stage, body, "draft");
  if (!parsed.ok) return fail(parsed.error);

  const at = now().toISOString();
  const existing = await getDraft(me.id, stage.id);
  if (existing) await repo().update("drafts", { id: existing.id }, { ...parsed.content, updated_at: at });
  else await repo().insert("drafts", { ...parsed.content, student_id: me.id, stage_id: stage.id, updated_at: at });
  return ok({ saved_at: at });
}
