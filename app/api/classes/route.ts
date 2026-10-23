import { CLASS_COOKIE, cookieOptions, currentTeacher } from "@/lib/auth";
import { getClass, listClasses, listStudents } from "@/lib/data";
import { fail, ok, readJson, str } from "@/lib/http";
import { repo } from "@/lib/repo";

// Анги: админ нэмэх/нэр солих/устгах, мөн ажиллах ангиа сонгох

export async function GET() {
  if (!(await currentTeacher())) return fail("Зөвхөн багш", 403);
  return ok(await listClasses());
}

export async function POST(req: Request) {
  const t = await currentTeacher();
  if (!t?.isAdmin) return fail("Зөвхөн админ багш анги нэмнэ", 403);
  const name = str((await readJson(req)).name, 40).trim();
  if (!name) return fail("Ангийн нэрийг бичнэ үү");
  if ((await listClasses()).some((c) => c.name.toLowerCase() === name.toLowerCase())) return fail("Ийм нэртэй анги аль хэдийн бий");
  return ok(await repo().insert("classes", { name }), 201);
}

export async function PATCH(req: Request) {
  const t = await currentTeacher();
  const body = await readJson(req);
  const id = String(body.id ?? "");
  const cls = await getClass(id);
  if (!cls) return fail("Анги олдсонгүй", 404);

  // Ажиллах ангиа сонгох (зөвхөн админ олон ангитай)
  if (body.activate === true) {
    if (!t?.isAdmin) return fail("Зөвхөн админ багш анги солино", 403);
    const res = ok(cls);
    res.cookies.set(CLASS_COOKIE, id, cookieOptions);
    return res;
  }

  if (!t?.isAdmin) return fail("Зөвхөн админ багш", 403);
  const name = str(body.name, 40).trim();
  if (!name) return fail("Ангийн нэрийг бичнэ үү");
  const [updated] = await repo().update("classes", { id }, { name });
  return ok(updated);
}

export async function DELETE(req: Request) {
  const t = await currentTeacher();
  if (!t?.isAdmin) return fail("Зөвхөн админ багш", 403);
  const id = String((await readJson(req)).id ?? "");
  if (!(await getClass(id))) return fail("Анги олдсонгүй", 404);
  if ((await listClasses()).length < 2) return fail("Сүүлчийн ангийг устгах боломжгүй");
  const students = await listStudents(id);
  if (students.length) return fail(`Энэ ангид ${students.length} сурагч байна. Эхлээд сурагчдыг нь устгана уу.`);
  await repo().remove("teachers", { class_id: id });
  await repo().remove("settings", { key: `stages:${id}` });
  await repo().remove("classes", { id });
  return ok();
}
