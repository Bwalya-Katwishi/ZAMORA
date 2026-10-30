export interface ScenarioSeed {
  id: string;
  question: string;
  categoryId: string;
  status: "no_forecast" | "baseline_only";
  assumptions: string;
  notClaimed: string;
  methodNote: string;
  events: string[];
  documents: string[];
}

export const scenarios: ScenarioSeed[] = [
  {
    id: "kariba-power",
    question: "What can the record say about low water and electricity in Zambia?",
    categoryId: "energy",
    status: "baseline_only",
    assumptions:
      "Kariba is a major source of Zambian generation, and the lake depends on the Zambezi. A historical resemblance to the resettlement era, or a movement in a national access statistic, is not by itself evidence of a future shortage.",
    notClaimed:
      "No forecast of load shedding is issued. Access to electricity is not generation. Generation is not hydropower. Hydropower is not rainfall at the catchment. None of those missing series has been invented.",
    methodNote:
      "Historical episodes are the dated events and studies linked below. The only numeric series attached is the World Bank access-to-electricity indicator. A three-year holdout compares two baselines on that series and is labeled as a baseline check.",
    events: ["kariba", "falls-bridge-1905"],
    documents: ["scudder-1962", "colson-1971", "bridge-1905-photo", "world-bank-zmb"],
  },
  {
    id: "food",
    question: "What would a careful account of food security need, beyond a national yield figure?",
    categoryId: "agriculture",
    status: "baseline_only",
    assumptions:
      "Diet, labor migration, and rainfall have been studied in Zambia for a long time. A single national cereal-yield number cannot stand in for maize in a district, for a household, or for a season.",
    notClaimed:
      "No claim is made that yield will rise or fall. No provincial production table is shown, because none has been ingested. Richards's Bemba study is not treated as a description of the whole country.",
    methodNote:
      "The shelf contributes Richards (1939), Gluckman on the Barotse plain (1941), and Brelsford on Bangweulu fisheries (1946). The numeric series is national cereal yield from the World Bank, retrieved 14 October 2026. Baseline error is reported. A forecast is not.",
    events: [],
    documents: ["richards-1939", "gluckman-1941", "brelsford-1946", "world-bank-zmb"],
  },
  {
    id: "public-finance",
    question: "What did earlier inquiries say about copper and the public finances, and what can a growth rate add?",
    categoryId: "expenditure",
    status: "baseline_only",
    assumptions:
      "Copper has dominated the formal economy since the late colonial period. National GDP growth and consumer-price inflation are different measurements. Neither is the copper price.",
    notClaimed:
      "No copper-price series is stored. No budget outturn is stored. No claim is made that a past crisis will recur.",
    methodNote:
      "The Pim report (1938) is the historical inquiry. Inflation and GDP growth are plotted as separate World Bank series. They are not combined on one axis. Baseline checks are arithmetic, not a model of the Zambian economy.",
    events: ["copperbelt-production"],
    documents: ["pim-1938", "roberts-1976", "ferguson-1999", "world-bank-zmb"],
  },
];
