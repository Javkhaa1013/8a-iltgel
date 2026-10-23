import { currentStudent } from "@/lib/auth";
import { accessTo, findStage, getSubmission, listReviews, stagesForSubmission } from "@/lib/data";
import { fail, ok, readJson, str } from "@/lib/http";
import { repo } from "@/lib/repo";
import { cleanRatings } from "@/lib/rubric";
import { now, peerReviewEnd } from "@/lib/stages";

// Шалгуурын хуудсаар үнэлэх: сурагч өөрийн бүтээлийг (self) эсвэл хуваарилагдсан найзынхаа бүтээлийг (peer).
// Нэг хүн нэг бүтээлд нэг л үнэлгээтэй — дахин илгээвэл шинэчилнэ.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await currentStudent();
  if (!me) return fail("Эхлээд кодоороо нэвтэрнэ үү", 401);
  const { id } = await params;
  const sub = await getSubmission(id);
  if (!sub) return fail("Бүтээл олдсонгүй", 404);
  const stages = await stagesForSubmission(sub);
  const stage = findStage(stages, sub.stage_id);
  if (!stage) return fail("Үе шат олдсонгүй", 404);

  const role = await accessTo(sub, stage, { teacher: false, student: me });
  if (role !== "self" && role !== "peer") return fail("Энэ бүтээлийг үнэлэх эрхгүй", 403);
  // Өөрийн үнэлгээ ч хөндлөнгийн үнэлгээтэй ижил хугацаанд хаагдана
  if (role === "self" && now() > peerReviewEnd(stage)) return fail("Үнэлгээ өгөх хугацаа дууссан", 403);

  const body = await readJson(req);
  const ratings = cleanRatings(stage, body.ratings);
  if (!ratings) return fail("Шалгуур бүрийг 1-4-өөр үнэлнэ үү");
  const strength = str(body.strength, 1000).trim();
  const suggestion = str(body.suggestion, 1000).trim();
  if (strength.length < 5) return fail("Сайн талыг нь бичнэ үү");
  if (suggestion.length < 5) return fail("Сайжруулах зөвлөгөөгөө бичнэ үү");

  const at = now().toISOString();
  const [existing] = await listReviews({ submission_id: sub.id, reviewer_student_id: me.id, role });
  if (existing) {
    const [updated] = await repo().update("reviews", { id: existing.id }, { ratings, strength, suggestion, updated_at: at });
    return ok(updated);
  }
  const created = await repo().insert("reviews", {
    submission_id: sub.id,
    reviewer_student_id: me.id,
    role,
    ratings,
    strength,
    suggestion,
    updated_at: at,
  });
  return ok(created, 201);
}
