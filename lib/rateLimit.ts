import { repo } from "./repo";

// Оролдлогын тоолуурыг мэдээллийн санд хадгална.
// Vercel олон сервер зэрэг ажиллуулдаг тул санах ойд тоолбол сервер бүр тусдаа тоолж, хязгаарлалт ажиллахгүй.
// Бодит цаг ашиглана (туршилтын DEV_NOW биш).

type Row = { key: string; count: number; reset_at: string };

async function getRow(key: string) {
  const [r] = await repo().select<Row>("rate_limits", { key });
  return r && new Date(r.reset_at).getTime() > Date.now() ? { ...r, count: Number(r.count) } : null;
}

/** Одоогийн цонхонд хэдэн оролдлого тоологдсон */
export async function hitCount(key: string) {
  return (await getRow(key))?.count ?? 0;
}

/** Хязгаарт хүрсэн эсэх */
export async function isLimited(key: string, max: number) {
  return (await hitCount(key)) >= max;
}

/** Нэг оролдлого тоолно. Шинэ хугацааны цонх бол тоолуурыг 1-ээс эхлүүлнэ. */
export async function hit(key: string, windowMs = 10 * 60 * 1000, attempt = 0): Promise<void> {
  const [raw] = await repo().select<Row>("rate_limits", { key });
  const active = raw && new Date(raw.reset_at).getTime() > Date.now();
  if (active) {
    // Зөвхөн уншсан утга өөрчлөгдөөгүй бол нэмнэ (optimistic lock); зэрэг ирсэн хүсэлттэй мөргөлдвөл дахин оролдоно
    const done = await repo().update("rate_limits", { key, count: Number(raw.count) }, { count: Number(raw.count) + 1 });
    if (!done.length && attempt < 5) return hit(key, windowMs, attempt + 1);
    return;
  }
  const fresh = { key, count: 1, reset_at: new Date(Date.now() + windowMs).toISOString() };
  if (raw) await repo().update("rate_limits", { key }, fresh);
  else await repo().insert("rate_limits", fresh).catch(() => repo().update("rate_limits", { key }, fresh)); // зэрэг ирсэн хүсэлт
}

export async function clearHits(key: string) {
  await repo().remove("rate_limits", { key });
}

/** Хугацаа нь дууссан мөрүүдийг устгана (өдөр бүрийн cron-оос) */
export async function purgeExpired() {
  const rows = await repo().select<Row>("rate_limits");
  const expired = rows.filter((r) => new Date(r.reset_at).getTime() < Date.now());
  for (const r of expired) await repo().remove("rate_limits", { key: r.key });
  return expired.length;
}

export function clientIp(req: Request) {
  return req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
}
