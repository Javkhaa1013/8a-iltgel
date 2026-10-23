import { getStages, listDrafts, listSubmissions, saveStages } from "@/lib/data";
import { teacherGuard } from "@/lib/guard";
import { fail, ok, readJson } from "@/lib/http";
import { parseStages } from "@/lib/stages";

// Багш: хуваарийг бүрэн удирдана (шат нэмэх, нэр/төрөл/огноо/цаг/оноо/дараалал).
// Бүтээл эсвэл ноорог бүхий шатыг устгахыг зөвшөөрөхгүй — хүүхдийн ажил алдагдахаас сэргийлнэ.
export async function PUT(req: Request) {
  const guard = await teacherGuard();
  if (!guard) return fail("Зөвхөн багш", 403);

  const { stages } = await readJson(req);
  const parsed = parseStages(stages);
  if (!parsed.ok) return fail(parsed.error);

  const keep = new Set(parsed.stages.map((s) => s.id));
  const removed = (await getStages(guard.classId)).filter((s) => !keep.has(s.id));
  for (const s of removed) {
    const [subs, drafts] = await Promise.all([listSubmissions({ stage_id: s.id }), listDrafts({ stage_id: s.id })]);
    if (subs.length || drafts.length)
      return fail(`"${s.label}" шатад ${subs.length} бүтээл, ${drafts.length} ноорог байгаа тул устгах боломжгүй. Эхлээд тэдгээрийг устгана уу.`);
  }

  await saveStages(guard.classId, parsed.stages);
  return ok(parsed.stages);
}
