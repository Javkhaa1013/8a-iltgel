import { str } from "./http";
import type { Stage } from "./stages";

// Сурагчийн оруулсан агуулгыг шалгана. Ноорог (draft) хоосон ч байж болно, илгээхэд заавал бөглөнө.

export const SAFE_IMAGE = /^(?:https:\/\/[a-z0-9.-]+\.supabase\.co\/storage\/v1\/object\/public\/uploads\/[\w\-./]+|\/uploads\/[\w\-.]+)$/i;
export const MAX_IMAGES = 10;
export const MAX_BODY = 30_000;

type Result = { ok: true; content: { title?: string; body?: string; images?: string[] } } | { ok: false; error: string };

export function readContent(stage: Stage, body: Record<string, unknown>, mode: "submit" | "draft"): Result {
  if (stage.kind === "image") {
    const images = Array.isArray(body.images) ? body.images.filter((u): u is string => typeof u === "string" && SAFE_IMAGE.test(u)) : [];
    if (mode === "submit" && !images.length) return { ok: false, error: "Ноорогийнхоо зургийг оруулна уу" };
    if (images.length > MAX_IMAGES) return { ok: false, error: `Хамгийн ихдээ ${MAX_IMAGES} зураг` };
    return { ok: true, content: { images } };
  }
  const title = str(body.title, 150).trim();
  const text = str(body.body, MAX_BODY).replace(/\r\n?/g, "\n");
  if (mode === "submit") {
    if (!title) return { ok: false, error: "Гарчгаа бичнэ үү" };
    if (text.trim().length < 20) return { ok: false, error: "Текст хэт богино байна" };
  }
  return { ok: true, content: { title, body: text } };
}
