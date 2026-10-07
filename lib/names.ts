// Нийтлэгдсэн нийтлэл дээр хүүхдийн нэрийг хэрхэн харуулах (интернэтэд бүх хүнд харагдана)

export type AuthorDisplay = "short" | "full" | "anon";

export const AUTHOR_DISPLAYS: { id: AuthorDisplay; label: string }[] = [
  { id: "short", label: "Товчилсон (Б. Болд)" },
  { id: "full", label: "Бүтэн нэр" },
  { id: "anon", label: "Нэргүй (8А ангийн сурагч)" },
];

export const isAuthorDisplay = (v: unknown): v is AuthorDisplay => AUTHOR_DISPLAYS.some((d) => d.id === v);

/** "Болдбаатар Тэмүүлэн" → "Б. Тэмүүлэн" (овгийн эхний үсэг + нэр) */
export function publicName(name: string, mode: AuthorDisplay) {
  if (mode === "anon") return "8А ангийн сурагч";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (mode === "full" || words.length < 2) return words.join(" ") || "8А ангийн сурагч";
  const initial = words[0].replace(/[.,]/g, "").charAt(0).toUpperCase();
  const given = words[words.length - 1];
  return `${initial}. ${given.charAt(0).toUpperCase()}${given.slice(1)}`;
}
