import { currentStudent } from "@/lib/auth";
import { readContent } from "@/lib/content";
import { findStage, getExtension, getStages, listSubmissions, saveSubmission } from "@/lib/data";
import { fail, ok, readJson } from "@/lib/http";
import { catchupOpen, countsLate, formatUB, now, rangeLabel, stageEnd, windowState } from "@/lib/stages";

// Сурагч бүтээлээ илгээнэ / дахин илгээнэ (илгээх бүр хувилбар болж хадгалагдана).
// Хугацааг СЕРВЕР дээр шалгана.
export async function POST(req: Request) {
  const me = await currentStudent();
  if (!me) return fail("Эхлээд кодоороо нэвтэрнэ үү", 401);

  const body = await readJson(req);
  const stage = findStage(await getStages(me.class_id), String(body.stage_id));
  if (!stage) return fail("Үе шат олдсонгүй", 404);

  const [ext, [existing]] = await Promise.all([
    getExtension(me.id, stage.id),
    listSubmissions({ student_id: me.id, stage_id: stage.id }),
  ]);
  const state = windowState(stage, ext?.until);
  if (state === "upcoming") return fail(`Энэ даалгавар ${rangeLabel(stage)}-нд нээгдэнэ`, 403);
  // Хугацаа дууссан: багш нөхөлт нээсэн бол зөвхөн илгээгээгүй сурагч нөхөж оруулна.
  // Багш хугацааг хойшлуулсан бол анхны хугацаанаас хойш орсон нь мөн хоцорсонд тооцогдоно.
  const catchupLate = catchupOpen(stage, state, existing);
  // Багшийн сунгалт дотор илгээж байгаа бол хоцорсонд тооцохгүй
  const withinExtension = !!ext && new Date(ext.until) >= now();
  const late = catchupLate || (countsLate(stage) && !withinExtension);
  if (state === "closed" && !catchupLate) {
    const when = formatUB(ext ? new Date(ext.until) : stageEnd(stage));
    return fail(
      existing && stage.catchup
        ? `Хугацаа дууссан (${when}). Та хугацаандаа илгээсэн тул өөрчлөх боломжгүй`
        : `Хугацаа дууссан (${when}). Оруулах боломжгүй`,
      403
    );
  }

  const parsed = readContent(stage, body, "submit");
  if (!parsed.ok) return fail(parsed.error);

  const pasted = Math.min(100_000, Math.max(0, Math.floor(Number(body.paste_delta) || 0)));
  const { submission, created } = await saveSubmission(me.id, stage.id, parsed.content, pasted, late);
  return ok(submission, created ? 201 : 200);
}
