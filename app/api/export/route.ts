import { getStages, listClasses, listStudents } from "@/lib/data";
import { teacherGuard } from "@/lib/guard";
import { fail } from "@/lib/http";
import { repo, type Table } from "@/lib/repo";
import { formatUB, now } from "@/lib/stages";

// Багш: өгөгдлийг нэг JSON файлаар татна (улирлын эцсийн архив, нөөц).
// Админ бүх ангийг, ангийн багш зөвхөн өөрийн ангиа авна.
// Зургууд Supabase Storage-д хадгалагддаг тул энд холбоосоор нь орно.
const TABLES: Table[] = ["submissions", "submission_versions", "drafts", "comments", "reviews", "extensions"];

export async function GET() {
  const guard = await teacherGuard();
  if (!guard) return fail("Зөвхөн багш", 403);

  const all = await listClasses();
  const classes = guard.session.isAdmin ? all : all.filter((c) => c.id === guard.classId);
  const students = (await Promise.all(classes.map((c) => listStudents(c.id)))).flat();
  const mine = new Set(students.map((s) => s.id));

  const raw: Record<string, Record<string, unknown>[]> = {};
  for (const t of TABLES) raw[t] = await repo().select<Record<string, unknown>>(t);

  // Зөвхөн хамрах ангийн мөрүүдийг үлдээнэ
  const byStudent = (rows: Record<string, unknown>[]) => rows.filter((r) => mine.has(String(r.student_id)));
  const submissions = byStudent(raw.submissions);
  const subIds = new Set(submissions.map((s) => String(s.id)));
  const bySubmission = (rows: Record<string, unknown>[]) => rows.filter((r) => subIds.has(String(r.submission_id)));

  const data = {
    exported_at: now().toISOString(),
    classes,
    stages: Object.fromEntries(await Promise.all(classes.map(async (c) => [c.name, await getStages(c.id)] as const))),
    students,
    submissions,
    submission_versions: bySubmission(raw.submission_versions),
    comments: bySubmission(raw.comments),
    reviews: bySubmission(raw.reviews),
    drafts: byStudent(raw.drafts),
    extensions: byStudent(raw.extensions),
    image_urls: [
      ...new Set(
        [...submissions, ...bySubmission(raw.submission_versions)].flatMap((s) => (Array.isArray(s.images) ? (s.images as string[]) : []))
      ),
    ],
  };

  const name = `8a-iltgel-${formatUB(now(), false).replace(/\./g, "-")}.json`;
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
