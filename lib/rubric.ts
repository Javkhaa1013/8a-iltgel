import type { Stage } from "./stages";

// Өөрийн болон хөндлөнгийн үнэлгээний шалгуур. Шалгуур бүрийг 1-4 гэж үнэлнэ.

export type Criterion = { id: string; label: string; hint: string };

export const LEVELS = [
  { value: 1, label: "Сайжруулах хэрэгтэй", short: "1" },
  { value: 2, label: "Дунд", short: "2" },
  { value: 3, label: "Сайн", short: "3" },
  { value: 4, label: "Маш сайн", short: "4" },
];

const DRAFT_SKETCH: Criterion[] = [
  { id: "idea", label: "Гол санаа", hint: "Юуны тухай бичих нь тодорхой юу?" },
  { id: "plan", label: "Төлөвлөгөө, бүтэц", hint: "Оршил, гол хэсэг, дүгнэлтийн төлөвлөгөө харагдаж байна уу?" },
  { id: "detail", label: "Жишээ, баримт", hint: "Санаагаа батлах жишээ, баримт тэмдэглэсэн үү?" },
  { id: "neat", label: "Уншигдахуйц", hint: "Бичиг цэвэрхэн, ойлгомжтой юу?" },
];

const ARTICLE: Criterion[] = [
  { id: "title", label: "Гарчиг", hint: "Гарчиг агуулгатайгаа тохирч, уншигчийн анхаарал татаж байна уу?" },
  { id: "structure", label: "Бүтэц", hint: "Оршил, гол хэсэг, дүгнэлт тодорхой, догол мөр зөв үү?" },
  { id: "evidence", label: "Жишээ, баримт", hint: "Санаагаа жишээ, баримтаар баталсан уу?" },
  { id: "language", label: "Үг хэллэг, бичгийн дүрэм", hint: "Үг давтагдахгүй, зөв бичгийн алдаа цөөн үү?" },
];

const REFLECTION: Criterion[] = [
  { id: "learned", label: "Юу сурсан", hint: "Энэ ажлаас юу сурснаа тодорхой бичсэн үү?" },
  { id: "challenge", label: "Хүндрэл ба шийдэл", hint: "Ямар хүндрэл гарч, хэрхэн давсныг бичсэн үү?" },
  { id: "goal", label: "Цаашдын зорилго", hint: "Дараа юуг илүү сайн хийхээ бичсэн үү?" },
  { id: "language", label: "Үг хэллэг", hint: "Ойлгомжтой, өөрийн үгээр бичсэн үү?" },
];

export function rubricFor(stage: Stage): Criterion[] {
  if (stage.kind === "image") return DRAFT_SKETCH;
  return stage.assignment === "reflection" ? REFLECTION : ARTICLE;
}

/** Бүх шалгуурыг 1-4-өөр үнэлсэн эсэхийг шалгаж, зөвшөөрөгдсөн түлхүүрүүдийг л үлдээнэ */
export function cleanRatings(stage: Stage, raw: unknown): Record<string, number> | null {
  if (!raw || typeof raw !== "object") return null;
  const out: Record<string, number> = {};
  for (const c of rubricFor(stage)) {
    const v = Number((raw as Record<string, unknown>)[c.id]);
    if (!Number.isInteger(v) || v < 1 || v > 4) return null;
    out[c.id] = v;
  }
  return out;
}

/** Шалгуурын дундаж (1-4) → тухайн шатын оноо (жишээ нь 10 онооноос) */
export function ratingsToScore(ratings: Record<string, number>, max: number) {
  const vals = Object.values(ratings);
  if (!vals.length) return null;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.round((avg / 4) * max * 2) / 2;
}

export const average = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
