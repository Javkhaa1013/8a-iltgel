// Эцэг эхийн тайлан ба хуулбар шалгахад ашиглах текстийн хэрэгслүүд

export const words = (text: string) => text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

export const wordCount = (text: string) => words(text).length;

export type DiffPart = { type: "same" | "add" | "del"; text: string };

/** Үгийн түвшний ялгаа (LCS). Ноорог-2 → Эцсийн бүтээл хэрхэн сайжирсныг харуулна. */
export function wordDiff(before: string, after: string): DiffPart[] {
  const a = before.split(/(\s+)/).filter(Boolean);
  const b = after.split(/(\s+)/).filter(Boolean);
  // Хэт урт бол санах ойг хэмнэж мөрөөр харьцуулна
  if (a.length * b.length > 4_000_000) {
    return [
      { type: "del", text: before },
      { type: "add", text: after },
    ];
  }
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);

  const out: DiffPart[] = [];
  const push = (type: DiffPart["type"], text: string) => {
    const last = out[out.length - 1];
    if (last?.type === type) last.text += text;
    else out.push({ type, text });
  };
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      push("same", a[i]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) push("del", a[i++]);
    else push("add", b[j++]);
  }
  while (i < n) push("del", a[i++]);
  while (j < m) push("add", b[j++]);
  return out;
}

export function diffStats(parts: DiffPart[]) {
  return {
    added: parts.filter((p) => p.type === "add").reduce((n, p) => n + wordCount(p.text), 0),
    removed: parts.filter((p) => p.type === "del").reduce((n, p) => n + wordCount(p.text), 0),
  };
}

/**
 * Хуулбар шалгах: 5 үгийн давхцал. "A-ийн текстийн хэдэн хувь нь B-д байна" гэдгийг тооцно.
 * Богино текстийг (40 үгээс бага) тооцохгүй.
 */
function shingles(text: string, size = 5) {
  const w = words(text);
  const set = new Set<string>();
  for (let i = 0; i + size <= w.length; i++) set.add(w.slice(i, i + size).join(" "));
  return set;
}

export function overlap(a: string, b: string) {
  if (wordCount(a) < 40 || wordCount(b) < 40) return 0;
  const sa = shingles(a);
  const sb = shingles(b);
  if (!sa.size) return 0;
  let hit = 0;
  sa.forEach((s) => sb.has(s) && hit++);
  return hit / sa.size;
}
