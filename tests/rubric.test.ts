import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_STAGES } from "../lib/stages.ts";
import { average, cleanRatings, ratingsToScore, rubricFor } from "../lib/rubric.ts";

const text = DEFAULT_STAGES[1];

test("cleanRatings: бүх шалгуур 1-4 бол зөвшөөрнө, илүү түлхүүрийг хаяна", () => {
  const ids = rubricFor(text).map((c) => c.id);
  const raw = { ...Object.fromEntries(ids.map((id) => [id, 3])), hack: 4 };
  const out = cleanRatings(text, raw)!;
  assert.deepEqual(Object.keys(out), ids);
});

test("cleanRatings: дутуу, 0, 5, бутархай, объект биш → null", () => {
  const ids = rubricFor(text).map((c) => c.id);
  const all = (v: unknown) => Object.fromEntries(ids.map((id) => [id, v]));
  assert.equal(cleanRatings(text, all(0)), null);
  assert.equal(cleanRatings(text, all(5)), null);
  assert.equal(cleanRatings(text, all(2.5)), null);
  assert.equal(cleanRatings(text, { [ids[0]]: 3 }), null);
  assert.equal(cleanRatings(text, null), null);
  assert.equal(cleanRatings(text, "x"), null);
});

test("ratingsToScore: 0.5-д бөөрөнхийлнө", () => {
  assert.equal(ratingsToScore({ a: 4, b: 4 }, 10), 10);
  assert.equal(ratingsToScore({ a: 2, b: 2 }, 10), 5);
  assert.equal(ratingsToScore({ a: 3, b: 4 }, 10), 9);
  assert.equal(ratingsToScore({}, 10), null);
});

test("average", () => {
  assert.equal(average([]), null);
  assert.equal(average([1, 2, 2]), 1.7);
});
