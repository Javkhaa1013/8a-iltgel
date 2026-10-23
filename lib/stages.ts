// Бие даалтын хуваарь (Үнэлгээний хүснэгтийн дагуу). Багш "Хуваарь" хэсэгт огноог өөрчилж болно.

export type AssignmentId = "article" | "reflection";

export const ASSIGNMENTS: { id: AssignmentId; name: string; emoji: string }[] = [
  { id: "article", name: "Нийтлэл", emoji: "📰" },
  { id: "reflection", name: "Эргэцүүлэл", emoji: "💭" },
];

/** Даалгаврын нийт оноо — шатуудынхаа нийлбэр (багш шат нэмэхэд өөрөө өөрчлөгдөнө) */
export const assignmentMax = (stages: Stage[], a: AssignmentId) =>
  stages.filter((s) => s.assignment === a).reduce((n, s) => n + s.max, 0);

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

const SLUG = /^[a-z0-9-]{1,40}$/;
const newId = (a: AssignmentId) => `${a}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export type ParsedStages = { ok: true; stages: Stage[] } | { ok: false; error: string };

/**
 * Багшийн илгээсэн хуваарийг шалгана. Багш шат нэмэх, нэр/төрөл/огноо/оноог өөрчилж болно.
 * id нь хэвээр үлдэнэ — сурагчдын бүтээл id-гаар холбогддог. Шинэ шатад id автоматаар үүснэ.
 */
export function parseStages(input: unknown): ParsedStages {
  if (!Array.isArray(input) || !input.length) return { ok: false, error: "Хуваарь хоосон байна" };
  if (input.length > 20) return { ok: false, error: "Хэт олон шат (20-оос ихгүй)" };

  const out: Stage[] = [];
  const ids = new Set<string>();
  for (const raw of input) {
    if (!raw || typeof raw !== "object") return { ok: false, error: "Шатны мэдээлэл буруу байна" };
    const s = raw as Record<string, unknown>;
    const assignment: AssignmentId | null = s.assignment === "article" || s.assignment === "reflection" ? s.assignment : null;
    if (!assignment) return { ok: false, error: "Даалгавар буруу байна" };

    const label = String(s.label ?? "").trim().slice(0, 40);
    if (!label) return { ok: false, error: "Шатны нэрийг бөглөнө үү" };
    const kind: Stage["kind"] | null = s.kind === "image" || s.kind === "text" ? s.kind : null;
    if (!kind) return { ok: false, error: `"${label}": төрөл нь зураг эсвэл текст байна` };
    if (!isRealDate(s.start) || !isRealDate(s.end)) return { ok: false, error: `"${label}": огноо буруу байна` };
    if ((s.start as string) > (s.end as string)) return { ok: false, error: `"${label}": эхлэх огноо дуусах огнооноос хойш байна` };
    const max = Number(s.max ?? 0);
    if (!Number.isFinite(max) || max < 0 || max > 100) return { ok: false, error: `"${label}": оноо 0-100 хооронд байна` };
    const endTime = typeof s.endTime === "string" && TIME_RE.test(s.endTime) ? s.endTime : undefined;

    let id = typeof s.id === "string" && SLUG.test(s.id) ? s.id : newId(assignment);
    while (ids.has(id)) id = newId(assignment);
    ids.add(id);

    out.push({
      id,
      assignment,
      label,
      kind,
      start: s.start as string,
      end: s.end as string,
      max: Math.round(max * 2) / 2,
      ...(endTime ? { endTime } : {}),
      ...(s.final === true ? { final: true } : {}),
    });
  }

  for (const a of ASSIGNMENTS) {
    if (out.filter((s) => s.assignment === a.id && s.final).length > 1)
      return { ok: false, error: `${a.name}: "сайтад нийтлэх шат" нэгээс олон байж болохгүй` };
  }
  return { ok: true, stages: out };
}

/** Хадгалсан тохиргоог унших (буруу бол анхдагчийг ашиглана) */
export function sanitizeStages(input: unknown): Stage[] | null {
  const r = parseStages(input);
  return r.ok ? r.stages : null;
}
