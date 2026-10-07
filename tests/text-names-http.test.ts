import { test } from "node:test";
import assert from "node:assert/strict";
import { diffStats, overlap, wordCount, wordDiff } from "../lib/textTools.ts";
import { isAuthorDisplay, publicName } from "../lib/names.ts";

test("wordCount: кирилл ба тоо", () => {
  assert.equal(wordCount("Сайн байна уу, 8А анги!"), 5);
  assert.equal(wordCount(""), 0);
});

test("wordDiff / diffStats", () => {
  const stats = diffStats(wordDiff("нэг хоёр гурав", "нэг гурав дөрөв"));
  assert.deepEqual(stats, { added: 1, removed: 1 });
  assert.deepEqual(diffStats(wordDiff("ижил текст", "ижил текст")), { added: 0, removed: 0 });
});

test("overlap: богино текстийг тооцохгүй, хуулсан текстийг илрүүлнэ", () => {
  const long = Array.from({ length: 60 }, (_, i) => `үг${i}`).join(" ");
  assert.equal(overlap("богино", "богино"), 0);
  assert.equal(overlap(long, long), 1);
  const other = Array.from({ length: 60 }, (_, i) => `өөр${i}`).join(" ");
  assert.equal(overlap(long, other), 0);
});

test("publicName", () => {
  assert.equal(publicName("Болдбаатар Тэмүүлэн", "short"), "Б. Тэмүүлэн");
  assert.equal(publicName("Болдбаатар Тэмүүлэн", "full"), "Болдбаатар Тэмүүлэн");
  assert.equal(publicName("Болдбаатар Тэмүүлэн", "anon"), "8А ангийн сурагч");
  assert.equal(publicName("  ", "short"), "8А ангийн сурагч");
});

test("isAuthorDisplay", () => {
  assert.ok(isAuthorDisplay("anon"));
  assert.ok(!isAuthorDisplay("nope"));
});
