import assert from "node:assert/strict";
import test from "node:test";
import { formatCitation } from "../src/lib/citations";

const livingstone = {
  authors: [{ name: "David Livingstone", sortName: "Livingstone, David", kind: "person" as const }],
  year: 1857,
  title: "Missionary Travels and Researches in South Africa",
  place: "London",
  publisher: "John Murray",
  type: "book",
};

test("Chicago, APA, and Harvard stay distinct for the same book", () => {
  assert.equal(
    formatCitation(livingstone, "chicago"),
    "Livingstone, David. Missionary Travels and Researches in South Africa. London: John Murray, 1857.",
  );
  assert.equal(
    formatCitation(livingstone, "apa"),
    "Livingstone, D. (1857). Missionary Travels and Researches in South Africa. John Murray.",
  );
  assert.equal(
    formatCitation(livingstone, "harvard"),
    "Livingstone, D. (1857) Missionary Travels and Researches in South Africa. London: John Murray.",
  );
});

test("two authors are joined without dropping the second given name in Chicago", () => {
  const citation = formatCitation(
    {
      authors: [
        { name: "David Livingstone", sortName: "Livingstone, David", kind: "person" },
        { name: "Charles Livingstone", sortName: "Livingstone, Charles", kind: "person" },
      ],
      year: 1865,
      title: "Narrative of an Expedition to the Zambesi and its Tributaries",
      place: "London",
      publisher: "John Murray",
      type: "book",
    },
    "chicago",
  );
  assert.match(citation, /^Livingstone, David, and Charles Livingstone\./);
});
