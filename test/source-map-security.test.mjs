import assert from "node:assert/strict";
import { it } from "node:test";
import sourceMap from "source-map-js";

const { SourceMapConsumer } = sourceMap;
const flatMap = {
  version: 3,
  sources: ["example.js"],
  names: [],
  mappings: "AAAA",
};
const sectionMap = (line, column = 0, map = flatMap) => ({
  version: 3,
  sections: [{ offset: { line, column }, map }],
});

it("rejects source-map section offsets that can amplify tiny inputs", () => {
  // Constructor rejection avoids exercising the unpatched serialization loop.
  for (const line of [1e12, -1, 0.5, Infinity]) {
    assert.throws(() => new SourceMapConsumer(sectionMap(line)));
  }
  for (const column of [-1, 0.5, Infinity]) {
    assert.throws(() => new SourceMapConsumer(sectionMap(0, column)));
  }
});

it("rejects nested source-map offsets whose cumulative line count is excessive", () => {
  const map = sectionMap(5e6, 0, sectionMap(5e6, 0, sectionMap(5e6)));
  assert.throws(() => new SourceMapConsumer(map));
});

it("preserves normal indexed source-map lookups", () => {
  const consumer = new SourceMapConsumer(sectionMap(3));
  assert.deepEqual(consumer.originalPositionFor({ line: 4, column: 1 }), {
    source: "example.js",
    line: 1,
    column: 0,
    name: null,
  });
});
