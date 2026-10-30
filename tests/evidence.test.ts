import assert from "node:assert/strict";
import test from "node:test";
import { deskResponseKeys, effectiveIds, judgeDesk, refusalFor, type DeskFilters, type ShelfRecord } from "../src/lib/evidence";

function filters(patch: Partial<DeskFilters> = {}): DeskFilters {
  return {
    placeId: "copperbelt",
    placeName: "Copperbelt",
    placeKind: "province",
    placeAssigned: true,
    sectorIds: ["labour"],
    sectorNames: ["Labour"],
    from: 1930,
    to: 1999,
    questionType: "historical",
    keywords: "",
    entityId: null,
    entityName: null,
    ...patch,
  };
}

function record(id: string, year: number, patch: Partial<ShelfRecord> = {}): ShelfRecord {
  return {
    id,
    accession: `ZMR-${year}-${id}`,
    title: `Record ${id}`,
    type: "book",
    year,
    summary: "A catalog note.",
    rights: "Metadata only. The book is not reproduced.",
    url: "https://example.test/record",
    metadataOnly: true,
    publisher: "Press",
    publicationPlace: "Lusaka",
    container: null,
    places: [{ id: "copperbelt", name: "Copperbelt" }],
    sectors: [{ id: "labour", name: "Labour" }],
    entities: [{ id: "author", name: "A. Writer", sortName: "Writer, A.", kind: "person" }],
    events: [],
    ...patch,
  };
}

const allowed = { allowed: true, code: "allowed" as const, message: "" };

test("three catalogued records make a limited pack, with a citation and no forecast", () => {
  const body = judgeDesk({
    filters: filters(),
    records: [record("a", 1941), record("b", 1958), record("c", 1979)],
    shelfCount: 52,
    placeRecordCount: 8,
    sectorRecordCount: 6,
    refusal: allowed,
  });
  assert.equal(body.result_type, "evidence_pack");
  assert.equal(body.confidence, "limited");
  assert.deepEqual(Object.keys(body).sort(), [...deskResponseKeys].sort());
  assert.equal(body.citations.length, 3);
  for (const citation of body.citations) {
    assert.match(citation.citation, /Record /);
    assert.ok(citation.accession);
    assert.equal(typeof citation.url, "string");
  }
  const dumped = JSON.stringify(body);
  assert.equal(dumped.includes("probability"), false);
  assert.equal(dumped.includes("forecast"), false);
  assert.equal(dumped.includes("suspect"), false);
});

test("fewer than three records is insufficient and still names the shelf", () => {
  const body = judgeDesk({
    filters: filters(),
    records: [record("a", 1941)],
    shelfCount: 52,
    placeRecordCount: 4,
    sectorRecordCount: 4,
    refusal: allowed,
  });
  assert.equal(body.result_type, "insufficient");
  assert.equal(body.gaps[0]?.code, "too_few");
  assert.match(body.limitations.join(" "), /52 documents/);
  assert.match(body.limitations.join(" "), /not currently hold enough/);
});

test("an empty place with a live sector says the place has no record", () => {
  const body = judgeDesk({
    filters: filters({ placeId: "district-ndola", placeName: "Ndola", placeKind: "district" }),
    records: [],
    shelfCount: 52,
    placeRecordCount: 0,
    sectorRecordCount: 6,
    refusal: allowed,
  });
  assert.equal(body.gaps[0]?.code, "sector_without_place");
  assert.equal(body.records.length, 0);
});

test("a place with other records and no sector match says so", () => {
  const body = judgeDesk({
    filters: filters({ sectorIds: ["climate"], sectorNames: ["Climate"] }),
    records: [],
    shelfCount: 52,
    placeRecordCount: 8,
    sectorRecordCount: 0,
    refusal: allowed,
  });
  assert.equal(body.gaps[0]?.code, "place_without_sector");
});

test("a long span covered by one year is incomplete", () => {
  const body = judgeDesk({
    filters: filters({ from: 1900, to: 2020 }),
    records: [record("a", 2020), record("b", 2020), record("c", 2020)],
    shelfCount: 52,
    placeRecordCount: 3,
    sectorRecordCount: 3,
    refusal: allowed,
  });
  assert.equal(body.gaps[0]?.code, "date_incomplete");
  assert.equal(body.result_type, "insufficient");
});

test("an uncertain district is not given the records that were passed in", () => {
  const body = judgeDesk({
    filters: filters({
      placeId: "district-itezhi-tezhi",
      placeName: "Itezhi-Tezhi",
      placeKind: "district",
      placeAssigned: false,
    }),
    records: [record("a", 1941), record("b", 1958), record("c", 1979)],
    shelfCount: 52,
    placeRecordCount: 0,
    sectorRecordCount: 6,
    refusal: allowed,
  });
  assert.equal(body.result_type, "insufficient");
  assert.equal(body.gaps[0]?.code, "uncertain_district");
  assert.equal(body.records.length, 0);
});

test("a policy question on metadata alone does not become a trace of the text", () => {
  const body = judgeDesk({
    filters: filters({ questionType: "policy", from: null, to: null }),
    records: [record("a", 2016), record("b", 2026), record("c", 1964)],
    shelfCount: 52,
    placeRecordCount: 5,
    sectorRecordCount: 5,
    refusal: allowed,
  });
  assert.equal(body.gaps[0]?.code, "metadata_only");
});

test("a comparative question that also names Zambia can proceed, and one that does not is refused", () => {
  const open = refusalFor(filters({ questionType: "comparative", keywords: "rainfall in Zimbabwe" }));
  assert.equal(open.allowed, true);
  const shut = refusalFor(filters({ placeId: null, placeName: null, keywords: "rainfall in Zimbabwe", sectorIds: [] }));
  assert.equal(shut.allowed, false);
  const body = judgeDesk({
    filters: filters({ placeId: null, placeName: null, keywords: "who will win the election" }),
    records: [],
    shelfCount: 52,
    placeRecordCount: 0,
    sectorRecordCount: 0,
    refusal: shut.allowed ? allowed : refusalFor(filters({ keywords: "who will win the election", placeName: null })),
  });
  assert.equal(body.result_type, "refused");
});

test("an added tag is searchable and a withdrawn override restores the catalog", () => {
  assert.deepEqual(effectiveIds(["lusaka-city"], [{ action: "add", targetId: "district-ndola" }]).sort(), ["district-ndola", "lusaka-city"]);
  assert.deepEqual(effectiveIds(["lusaka-city"], [{ action: "remove", targetId: "lusaka-city" }]), []);
  assert.deepEqual(effectiveIds(["lusaka-city"], []), ["lusaka-city"]);
});
