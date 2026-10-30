import fs from "node:fs";

const retrieved = "2026-10-14";
const specs = [
  {
    file: "inflation",
    code: "FP.CPI.TOTL.ZG",
    unit: "percent per year",
    question: "public-finance",
    caveat:
      "National annual consumer-price inflation as published by the World Bank. It is not a household budget, a food-price index, or a ZAMORA forecast. The latest year may be revised.",
  },
  {
    file: "gdp-growth",
    code: "NY.GDP.MKTP.KD.ZG",
    unit: "percent per year",
    question: "public-finance",
    caveat:
      "National annual real GDP growth as published by the World Bank. It is not a measure of employment, mining output, or household income.",
  },
  {
    file: "cereal-yield",
    code: "AG.YLD.CREL.KG",
    unit: "kilograms per hectare",
    question: "food",
    caveat:
      "National cereal yield. Yield is not food security, maize availability, or a statement about any province.",
  },
  {
    file: "electricity-access",
    code: "EG.ELC.ACCS.ZS",
    unit: "percent of population",
    question: "kariba-power",
    caveat:
      "Share of the population with access to electricity. Access is not generation, not hydropower, and not a record of load shedding.",
  },
];

const series = specs.map((spec) => {
  const raw = JSON.parse(fs.readFileSync(`data/raw/${spec.file}.json`, "utf8"));
  const rows = raw[1];
  const name = rows[0].indicator.value;
  const observations = rows
    .filter((row) => row.countryiso3code === "ZMB" && row.value !== null)
    .map((row) => ({ year: Number(row.date), value: Number(row.value) }))
    .sort((a, b) => a.year - b.year);
  return {
    code: spec.code,
    name,
    unit: spec.unit,
    question: spec.question,
    caveat: spec.caveat,
    observations,
  };
});

const payload = {
  retrieved,
  source: "World Bank Open Data API",
  sourceUrl: "https://api.worldbank.org/v2/country/ZMB/indicator",
  country: "Zambia",
  countryCode: "ZMB",
  note: "Retrieved for Zambia only. Values are copied from the World Bank response and rounded to one decimal in the interface. ZAMORA did not estimate missing years.",
  series,
};

fs.mkdirSync("data/indicators", { recursive: true });
fs.writeFileSync("data/indicators/worldbank-zmb.json", JSON.stringify(payload, null, 2));
console.log(series.map((item) => `${item.code} ${item.observations.length}`).join("\n"));
