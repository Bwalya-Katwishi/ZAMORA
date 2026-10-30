import assert from "node:assert/strict";
import test from "node:test";
import { districts } from "../src/data/districts";
import { places } from "../src/data/places";

const provinceIds = new Set(places.filter((place) => place.kind === "province").map((place) => place.id));

test("every district comes from the cited geoBoundaries file and has a unique id", () => {
  assert.equal(districts.length, 116);
  const ids = new Set(districts.map((district) => district.id));
  assert.equal(ids.size, 116);
  for (const district of districts) {
    assert.equal(district.kind, "district");
    assert.match(district.note, /geoBoundaries ADM2/);
    assert.match(district.note, /CC BY 4\.0/);
    assert.match(district.note, /shapeID /);
    assert.equal(district.id.startsWith("district-"), true);
    if (district.parentId) assert.equal(provinceIds.has(district.parentId), true);
  }
});

test("district ids do not collide with the hand-written gazetteer", () => {
  const authored = new Set(places.filter((place) => place.kind !== "district").map((place) => place.id));
  for (const district of districts) assert.equal(authored.has(district.id), false);
});
