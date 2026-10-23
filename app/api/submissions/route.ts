import { currentStudent } from "@/lib/auth";
import { readContent } from "@/lib/content";
import { findStage, getExtension, getStages, saveSubmission } from "@/lib/data";
import { fail, ok, readJson } from "@/lib/http";
import { formatUB, rangeLabel, stageEnd, windowState } from "@/lib/stages";

// Сурагч бүтээлээ илгээнэ / дахин илгээнэ (илгээх бүр хувилбар болж хадгалагдана).
// Хугацааг СЕРВЕР дээр шалгана.
export async function POST(req: Request) {
  const me = await currentStudent();
  if (!me) return fail("Эхлээд кодоороо нэвтэрнэ үү", 401);

  const body = await readJson(req);
  const stage = findStage(await getStages(me.class_id), String(body.stage_id));
  if (!stage) return fail("Үе шат олдсонгүй", 404);

  const ext = await getExtension(me.id, stage.id);
  const state = windowState(stage, ext?.until);
  if (state === "upcoming") return fail(`Энэ даалгавар ${rangeLabel(stage)}-нд нээгдэнэ`, 403);
  if (state === "closed") {
    return fail(`Хугацаа дууссан (${formatUB(ext ? new Date(ext.until) : stageEnd(stage))}). Оруулах боломжгүй`, 403);
  }

  const parsed = readContent(stage, body, "submit");
  if (!parsed.ok) return fail(parsed.error);

  const pasted = Math.min(100_000, Math.max(0, Math.floor(Number(body.paste_delta) || 0)));
  const { submission, created } = await saveSubmission(me.id, stage.id, parsed.content, pasted);
  return ok(submission, created ? 201 : 200);
}
