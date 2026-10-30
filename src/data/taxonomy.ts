export interface CategorySeed {
  id: string;
  name: string;
  parentId?: string;
  description: string;
  layout: string;
  position: number;
}

export const categories: CategorySeed[] = [
  {
    id: "politics",
    name: "Politics and governance",
    description: "The political history of Northern Rhodesia and Zambia: parties, constitutions, the colonial state, and the governments since 1964.",
    layout: "timeline",
    position: 1,
  },
  { id: "elections", name: "Elections", parentId: "politics", description: "Voting, franchises, and changes of government.", layout: "timeline", position: 1 },
  { id: "parties", name: "Parties and leadership", parentId: "politics", description: "UNIP, the independence movement, and later party change.", layout: "timeline", position: 2 },
  { id: "constitution", name: "Constitutions", parentId: "politics", description: "Orders, independence, and later constitutional instruments.", layout: "timeline", position: 3 },
  { id: "policy", name: "Public policy", parentId: "politics", description: "Commissions, budgets of inquiry, and stated government policy.", layout: "timeline", position: 4 },
  { id: "diplomacy", name: "Diplomacy", parentId: "politics", description: "Zambia's relations with other states, including the federation and its end.", layout: "timeline", position: 5 },
  {
    id: "environment",
    name: "Environment and climate",
    description: "Rivers, the Kariba resettlement, and the limits of what a national climate series can say.",
    layout: "catchment",
    position: 2,
  },
  { id: "water", name: "Rivers and water", parentId: "environment", description: "Zambezi, Kafue, Luangwa, Luapula, Bangweulu, and Kariba.", layout: "catchment", position: 1 },
  { id: "climate", name: "Climate", parentId: "environment", description: "Rainfall and drought only where a sourced series exists.", layout: "catchment", position: 2 },
  {
    id: "society",
    name: "Society and culture",
    description: "Ethnographies, urban life, language communities, and the institutions people actually lived in.",
    layout: "fieldnotes",
    position: 3,
  },
  { id: "heritage", name: "Heritage", parentId: "society", description: "Kingdoms, missions, museums, and the recorded past.", layout: "fieldnotes", position: 1 },
  { id: "labour", name: "Labour", parentId: "society", description: "Migration, mine compounds, and urban work.", layout: "fieldnotes", position: 2 },
  { id: "housing", name: "Towns and housing", parentId: "society", description: "Compounds, townships, and the making of the Copperbelt towns.", layout: "fieldnotes", position: 3 },
  { id: "religion", name: "Religion", parentId: "society", description: "Missions and churches where they enter the public record.", layout: "fieldnotes", position: 4 },
  { id: "traditional-authority", name: "Traditional authority", parentId: "society", description: "Lozi, Bemba, Kazembe, and other polities named in the sources.", layout: "fieldnotes", position: 5 },
  {
    id: "justice",
    name: "Crime, justice, and public safety",
    description: "Allegations, charges, and convictions are not the same thing. This shelf does not publish unidentified crime narratives.",
    layout: "safeguard",
    position: 4,
  },
  { id: "courts", name: "Courts", parentId: "justice", description: "Judgments and court records, only when a citable source is on the shelf.", layout: "safeguard", position: 1 },
  {
    id: "economy",
    name: "Economy and business",
    description: "Copper, public finance, and national series that say what they measure — and no more.",
    layout: "series",
    position: 5,
  },
  { id: "mining", name: "Copper and mining", parentId: "economy", description: "The Copperbelt, and mining elsewhere only when the place is named.", layout: "series", position: 1 },
  { id: "inflation", name: "Prices and inflation", parentId: "economy", description: "Sourced price series. Not a household budget.", layout: "series", position: 2 },
  { id: "expenditure", name: "Public finance", parentId: "economy", description: "Commissions and fiscal inquiries.", layout: "series", position: 3 },
  { id: "energy", name: "Energy", parentId: "economy", description: "Power, including the difference between access, generation, and load shedding.", layout: "series", position: 4 },
  {
    id: "health",
    name: "Health and medicine",
    description: "Public health only from identifiable studies. No unsourced outbreak claims.",
    layout: "safeguard",
    position: 6,
  },
  {
    id: "education",
    name: "Education and research",
    description: "Universities, the Rhodes-Livingstone Institute, and the research traditions that studied Zambia.",
    layout: "institutions",
    position: 7,
  },
  {
    id: "agriculture",
    name: "Agriculture and food",
    description: "Farming, fisheries, diet, and the difference between yield and food security.",
    layout: "season",
    position: 8,
  },
  {
    id: "law",
    name: "Law and human rights",
    description: "Orders, constitutions, and statutes catalogued as instruments. Articles are not reproduced here.",
    layout: "docket",
    position: 9,
  },
  {
    id: "infrastructure",
    name: "Infrastructure and energy",
    description: "The line of rail, the falls bridge, Kariba, and the towns the railway made.",
    layout: "route",
    position: 10,
  },
  {
    id: "science",
    name: "Science and research institutions",
    description: "The Rhodes-Livingstone tradition and later Zambian research institutions.",
    layout: "chronology",
    position: 11,
  },
];
