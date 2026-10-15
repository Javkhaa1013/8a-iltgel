// Бие даалтын хуваарь (Үнэлгээний хүснэгтийн дагуу). Багш "Хуваарь" хэсэгт огноог өөрчилж болно.

export type AssignmentId = "article" | "reflection";

export const ASSIGNMENTS: { id: AssignmentId; name: string; emoji: string; max: number }[] = [
  { id: "article", name: "Нийтлэл", emoji: "📰", max: 30 },
  { id: "reflection", name: "Эргэцүүлэл", emoji: "💭", max: 20 },
];

export const ATTENDANCE_MAX = 50;

export type Stage = {
  id: string;
  assignment: AssignmentId;
  label: string;
  kind: "image" | "text";
  start: string; // YYYY-MM-DD (Улаанбаатарын цагаар 00:00-оос)
  end: string; // YYYY-MM-DD
  endTime?: string; // "HH:MM" — дуусах цаг (хоосон бол тухайн өдрийн 23:59)
  max: number;
  final?: boolean; // нийтэд нийтлэх боломжтой эцсийн бүтээл
};

export const DEFAULT_STAGES: Stage[] = [
  // Дараалал нь багшийн сонгосон дарааллаар (огнооны дарааллаар биш).
  // id-г хэзээ ч өөрчлөхгүй — сурагчдын илгээсэн бүтээл id-гаар холбогддог.
  { id: "article-4", assignment: "article", label: "Ноорог-1", kind: "image", start: "2026-10-17", end: "2026-10-18", endTime: "20:00", max: 10 },
  { id: "article-1", assignment: "article", label: "Ноорог-2", kind: "image", start: "2026-10-01", end: "2026-10-12", max: 0 },
  { id: "article-2", assignment: "article", label: "Ноорог-3", kind: "text", start: "2026-10-15", end: "2026-10-16", endTime: "08:00", max: 10 },
  { id: "article-3", assignment: "article", label: "Эцсийн бүтээл", kind: "text", start: "2026-10-19", end: "2026-10-23", max: 10, final: true },
  { id: "reflection-1", assignment: "reflection", label: "Ноорог", kind: "text", start: "2026-10-19", end: "2026-10-23", max: 10 },
  { id: "reflection-2", assignment: "reflection", label: "Эцсийн бүтээл", kind: "text", start: "2026-10-26", end: "2026-10-30", max: 10 },
];

/** Хөндлөнгийн үнэлгээ хугацаа дууссанаас хойш хэд хоног нээлттэй байх */
export const PEER_REVIEW_DAYS = 7;
export const PEERS_PER_STUDENT = 2;

const UB_OFFSET = "+08:00"; // Монгол улс зуны цагийн шилжилтгүй

export function now(): Date {
  // Локал туршилтад цагийг дуурайх: DEV_NOW=2026-10-07T12:00:00+08:00
  const fake = process.env.NODE_ENV !== "production" ? process.env.DEV_NOW : undefined;
  return fake ? new Date(fake) : new Date();
}

export const stageStart = (s: Stage) => new Date(`${s.start}T00:00:00${UB_OFFSET}`);
export const stageEnd = (s: Stage) =>
  new Date(s.endTime ? `${s.end}T${s.endTime}:00.000${UB_OFFSET}` : `${s.end}T23:59:59.999${UB_OFFSET}`);
export const peerReviewEnd = (s: Stage) => new Date(stageEnd(s).getTime() + PEER_REVIEW_DAYS * 86400_000);

export type WindowState = "upcoming" | "open" | "closed";

/** Сурагч оруулах боломжтой эсэх. extensionUntil — багшийн сунгасан хугацаа. */
export function windowState(s: Stage, extensionUntil?: string | null, at = now()): WindowState {
  if (at < stageStart(s)) return "upcoming";
  const end = extensionUntil ? Math.max(stageEnd(s).getTime(), new Date(extensionUntil).getTime()) : stageEnd(s).getTime();
  return at.getTime() <= end ? "open" : "closed";
}

const MONTHS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

/** "X/5-9" хэлбэр (хүснэгттэй ижил) */
export function rangeLabel(s: Stage) {
  const [, m1, d1] = s.start.split("-").map(Number);
  const [, m2, d2] = s.end.split("-").map(Number);
  const range = m1 === m2 ? `${MONTHS[m1 - 1]}/${d1}-${d2}` : `${MONTHS[m1 - 1]}/${d1} - ${MONTHS[m2 - 1]}/${d2}`;
  return s.endTime ? `${range} ${s.endTime}` : range;
}

/** Улаанбаатарын цагаар "10/09 23:59" */
export function formatUB(d: Date | string, withTime = true) {
  const date = typeof d === "string" ? new Date(d) : d;
  const ub = new Date(date.getTime() + 8 * 3600_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = `${ub.getUTCFullYear()}.${pad(ub.getUTCMonth() + 1)}.${pad(ub.getUTCDate())}`;
  return withTime ? `${day} ${pad(ub.getUTCHours())}:${pad(ub.getUTCMinutes())}` : day;
}

export function timeLeft(to: Date, at = now()) {
  const ms = to.getTime() - at.getTime();
  if (ms <= 0) return "дууссан";
  const h = Math.floor(ms / 3600_000);
  if (h >= 48) return `${Math.floor(h / 24)} хоног`;
  if (h >= 1) return `${h} цаг`;
  return `${Math.max(1, Math.floor(ms / 60_000))} минут`;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
// "2026-13-45" мэт байхгүй огноог татгалзана (Invalid Date болбол үе шат бүгд "хаалттай" болно)
const isRealDate = (v: unknown) => typeof v === "string" && DATE_RE.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v);

/** Багшийн илгээсэн хуваарийг шалгана: id, төрөл өөрчлөгдөхгүй, зөвхөн огноо ба оноо */
export function sanitizeStages(input: unknown): Stage[] | null {
  if (!Array.isArray(input)) return null;
  const out: Stage[] = [];
  for (const def of DEFAULT_STAGES) {
    const s = input.find((x) => x && x.id === def.id) ?? def;
    if (!isRealDate(s.start) || !isRealDate(s.end) || s.start > s.end) return null;
    const max = Number(s.max);
    const endTime = typeof s.endTime === "string" && TIME_RE.test(s.endTime) ? s.endTime : undefined;
    out.push({ ...def, start: s.start, end: s.end, max: Number.isFinite(max) && max >= 0 && max <= 100 ? max : def.max, ...(endTime ? { endTime } : {}) });
  }
  return out;
}
