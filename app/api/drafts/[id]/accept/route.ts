import { readContent } from "@/lib/content";
import { findStage, getStages, listDrafts, saveSubmission } from "@/lib/data";
import { canTouchStudent, teacherGuard } from "@/lib/guard";
import { fail, ok } from "@/lib/http";

// Багш: илгээхээ мартсан хүүхдийн ноорогийг илгээсэнд тооцно (хугацаанд хадгалагдсан ноорог л байдаг)
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await teacherGuard();
  if (!guard) return fail("Зөвхөн багш", 403);
  const { id } = await params;
  const [draft] = await listDrafts({ id });
  if (!draft) return fail("Ноорог олдсонгүй", 404);
  const owner = await canTouchStudent(guard.session, draft.student_id);
  if (!owner) return fail("Энэ ноорог өөр ангийнх", 403);
  const stage = findStage(await getStages(owner.class_id), draft.stage_id);
  if (!stage) return fail("Үе шат олдсонгүй", 404);

  const parsed = readContent(stage, { ...draft }, "submit");
  if (!parsed.ok) return fail(`Ноорог дутуу байна: ${parsed.error}`);
  const { submission } = await saveSubmission(draft.student_id, stage.id, parsed.content);
  return ok(submission);
}
