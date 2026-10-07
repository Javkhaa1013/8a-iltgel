import { listStudents } from "@/lib/data";
import { fail, ok } from "@/lib/http";
import { purgeExpired } from "@/lib/rateLimit";

// Supabase-ийн үнэгүй төсөл 7 хоног идэвхгүй бол түр зогсдог.
// Vercel Cron өдөр бүр энд хүсэлт илгээж, мэдээллийн санг "сэрүүн" байлгана (vercel.json).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return fail("Зөвшөөрөлгүй", 401);
  const students = await listStudents();
  const purged = await purgeExpired(); // хуучирсан оролдлогын тоолуурууд
  return ok({ ok: true, students: students.length, purged, at: new Date().toISOString() });
}
