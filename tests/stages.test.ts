import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_STAGES, peerReviewEnd, sanitizeStages, stageEnd, stageStart, windowState } from "../lib/stages.ts";

const stage = DEFAULT_STAGES[0]; // 2026-10-05 .. 2026-10-09 (Улаанбаатарын цаг)
const at = (s: string) => new Date(s);

test("windowState: эхлэхээс өмнө upcoming", () => {
  assert.equal(windowState(stage, null, at("2026-10-04T23:59:00+08:00")), "upcoming");
});

test("windowState: эхлэх өдрийн 00:00-оос дуусах өдрийн 23:59 хүртэл open", () => {
  assert.equal(windowState(stage, null, at("2026-10-05T00:00:00+08:00")), "open");
  assert.equal(windowState(stage, null, at("2026-10-09T23:59:59+08:00")), "open");
});

test("windowState: дууссаны дараа closed", () => {
  assert.equal(windowState(stage, null, at("2026-10-10T00:00:00+08:00")), "closed");
});

test("windowState: сунгалт хугацааг уртасгана, богиносгохгүй", () => {
  const late = at("2026-10-11T12:00:00+08:00");
  assert.equal(windowState(stage, "2026-10-12T00:00:00+08:00", late), "open");
  assert.equal(windowState(stage, "2026-10-01T00:00:00+08:00", late), "closed");
  assert.equal(windowState(stage, "2026-10-01T00:00:00+08:00", at("2026-10-08T12:00:00+08:00")), "open");
});

test("stageStart / stageEnd / peerReviewEnd", () => {
  assert.equal(stageStart(stage).toISOString(), "2026-10-04T16:00:00.000Z");
  assert.equal(stageEnd(stage).toISOString(), "2026-10-09T15:59:59.999Z");
  assert.equal(peerReviewEnd(stage).getTime() - stageEnd(stage).getTime(), 7 * 86400_000);
});

test("sanitizeStages: хоосон биш массив, анхны хуваарь хэвээр", () => {
  assert.deepEqual(sanitizeStages(DEFAULT_STAGES), DEFAULT_STAGES);
  assert.equal(sanitizeStages(null), null);
});

test("sanitizeStages: байхгүй огноог татгалзана", () => {
  const bad = (start: string, end: string) => sanitizeStages(DEFAULT_STAGES.map((s, i) => (i ? s : { ...s, start, end })));
  assert.equal(bad("2026-13-45", "2026-13-46"), null);
  assert.equal(bad("2026-02-30", "2026-03-01"), null);
  assert.equal(bad("2026-10-09", "2026-10-05"), null); // эхлэх нь дуусахаас хойш
  assert.ok(bad("2026-10-05", "2026-10-09"));
});

test("sanitizeStages: id, төрөл өөрчлөгдөхгүй; хэт их оноо default-д буцна", () => {
  const out = sanitizeStages(DEFAULT_STAGES.map((s) => ({ ...s, kind: "image", max: 1000 })))!;
  assert.deepEqual(out.map((s) => s.kind), DEFAULT_STAGES.map((s) => s.kind));
  assert.deepEqual(out.map((s) => s.max), DEFAULT_STAGES.map((s) => s.max));
});
