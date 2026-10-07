import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { currentStudent, isTeacher } from "@/lib/auth";
import { hit, isLimited } from "@/lib/rateLimit";

// Арын зураг болон слайдын зургийг хадгална.
// Supabase тохируулсан бол Storage-ийн нийтийн "uploads" bucket, үгүй бол public/uploads (локал).

const MAX_BYTES = 3 * 1024 * 1024;
const BUCKET = "uploads";

// Файлын эхний байтаар төрлийг шалгана (нэрийг нь итгэхгүй; SVG зөвшөөрөхгүй)
function detectType(buf: Uint8Array): { ext: string; mime: string } | null {
  const b = (i: number) => buf[i];
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47) return { ext: "png", mime: "image/png" };
  if (b(0) === 0x47 && b(1) === 0x49 && b(2) === 0x46) return { ext: "gif", mime: "image/gif" };
  if (b(0) === 0x52 && b(1) === 0x49 && b(2) === 0x46 && b(3) === 0x46 && b(8) === 0x57 && b(9) === 0x45 && b(10) === 0x42 && b(11) === 0x50)
    return { ext: "webp", mime: "image/webp" };
  return null;
}

let bucketReady: Promise<void> | null = null;

export async function POST(req: Request) {
  // Зөвхөн нэвтэрсэн сурагч эсвэл багш зураг оруулна
  const teacher = await isTeacher();
  const student = teacher ? null : await currentStudent();
  if (!teacher && !student) return NextResponse.json({ error: "Эхлээд нэвтэрнэ үү" }, { status: 401 });
  // Хүн тутамд 10 минутад 40 зураг (сурагч бүр тусдаа тоологдоно — нэг ангийн Wi-Fi-аас олуулаа оруулж болно)
  const limitKey = `upload:${student ? student.id : "teacher"}`;
  if (await isLimited(limitKey, 40)) return NextResponse.json({ error: "Хэт олон зураг оруулсан байна. Түр хүлээнэ үү" }, { status: 429 });
  await hit(limitKey);

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof Blob)) return NextResponse.json({ error: "Зураг олдсонгүй" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Зураг 3MB-аас бага байх ёстой" }, { status: 400 });

  const buf = new Uint8Array(await file.arrayBuffer());
  const type = detectType(buf);
  if (!type) return NextResponse.json({ error: "Зөвхөн JPG, PNG, WEBP, GIF зураг оруулна" }, { status: 400 });

  const month = new Date().toISOString().slice(0, 7);
  const name = `${randomUUID()}.${type.ext}`;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (url && key) {
    const sb = createClient(url, key, { auth: { persistSession: false } });
    bucketReady ??= (async () => {
      const { data } = await sb.storage.getBucket(BUCKET);
      if (!data) {
        const { error } = await sb.storage.createBucket(BUCKET, {
          public: true,
          fileSizeLimit: MAX_BYTES,
          allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
        });
        if (error && !/exists/i.test(error.message)) throw error;
      }
    })().catch((e) => {
      bucketReady = null;
      throw e;
    });
    await bucketReady;

    const objectPath = `${month}/${name}`;
    const { error } = await sb.storage.from(BUCKET).upload(objectPath, buf, { contentType: type.mime, cacheControl: "31536000" });
    if (error) {
      console.error("Зураг хадгалж чадсангүй:", error);
      return NextResponse.json({ error: "Зураг хадгалж чадсангүй" }, { status: 500 });
    }
    return NextResponse.json({ url: sb.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl });
  }

  if (process.env.VERCEL) return NextResponse.json({ error: "Supabase тохируулаагүй байна" }, { status: 500 });

  const dir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), buf);
  return NextResponse.json({ url: `/uploads/${name}` });
}
