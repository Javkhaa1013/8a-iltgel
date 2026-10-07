import { isTeacher } from "@/lib/auth";
import { saveStages } from "@/lib/data";
import { fail, ok, readJson } from "@/lib/http";
import { sanitizeStages } from "@/lib/stages";

// Багш: хуваарийн огноо, дээд оноог өөрчилнө
export async function PUT(req: Request) {
  if (!(await isTeacher())) return fail("Зөвхөн багш", 403);
  const { stages } = await readJson(req);
  const clean = sanitizeStages(stages);
  if (!clean) return fail("Огноо буруу байна (эхлэх өдөр дуусах өдрөөс өмнө байх ёстой)");
  await saveStages(clean);
  return ok(clean);
}
