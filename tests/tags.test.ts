import assert from "node:assert/strict";
import test from "node:test";
import { applyTags, parseTagOverride } from "../src/lib/tags";

test("a tag override needs a known kind and a reason", () => {
  const parsed = parseTagOverride({
    kind: "place",
    action: "add",
    targetId: "district-ndola",
    note: "The sitting names Ndola in the catalog note.",
  });
  assert.equal(parsed.ok, true);
  const refused = parseTagOverride({ kind: "date", action: "add", targetId: "1964", note: "Too short." });
  assert.equal(refused.ok, false);
});

test("an editor mark sits beside the catalog tag and does not invent a removal", () => {
  const tags = applyTags(
    [{ id: "lusaka-city", name: "Lusaka" }],
    [
      { action: "remove", targetId: "lusaka-city", name: "Lusaka", note: "The page is national.", author: "Editor" },
      { action: "add", targetId: "district-ndola", name: "Ndola", note: "Named in the note.", author: "Editor" },
      { action: "remove", targetId: "kitwe", name: "Kitwe", note: "Not on the record.", author: "Editor" },
    ],
  );
  const lusaka = tags.find((tag) => tag.id === "lusaka-city");
  const ndola = tags.find((tag) => tag.id === "district-ndola");
  assert.equal(lusaka?.removed, true);
  assert.equal(lusaka?.origin, "catalog");
  assert.equal(ndola?.origin, "editor");
  assert.equal(tags.some((tag) => tag.id === "kitwe"), false);
});
