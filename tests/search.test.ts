import assert from "node:assert/strict";
import test from "node:test";
import { buildSearch, composeWebSearch, groupSearchPlaces, outsideZambiaQuery, searchOutcome } from "../src/lib/search";

test("exact phrases and exclusions stay in the parameter, not the SQL", () => {
  const attack = "'; drop table documents; --";
  const built = buildSearch({ q: attack, phrase: "line of rail", exclude: "kenya", place: "copperbelt" });
  assert.equal(built.sql.includes("drop table"), false);
  assert.equal(built.params[0], `${attack} "line of rail" -kenya`);
  assert.equal(built.params.includes("copperbelt"), true);
});

test("web search composition quotes a phrase and ignores empty fields", () => {
  const composed = composeWebSearch({ phrase: ' "Kariba" ', any: "power drought", exclude: "zimbabwe" });
  assert.equal(composed.text, '"Kariba" (power OR drought) -zimbabwe');
  assert.deepEqual(composed.errors, []);
});

test("a query that names another country is marked as outside the scope", () => {
  assert.equal(outsideZambiaQuery("Zimbabwe"), true);
  assert.equal(outsideZambiaQuery("Copperbelt"), false);
});

test("place search keeps an editor override in the query", () => {
  const built = buildSearch({ place: "ndola" });
  assert.match(built.sql, /tag_overrides/);
  assert.equal(built.sql.includes("ndola"), false);
  assert.equal(built.params.includes("ndola"), true);
});

test("bad years are rejected before a query is trusted", () => {
  const built = buildSearch({ from: "12", to: "3000" });
  assert.equal(built.errors.length, 2);
});

test("an empty search names the shelf and a chosen place with no records", () => {
  const open = searchOutcome({
    asked: false,
    hits: 0,
    errors: 0,
    outside: false,
    unknownPlace: false,
    shelfCount: 52,
    placeChosen: false,
  });
  assert.equal(open.gap, null);

  const missed = searchOutcome({
    asked: true,
    hits: 0,
    errors: 0,
    outside: false,
    unknownPlace: false,
    shelfCount: 52,
    placeChosen: true,
  });
  assert.match(missed.gap ?? "", /tagged to that place/);
  assert.match(missed.gap ?? "", /52 documents/);

  const hit = searchOutcome({
    asked: true,
    hits: 6,
    errors: 0,
    outside: false,
    unknownPlace: false,
    shelfCount: 52,
    placeChosen: false,
  });
  assert.equal(hit.countLine, "6 records from a shelf of 52.");
  assert.equal(hit.gap, null);
});

test("districts are grouped under a province, and an unjoined district stays apart", () => {
  const groups = groupSearchPlaces([
    { id: "copperbelt", name: "Copperbelt", kind: "province", parentName: null },
    { id: "district-ndola", name: "Ndola", kind: "district", parentName: "Copperbelt" },
    { id: "district-kitwe", name: "Kitwe", kind: "district", parentName: "Copperbelt" },
    { id: "district-itezhi-tezhi", name: "Itezhi-Tezhi", kind: "district", parentName: null },
  ]);
  assert.deepEqual(groups.provinces.map((place) => place.name), ["Copperbelt"]);
  assert.equal(groups.districts[0].province, "Copperbelt");
  assert.deepEqual(groups.districts[0].places.map((place) => place.name), ["Kitwe", "Ndola"]);
  assert.deepEqual(groups.unassigned.map((place) => place.name), ["Itezhi-Tezhi"]);
});
