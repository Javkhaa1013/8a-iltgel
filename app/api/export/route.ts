import { isTeacher } from "@/lib/auth";
import { getStages } from "@/lib/data";
import { fail } from "@/lib/http";
import { repo, type Table } from "@/lib/repo";
import { formatUB, now } from "@/lib/stages";

// Багш: бүх өгөгдлийг нэг JSON файлаар татна (улирлын эцсийн архив, нөөц).
// Зургууд Supabase Storage-д хадгалагддаг тул энд холбоосоор нь орно.
const TABLES: Table[] = ["students", "submissions", "submission_versions", "drafts", "comments", "reviews", "extensions"];

export async function GET() {
  if (!(await isTeacher())) return fail("Зөвхөн багш", 403);

  const data: Record<string, unknown> = { exported_at: now().toISOString(), stages: await getStages() };
  for (const t of TABLES) data[t] = await repo().select(t);

  const images = (data.submissions as { images?: string[] }[])
    .flatMap((s) => s.images ?? [])
    .concat((data.submission_versions as { images?: string[] }[]).flatMap((v) => v.images ?? []));
  data.image_urls = [...new Set(images)];

  const name = `8a-iltgel-${formatUB(now(), false).replace(/\./g, "-")}.json`;
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
