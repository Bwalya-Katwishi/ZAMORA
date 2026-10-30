import assert from "node:assert/strict";
import test from "node:test";
import { districts } from "../src/data/districts";
import { places } from "../src/data/places";
import { districtProfile, filterProfileRecords, type ProfileRecord } from "../src/lib/atlas-profile";

const record: ProfileRecord = {
  id: "doc-1",
  accession: "ZMR-2026-039",
  title: "A catalog card",
  year: 1990,
  sectors: ["Labour"],
};

test("an unassigned district cites the boundary and takes no records", () => {
  const open = districts.find((district) => !district.parentId);
  assert.ok(open);
  const profile = districtProfile(open, places, [record]);
  assert.ok(profile);
  assert.equal(profile.assigned, false);
  assert.equal(profile.drawn, false);
  assert.equal(profile.records.length, 0);
  assert.match(profile.boundaryCitation, /CC BY 4.0/);
  assert.match(profile.boundaryCitation, /9469f09/);
  assert.equal(profile.license, "CC BY 4.0");
  assert.match(profile.uncertainty ?? "", /no province assignment/);
  assert.match(profile.neighborNote, /no neighbor is inferred/);
});

test("an assigned district keeps its own records and can be empty", () => {
  const filed = districts.find((district) => district.parentId);
  assert.ok(filed);
  const profile = districtProfile(filed, places, [record]);
  assert.equal(profile?.records.length, 1);
  assert.equal(profile?.sectors[0]?.name, "Labour");
  assert.ok((profile?.coFiled.length ?? 0) > 0);
  const empty = districtProfile(filed, places, []);
  assert.match(empty?.gaps[0] ?? "", /No catalog record/);
});

test("map filters drop a record outside the sector or the years", () => {
  const kept = filterProfileRecords([record], { sector: "Labour", from: 1980, to: 1999 });
  const dropped = filterProfileRecords([record], { sector: "Climate", from: 2000, to: 2010 });
  assert.equal(kept.length, 1);
  assert.equal(dropped.length, 0);
});
