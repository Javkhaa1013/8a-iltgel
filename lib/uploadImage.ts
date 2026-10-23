"use client";

/**
 * Утаснаас авсан том зургийг браузер дээр нь жижигрүүлж (WebP) серверт илгээнэ.
 * Ингэснээр Supabase-ийн үнэгүй зай хурдан дүүрэхгүй, слайд хурдан ачаална.
 */
/** Нэг зургийн зорилтот хэмжээ. Гар бичмэл уншигдахад хангалттай, зай 3 дахин хэмнэнэ. */
const TARGET_BYTES = 300 * 1024;

export async function uploadImage(file: File, maxSide = 1600): Promise<string> {
  // iPhone-ийн HEIC зураг зарим браузерт төрөлгүй (type="") ирдэг
  const heic = /\.(heic|heif)$/i.test(file.name) || /image\/hei[cf]/.test(file.type);
  if (!file.type.startsWith("image/") && !heic) throw new Error("Зөвхөн зураг оруулна");

  let blob: Blob = file;
  // GIF-ийг хөдөлгөөнтэй нь үлдээнэ
  if (file.type !== "image/gif") {
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const encode = (type: string, q: number) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, q));

      // Хуучин Safari WebP үүсгэж чаддаггүй (PNG буцаадаг) — тэр үед JPEG болгоно
      let out = await encode("image/webp", 0.72);
      const type = out?.type === "image/webp" ? "image/webp" : "image/jpeg";
      if (type === "image/jpeg") out = await encode(type, 0.72);
      // Том хэвээр бол чанарыг аажмаар бууруулна (гар бичмэл 0.45-д ч уншигдана)
      for (const q of [0.6, 0.5, 0.45]) {
        if (!out || out.size <= TARGET_BYTES) break;
        out = await encode(type, q);
      }
      if (out && (out.size < file.size || heic)) blob = out;
    } catch {
      if (heic) throw new Error("iPhone-ийн HEIC зургийг уншиж чадсангүй. Камераар шууд авах товчийг ашиглана уу.");
      /* жижигрүүлж чадахгүй бол эх файлыг илгээнэ */
    }
  }
  if (blob.size > 3 * 1024 * 1024) throw new Error("Зураг хэт том байна (3MB-аас бага)");

  const form = new FormData();
  form.append("file", blob, "image");
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Зураг оруулж чадсангүй");
  return data.url as string;
}

/** Зургийн дундаж гэрэлтэлт (0-255) — текстийн өнгийг автоматаар санал болгоход */
export async function imageBrightness(url: string): Promise<number | null> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = c.height = 32;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0, 32, 32);
    const d = ctx.getImageData(0, 0, 32, 32).data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    return sum / (d.length / 4);
  } catch {
    return null;
  }
}
