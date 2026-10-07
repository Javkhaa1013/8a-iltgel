import { currentStudent, isTeacher } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { repo } from "@/lib/repo";
import type { Comment } from "@/lib/types";

// Сэтгэгдэл устгах: бичсэн хүн өөрөө эсвэл багш
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [c] = await repo().select<Comment>("comments", { id });
  if (!c) return fail("Олдсонгүй", 404);
  const [teacher, student] = await Promise.all([isTeacher(), currentStudent()]);
  const mine = c.author_role === "teacher" ? teacher : !!student && c.author_student_id === student.id;
  if (!teacher && !mine) return fail("Устгах эрхгүй", 403);
  await repo().remove("comments", { id });
  return ok();
}
