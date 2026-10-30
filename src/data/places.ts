import { districts } from "./districts";

export type PlaceKind = "country" | "province" | "district" | "town" | "historical_region" | "water" | "landmark";

export interface PlaceSeed {
  id: string;
  name: string;
  kind: PlaceKind;
  parentId?: string;
  latitude?: number;
  longitude?: number;
  validFrom?: number;
  validTo?: number;
  note: string;
  aliases?: string[];
  plate?: string;
}

const authoredPlaces: PlaceSeed[] = [
  {
    id: "zambia",
    name: "Zambia",
    kind: "country",
    latitude: -13.13,
    longitude: 27.85,
    note: "The Republic of Zambia, independent on 24 October 1964. The catalog also covers the territory that became it.",
    aliases: ["Republic of Zambia", "Northern Rhodesia"],
  },
  {
    id: "western",
    name: "Western",
    kind: "province",
    parentId: "zambia",
    note: "Provincial capital Mongu. The modern province covers the Zambezi floodplain long called Barotseland.",
    plate:
      "The Zambezi floodplain and the Lozi kingdom. Colonial sources say Barotseland, or Barotziland, more often than Western Province. Mongu is the provincial capital.",
  },
  {
    id: "southern",
    name: "Southern",
    kind: "province",
    parentId: "zambia",
    note: "Provincial capital Choma. Livingstone was the territorial capital until 1935.",
    plate:
      "The Tonga plateau, the Gwembe Valley, Kariba, and Mosi-oa-Tunya. Livingstone was the territorial capital until 1935. Choma is the provincial capital now. The falls and Lake Kariba are shared with Zimbabwe; ZAMORA follows the Zambian side and says when a source crosses the river.",
  },
  {
    id: "lusaka",
    name: "Lusaka",
    kind: "province",
    parentId: "zambia",
    note: "The national capital sits in this province. Lusaka became the capital in 1935.",
    plate:
      "A small province around the national capital. Lusaka replaced Livingstone as capital in 1935 and grew on the line of rail. The Kafue Flats lie to the south.",
  },
  {
    id: "central",
    name: "Central",
    kind: "province",
    parentId: "zambia",
    note: "Provincial capital Kabwe, formerly Broken Hill, a lead and zinc town on the railway.",
    plate:
      "Kabwe, formerly Broken Hill, grew on lead and zinc and on the railway, not on copper. The province sits between Lusaka and the Copperbelt.",
  },
  {
    id: "copperbelt",
    name: "Copperbelt",
    kind: "province",
    parentId: "zambia",
    note: "Provincial capital Ndola. The historic copper-mining towns are not the same geography as the newer North-Western mines.",
    plate:
      "Ndola, Kitwe, Luanshya, Mufulira, Chingola. Industrial copper mining expanded here at the end of the 1920s. This is the field of the urban studies and the labor histories on this shelf.",
  },
  {
    id: "north-western",
    name: "North-Western",
    kind: "province",
    parentId: "zambia",
    note: "Provincial capital Solwezi. Distinct from the historic Copperbelt.",
    plate:
      "Solwezi is the capital. The older ethnographic record includes the Ndembu of Mwinilunga. Copper mined in this province in the twenty-first century is not the historic Copperbelt, and the catalog does not treat the two as one place.",
  },
  {
    id: "luapula",
    name: "Luapula",
    kind: "province",
    parentId: "zambia",
    note: "Provincial capital Mansa, formerly Fort Rosebery. The Congo Pedicle separates much of the province from the rest of Zambia by road.",
    plate:
      "Mansa was Fort Rosebery. The province is shaped by the Luapula River, Lake Mweru, and the Bangweulu swamps. A tongue of Congolese territory, the Congo Pedicle, lies between Luapula and the Copperbelt. Kazembe's kingdom is the deep political history.",
  },
  {
    id: "northern",
    name: "Northern",
    kind: "province",
    parentId: "zambia",
    note: "Provincial capital Kasama. Before 2011 the administrative province was larger than the area on this map.",
    plate:
      "Kasama is the capital. Bemba polities and the plateau toward Lake Tanganyika belong to this history. Mbala was Abercorn. Colonial files that say Northern Province often cover country that is now Muchinga as well.",
  },
  {
    id: "muchinga",
    name: "Muchinga",
    kind: "province",
    parentId: "zambia",
    validFrom: 2011,
    note: "Created in 2011. Capital Chinsali. Earlier sources file this country under Northern or Eastern Province.",
    plate:
      "Chinsali is the capital. The province was created in 2011, so sources from before then will not use the name. Kenneth Kaunda was born at Lubwa mission, Chinsali, in 1924.",
  },
  {
    id: "eastern",
    name: "Eastern",
    kind: "province",
    parentId: "zambia",
    note: "Provincial capital Chipata, formerly Fort Jameson, the old center of North-Eastern Rhodesia.",
    plate:
      "Chipata was Fort Jameson, the center of North-Eastern Rhodesia. Ngoni and Chewa histories meet the plateau here, toward Malawi. The map shows the modern province, not the colonial boundary.",
  },
  {
    id: "northern-rhodesia",
    name: "Northern Rhodesia",
    kind: "historical_region",
    parentId: "zambia",
    validFrom: 1911,
    validTo: 1964,
    note: "British protectorate formed in 1911 and independent, as Zambia, on 24 October 1964.",
    aliases: ["Northern Rhodesia"],
  },
  {
    id: "barotseland",
    name: "Barotseland",
    kind: "historical_region",
    parentId: "zambia",
    note: "The Lozi kingdom and its floodplain, now largely Western Province. The name is historical and political, not a current province.",
  },
  {
    id: "north-eastern-rhodesia",
    name: "North-Eastern Rhodesia",
    kind: "historical_region",
    parentId: "zambia",
    validTo: 1911,
    note: "A British South Africa Company territory joined with Barotziland–North-Western Rhodesia to form Northern Rhodesia in 1911.",
  },
  {
    id: "north-western-rhodesia",
    name: "Barotziland–North-Western Rhodesia",
    kind: "historical_region",
    parentId: "zambia",
    validTo: 1911,
    note: "Company territory west of the 1911 amalgamation. Not the same unit as today's North-Western Province.",
    aliases: ["North-Western Rhodesia"],
  },
  {
    id: "lusaka-city",
    name: "Lusaka",
    kind: "town",
    parentId: "lusaka",
    latitude: -15.387,
    longitude: 28.323,
    note: "Approximate town center. National capital since 1935.",
  },
  {
    id: "livingstone",
    name: "Livingstone",
    kind: "town",
    parentId: "southern",
    latitude: -17.842,
    longitude: 25.854,
    note: "Approximate town center. Territorial capital until 1935, near Mosi-oa-Tunya.",
  },
  {
    id: "kabwe",
    name: "Kabwe",
    kind: "town",
    parentId: "central",
    latitude: -14.446,
    longitude: 28.447,
    note: "Approximate town center. Formerly Broken Hill, a lead and zinc railway town.",
    aliases: ["Broken Hill"],
  },
  {
    id: "ndola",
    name: "Ndola",
    kind: "town",
    parentId: "copperbelt",
    latitude: -12.969,
    longitude: 28.637,
    note: "Approximate town center. Provincial capital of the Copperbelt.",
  },
  {
    id: "kitwe",
    name: "Kitwe",
    kind: "town",
    parentId: "copperbelt",
    latitude: -12.802,
    longitude: 28.213,
    note: "Approximate town center. The Nkana mine is at Kitwe.",
    aliases: ["Nkana"],
  },
  {
    id: "luanshya",
    name: "Luanshya",
    kind: "town",
    parentId: "copperbelt",
    latitude: -13.137,
    longitude: 28.417,
    note: "Approximate town center. Roan Antelope mine. Field site for several urban studies on this shelf.",
  },
  {
    id: "choma",
    name: "Choma",
    kind: "town",
    parentId: "southern",
    latitude: -16.809,
    longitude: 26.987,
    note: "Approximate town center. Provincial capital of Southern Province.",
  },
  {
    id: "chipata",
    name: "Chipata",
    kind: "town",
    parentId: "eastern",
    latitude: -13.633,
    longitude: 32.65,
    note: "Approximate town center. Formerly Fort Jameson.",
    aliases: ["Fort Jameson"],
  },
  {
    id: "mongu",
    name: "Mongu",
    kind: "town",
    parentId: "western",
    latitude: -15.248,
    longitude: 23.127,
    note: "Approximate town center. Provincial capital on the Barotse floodplain.",
  },
  {
    id: "kasama",
    name: "Kasama",
    kind: "town",
    parentId: "northern",
    latitude: -10.213,
    longitude: 31.181,
    note: "Approximate town center. Provincial capital of Northern Province.",
  },
  {
    id: "mansa",
    name: "Mansa",
    kind: "town",
    parentId: "luapula",
    latitude: -11.2,
    longitude: 28.894,
    note: "Approximate town center. Formerly Fort Rosebery.",
    aliases: ["Fort Rosebery"],
  },
  {
    id: "solwezi",
    name: "Solwezi",
    kind: "town",
    parentId: "north-western",
    latitude: -12.169,
    longitude: 26.389,
    note: "Approximate town center. Provincial capital of North-Western Province.",
  },
  {
    id: "chinsali",
    name: "Chinsali",
    kind: "town",
    parentId: "muchinga",
    latitude: -10.55,
    longitude: 32.082,
    note: "Approximate town center. Capital of Muchinga. Lubwa mission is in this district.",
  },
  {
    id: "mazabuka",
    name: "Mazabuka",
    kind: "town",
    parentId: "southern",
    latitude: -15.856,
    longitude: 27.748,
    note: "Approximate town center on the line of rail.",
  },
  {
    id: "kapiri-mposhi",
    name: "Kapiri Mposhi",
    kind: "town",
    parentId: "central",
    latitude: -13.971,
    longitude: 28.67,
    note: "Approximate town center. Railway junction north of Kabwe.",
  },
  {
    id: "mbala",
    name: "Mbala",
    kind: "town",
    parentId: "northern",
    latitude: -8.84,
    longitude: 31.37,
    note: "Approximate town center near the Tanzanian border. Formerly Abercorn.",
    aliases: ["Abercorn"],
  },
  {
    id: "zambezi",
    name: "Zambezi",
    kind: "water",
    parentId: "zambia",
    note: "The river forms much of Zambia's southern border and crosses Western Province. Shared, downstream, with Zimbabwe and Mozambique.",
  },
  {
    id: "kafue",
    name: "Kafue",
    kind: "water",
    parentId: "zambia",
    note: "A major Zambezi tributary, rising in the north-west and crossing the flats south of Lusaka.",
  },
  {
    id: "luangwa",
    name: "Luangwa",
    kind: "water",
    parentId: "zambia",
    note: "Drains the eastern plateau into the Zambezi.",
  },
  {
    id: "bangweulu",
    name: "Bangweulu",
    kind: "water",
    parentId: "zambia",
    note: "Swamps and lake on the Luapula–Northern borderlands.",
  },
  {
    id: "kariba",
    name: "Kariba",
    kind: "water",
    parentId: "zambia",
    note: "The reservoir behind Kariba Dam. The lake and the dam are shared with Zimbabwe.",
  },
  {
    id: "mosi-oa-tunya",
    name: "Mosi-oa-Tunya",
    kind: "landmark",
    parentId: "southern",
    latitude: -17.924,
    longitude: 25.857,
    note: "Victoria Falls, on the Zambezi, shared with Zimbabwe. Livingstone's published name for the falls is Victoria Falls; Mosi-oa-Tunya is the name used here.",
    aliases: ["Victoria Falls"],
  },
];

export const places: PlaceSeed[] = [...authoredPlaces, ...districts];

export const railTownIds = [
  "livingstone",
  "choma",
  "mazabuka",
  "lusaka-city",
  "kabwe",
  "kapiri-mposhi",
  "ndola",
  "kitwe",
] as const;
