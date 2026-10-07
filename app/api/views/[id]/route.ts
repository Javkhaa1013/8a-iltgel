import { cookies } from "next/headers";
import { findStage, getStages, getSubmission, isPublic } from "@/lib/data";
import { fail, ok } from "@/lib/http";
import { repo } from "@/lib/repo";

// Нийтлэгдсэн нийтлэлийн уншсан тоо ("бүтээл олон хүнд хүрсэн" — нэмэлт оноонд харгалзана).
// Нэг браузераас нэг л удаа тоолно.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sub = await getSubmission(id);
  if (!sub || !isPublic(sub, findStage(await getStages(), sub.stage_id))) return fail("Олдсонгүй", 404);

  const jar = await cookies();
  const seen = (jar.get("seen")?.value ?? "").split(",").filter(Boolean);
  if (seen.includes(id)) return ok({ views: sub.view_count });

  // view_count өөрчлөгдөөгүй бол л нэмнэ — зэрэг уншихад тоо алдагдахгүй
  let current = sub.view_count;
  let views = current;
  for (let i = 0; i < 5; i++) {
    const [updated] = await repo().update<{ view_count: number }>("submissions", { id, view_count: current }, { view_count: current + 1 });
    if (updated) {
      views = updated.view_count;
      break;
    }
    current = (await getSubmission(id))?.view_count ?? current;
    views = current;
  }
  const res = ok({ views });
  res.cookies.set("seen", [...seen, id].slice(-200).join(","), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 365 * 86400 });
  return res;
}
