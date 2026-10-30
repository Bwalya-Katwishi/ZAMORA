import assert from "node:assert/strict";
import test from "node:test";
import { deliverables, POSITIONING } from "../src/data/launch";
import { definitionOfDone, PLAN_NOTE, weeks } from "../src/data/plan";

test("the 90-day plan is honest about the shelf", () => {
  assert.equal(weeks.length, 13);
  assert.match(PLAN_NOTE, /52 metadata documents/);
  assert.doesNotMatch(PLAN_NOTE, /holds 5,000/);
  const corpus = definitionOfDone.find((item) => item.id === "corpus");
  assert.equal(corpus?.done, false);
  const pilots = definitionOfDone.find((item) => item.id === "pilots");
  assert.equal(pilots?.done, false);
  for (const week of weeks) {
    assert.ok(week.goals && week.features && week.data && week.engineering && week.tests && week.deliverables && week.demo && week.risks && week.success);
  }
});

test("the launch kit has twenty outlines and the positioning sentence", () => {
  assert.equal(deliverables.length, 20);
  assert.match(POSITIONING, /Zambia-first evidence desk/);
  assert.match(POSITIONING, /not good enough/);
  const newsroom = deliverables.find((item) => item.slug === "pilot-newsroom");
  assert.match(newsroom?.paragraphs.join(" ") ?? "", /no newsroom has been onboarded/);
  const pitch = deliverables.find((item) => item.slug === "pitch");
  assert.match(pitch?.paragraphs.join(" ") ?? "", /Not 5,000 records/);
  assert.equal(deliverables.filter((item) => item.kind.toLowerCase().includes("outline") || item.kind === "Privacy outline" || item.kind === "Terms outline").length > 0, true);
});
