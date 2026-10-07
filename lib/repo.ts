import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { ensureSchema } from "./schema";

// Энгийн хүснэгтийн давхарга: Supabase тохируулсан бол Supabase, үгүй бол data/*.json (локал туршилт).
// Шүүлт нь зөвхөн "багана = утга" хэлбэрийнх.

export type Table =
  | "students"
  | "submissions"
  | "submission_versions"
  | "drafts"
  | "comments"
  | "reviews"
  | "extensions"
  | "settings"
  | "rate_limits";
type Row = Record<string, unknown>;
type Where = Row;

interface Store {
  select<T>(table: Table, where?: Where): Promise<T[]>;
  insert<T>(table: Table, row: Row): Promise<T>;
  insertMany(table: Table, rows: Row[]): Promise<void>;
  update<T>(table: Table, where: Where, patch: Row): Promise<T[]>;
  remove(table: Table, where: Where): Promise<void>;
}

const RETRY_CODES = ["PGRST204", "PGRST205", "42703", "42P01"];

class SupabaseStore implements Store {
  constructor(private sb: SupabaseClient) {}

  // Шинэ хүснэгт үүссэний дараа Supabase-ийн кэш шинэчлэгдэх хүртэл нэг удаа дахин оролдоно
  private async run<T extends { error: { code?: string; message: string } | null }>(op: () => PromiseLike<T>): Promise<T> {
    await ensureSchema();
    const res = await op();
    if (res.error && RETRY_CODES.includes(res.error.code ?? "")) {
      await new Promise((r) => setTimeout(r, 1500));
      return op();
    }
    return res;
  }

  async select<T>(table: Table, where: Where = {}) {
    const { data, error } = await this.run(() => this.sb.from(table).select("*").match(where));
    if (error) throw error;
    return data as T[];
  }
  async insert<T>(table: Table, row: Row) {
    const { data, error } = await this.run(() => this.sb.from(table).insert(row).select("*").single());
    if (error) throw error;
    return data as T;
  }
  async insertMany(table: Table, rows: Row[]) {
    const { error } = await this.run(() => this.sb.from(table).insert(rows));
    if (error) throw error;
  }
  async update<T>(table: Table, where: Where, patch: Row) {
    const { data, error } = await this.run(() => this.sb.from(table).update(patch).match(where).select("*"));
    if (error) throw error;
    return data as T[];
  }
  async remove(table: Table, where: Where) {
    const { error } = await this.run(() => this.sb.from(table).delete().match(where));
    if (error) throw error;
  }
}

class FileStore implements Store {
  private queue: Promise<unknown> = Promise.resolve();
  private file = (t: Table) => path.join(process.cwd(), "data", `${t}.json`);

  private async read(t: Table): Promise<Row[]> {
    try {
      return JSON.parse(await fs.readFile(this.file(t), "utf8"));
    } catch {
      return [];
    }
  }
  private async write(t: Table, rows: Row[]) {
    await fs.mkdir(path.dirname(this.file(t)), { recursive: true });
    await fs.writeFile(this.file(t), JSON.stringify(rows, null, 2), "utf8");
  }
  private mutate<T>(t: Table, fn: (rows: Row[]) => T): Promise<T> {
    const run = this.queue.then(async () => {
      const rows = await this.read(t);
      const out = fn(rows);
      await this.write(t, rows);
      return out;
    });
    this.queue = run.catch(() => undefined);
    return run;
  }
  private matches = (r: Row, w: Where) => Object.entries(w).every(([k, v]) => r[k] === v);

  async select<T>(t: Table, where: Where = {}) {
    await this.queue;
    return (await this.read(t)).filter((r) => this.matches(r, where)) as T[];
  }
  insert<T>(t: Table, row: Row) {
    return this.mutate(t, (rows) => {
      const full = { id: randomUUID(), created_at: new Date().toISOString(), ...row };
      if (t === "settings" || t === "rate_limits") delete (full as Row).id; // key-ээр тодорхойлогдоно
      rows.push(full);
      return full as T;
    });
  }
  async insertMany(t: Table, rows: Row[]) {
    for (const row of rows) await this.insert(t, row);
  }
  update<T>(t: Table, where: Where, patch: Row) {
    return this.mutate(t, (rows) => {
      const hit = rows.filter((r) => this.matches(r, where));
      hit.forEach((r) => Object.assign(r, patch));
      return hit as T[];
    });
  }
  async remove(t: Table, where: Where) {
    await this.mutate(t, (rows) => {
      for (let i = rows.length - 1; i >= 0; i--) if (this.matches(rows[i], where)) rows.splice(i, 1);
    });
  }
}

let store: Store | undefined;

export function repo(): Store {
  if (!store) {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
    if (url && key) store = new SupabaseStore(createClient(url, key, { auth: { persistSession: false } }));
    else if (process.env.VERCEL) throw new Error("Vercel дээр Supabase тохируулах шаардлагатай");
    else store = new FileStore();
  }
  return store;
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
