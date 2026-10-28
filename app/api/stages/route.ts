import { getStages, listDrafts, listSubmissions, saveStages } from "@/lib/data";
import { teacherGuard } from "@/lib/guard";
import { fail, ok, readJson } from "@/lib/http";
import { now, parseStages, stageEnd } from "@/lib/stages";

// Багш: хуваарийг бүрэн удирдана (шат нэмэх, нэр/төрөл/огноо/цаг/оноо/дараалал).
// Бүтээл эсвэл ноорог бүхий шатыг устгахыг зөвшөөрөхгүй — хүүхдийн ажил алдагдахаас сэргийлнэ.
export async function PUT(req: Request) {
  const guard = await teacherGuard();
  if (!guard) return fail("Зөвхөн багш", 403);

  const { stages } = await readJson(req);
  const parsed = parseStages(stages);
  if (!parsed.ok) return fail(parsed.error);

  // Багш "анхны хугацаа"-г цуцлахыг хүсвэл lateAfter: null гэж илгээнэ
  const cleared = new Set(
    (Array.isArray(stages) ? stages : [])
      .filter((s): s is Record<string, unknown> => !!s && typeof s === "object" && (s as Record<string, unknown>).lateAfter === null)
      .map((s) => String(s.id))
  );

  const current = await getStages(guard.classId);
  const at = now();
  // Хугацаа нь дуусчихсан шатыг хойшлуулахад анхны хугацааг тогтоож авна —
  // тэгэхгүй бол хоцорч оруулсан хүүхэд "хугацаандаа" гэж бүртгэгдэнэ
  for (const s of parsed.stages) {
    const old = current.find((x) => x.id === s.id);
    if (!old) continue;
    if (cleared.has(s.id)) {
      delete s.lateAfter;
      continue;
    }
    const oldEnd = stageEnd(old);
    if (!s.lateAfter && oldEnd < at && stageEnd(s) > oldEnd) s.lateAfter = (old.lateAfter ? new Date(old.lateAfter) : oldEnd).toISOString();
    else if (!s.lateAfter && old.lateAfter) s.lateAfter = old.lateAfter;
  }

  const keep = new Set(parsed.stages.map((s) => s.id));
  const removed = current.filter((s) => !keep.has(s.id));
  for (const s of removed) {
    const [subs, drafts] = await Promise.all([listSubmissions({ stage_id: s.id }), listDrafts({ stage_id: s.id })]);
    if (subs.length || drafts.length)
      return fail(`"${s.label}" шатад ${subs.length} бүтээл, ${drafts.length} ноорог байгаа тул устгах боломжгүй. Эхлээд тэдгээрийг устгана уу.`);
  }

  await saveStages(guard.classId, parsed.stages);
  return ok(parsed.stages);
}
