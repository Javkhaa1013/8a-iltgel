import { NextResponse } from "next/server";

export const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });
export const ok = (data: unknown = { ok: true }, status = 200) => NextResponse.json(data, { status });
export const readJson = async (req: Request): Promise<Record<string, unknown>> => req.json().catch(() => ({}));

export const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

/** 0..max хооронд эсвэл null (хоосон) */
export function score(v: unknown, max: number): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > max) return undefined;
  return Math.round(n * 10) / 10;
}
