import { currentStudent, isTeacher } from "@/lib/auth";
import { accessTo, findStage, getSubmission, listVersions, stagesForSubmission } from "@/lib/data";
import { fail, ok, readJson, str } from "@/lib/http";
import { repo } from "@/lib/repo";

// Сэтгэгдэл нэмэх: текстийн хэсэг сонгосон (start/end) эсвэл ерөнхий
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [teacher, student, sub] = await Promise.all([isTeacher(), currentStudent(), getSubmission(id)]);
  if (!sub) return fail("Бүтээл олдсонгүй", 404);
  const stages = await stagesForSubmission(sub);
  const stage = findStage(stages, sub.stage_id);
  if (!stage) return fail("Үе шат олдсонгүй", 404);

  const role = await accessTo(sub, stage, { teacher, student });
  if (!role) return fail("Энэ бүтээлд сэтгэгдэл бичих эрхгүй", 403);

  const body = await readJson(req);
  const text = str(body.body, 2000).trim();
  const row: Record<string, unknown> = {
    submission_id: sub.id,
    author_role: role,
    author_student_id: role === "teacher" ? null : student!.id,
    body: text,
    quote: "",
    start_offset: null,
    end_offset: null,
    score: null,
    // Дараа нь текст засагдсан ч сэтгэгдэл аль хувилбар дээр бичигдсэнийг мэдэхийн тулд
    version_no: (await listVersions(sub.id)).at(-1)?.version_no ?? null,
  };

  if (body.start !== undefined || body.end !== undefined) {
    const start = Number(body.start);
    const end = Number(body.end);
    if (stage.kind !== "text" || !Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start || end > sub.body.length)
      return fail("Сонгосон хэсэг буруу байна");
    row.start_offset = start;
    row.end_offset = end;
    row.quote = sub.body.slice(start, end).slice(0, 500); // иш татсан текстийг сервер өөрөө авна
  }

  // Оноог сэтгэгдлээр биш — багш "Багшийн оноо", сурагчид шалгуурын хуудсаар (review) өгнө
  if (!text) return fail("Сэтгэгдлээ бичнэ үү");

  return ok(await repo().insert("comments", row), 201);
}
