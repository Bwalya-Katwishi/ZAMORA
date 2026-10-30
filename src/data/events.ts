export interface EventSeed {
  id: string;
  title: string;
  summary: string;
  startYear?: number;
  endYear?: number;
  startOn?: string;
  dateNote: string;
  placeId?: string;
}

export const events: EventSeed[] = [
  {
    id: "mosi-oa-tunya-1855",
    title: "Livingstone reaches Mosi-oa-Tunya",
    summary:
      "David Livingstone's party reached the falls on the Zambezi in November 1855. He published the journey in Missionary Travels (1857) and gave the falls the English name Victoria Falls. The falls are shared with present-day Zimbabwe.",
    startYear: 1855,
    dateNote: "Month-level date from the published narrative. The day is not fixed in this record.",
    placeId: "mosi-oa-tunya",
  },
  {
    id: "falls-bridge-1905",
    title: "Rail bridge at Mosi-oa-Tunya",
    summary:
      "A railway bridge was built across the Zambezi gorge at the falls in 1905, carrying the line north toward the territory that became Zambia. A photograph in Stead's Review is dated November 1905.",
    startYear: 1905,
    dateNote: "The photograph is dated November 1905. This record does not store a separate opening-day citation.",
    placeId: "mosi-oa-tunya",
  },
  {
    id: "rail-kabwe-1906",
    title: "The railway reaches Broken Hill",
    summary:
      "The line from the south reached Broken Hill, now Kabwe, in 1906, after the Kafue railway bridge. The town's early traffic was lead and zinc, not Copperbelt copper.",
    startYear: 1906,
    dateNote: "Year-level. The month is not stored.",
    placeId: "kabwe",
  },
  {
    id: "northern-rhodesia-1911",
    title: "Northern Rhodesia is constituted",
    summary:
      "The Northern Rhodesia Order in Council, 1911, joined Barotziland–North-Western Rhodesia and North-Eastern Rhodesia. The territory took the name Northern Rhodesia.",
    startYear: 1911,
    dateNote: "Year of the Order in Council. The day is not stored, because this shelf does not hold a verified transcript.",
    placeId: "northern-rhodesia",
  },
  {
    id: "protectorate-1924",
    title: "Colonial Office takes over the administration",
    summary:
      "On 1 April 1924 the British government took over the administration of Northern Rhodesia from the British South Africa Company. Livingstone remained the capital. The Company kept mineral rights.",
    startYear: 1924,
    startOn: "1924-04-01",
    dateNote: "1 April 1924 is the standard date of the transfer. Herbert Stanley was appointed governor.",
    placeId: "livingstone",
  },
  {
    id: "copperbelt-production",
    title: "Industrial copper on the Copperbelt",
    summary:
      "Large-scale copper mining at towns such as Luanshya, Kitwe, Nchanga, and Mufulira expanded at the end of the 1920s. This entry marks that shift. It is not an opening date for a single mine.",
    startYear: 1928,
    endYear: 1933,
    dateNote: "A period, not a day. Individual mine dates are left to the studies on the shelf.",
    placeId: "copperbelt",
  },
  {
    id: "capital-lusaka-1935",
    title: "The capital moves to Lusaka",
    summary:
      "The capital of Northern Rhodesia moved from Livingstone to Lusaka in 1935. Lusaka was a railway town chosen for a more central position.",
    startYear: 1935,
    dateNote: "Year-level. The day of the formal transfer is not stored.",
    placeId: "lusaka-city",
  },
  {
    id: "copperbelt-strike-1935",
    title: "African mineworkers' strike on the Copperbelt",
    summary:
      "African mineworkers struck on the Copperbelt in 1935. The stoppage is part of the standard labor history and is treated in the Copperbelt studies on this shelf. This entry does not state a casualty figure.",
    startYear: 1935,
    dateNote: "Year-level. Not the only colonial-era stoppage. Days, camps, and deaths are left to the specialist studies and are not repeated here.",
    placeId: "copperbelt",
  },
  {
    id: "rli-1937",
    title: "Rhodes-Livingstone Institute founded",
    summary:
      "The Rhodes-Livingstone Institute was founded in 1937, with Godfrey Wilson as its first director. It began in Livingstone and later moved toward Lusaka. It is the ancestor of the social-research institute at the University of Zambia.",
    startYear: 1937,
    dateNote: "Founding year 1937. A memorial museum in Livingstone is traced by institutional histories to 1934 and was later renamed the Livingstone Museum; that is a related institution, not the same event.",
    placeId: "livingstone",
  },
  {
    id: "kariba",
    title: "Kariba Dam and the Gwembe resettlement",
    summary:
      "Kariba Dam was built on the Zambezi in the late 1950s, and Gwembe Tonga communities were resettled to make way for the lake. The dam and the reservoir are shared with Zimbabwe. Elizabeth Colson and Thayer Scudder documented the social and ecological consequences.",
    startYear: 1955,
    endYear: 1971,
    dateNote: "A period covering construction, resettlement, and the later published studies. No single closure day is stored.",
    placeId: "kariba",
  },
  {
    id: "federation-1953",
    title: "Federation of Rhodesia and Nyasaland",
    summary:
      "Northern Rhodesia, Southern Rhodesia, and Nyasaland were joined in the Federation of Rhodesia and Nyasaland in 1953. Northern Rhodesian opposition to the federation is a central political fact of the decade.",
    startYear: 1953,
    endYear: 1963,
    dateNote: "Established in 1953. The day is not stored. Dissolution is a separate event.",
    placeId: "northern-rhodesia",
  },
  {
    id: "federation-end",
    title: "The federation is dissolved",
    summary:
      "The Federation of Rhodesia and Nyasaland (Dissolution) Order in Council 1963 dissolved the federation immediately before 1 January 1964. Northern Rhodesia remained a separate territory until independence later that year.",
    startYear: 1963,
    endYear: 1964,
    dateNote: "The Order provides for dissolution immediately before 1 January 1964.",
    placeId: "northern-rhodesia",
  },
  {
    id: "independence-1964",
    title: "Independence",
    summary:
      "Northern Rhodesia became the independent Republic of Zambia on 24 October 1964. Kenneth Kaunda took office as president, leading the United National Independence Party.",
    startYear: 1964,
    startOn: "1964-10-24",
    dateNote: "24 October 1964. A conflicting 23 October date appears in some summaries; this record follows 24 October.",
    placeId: "lusaka-city",
  },
  {
    id: "one-party-1973",
    title: "The one-party Second Republic",
    summary:
      "Zambia's one-party constitution of the Second Republic is dated here to 1973. The legal text is not stored. This entry is a chronological marker, not a citation of an article.",
    startYear: 1973,
    dateNote: "Year-level marker for the 1973 constitution. The preparatory politics began earlier. Do not cite this entry as the text of the law.",
    placeId: "lusaka-city",
  },
  {
    id: "election-1991",
    title: "Multiparty elections",
    summary:
      "Elections in 1991 ended UNIP's long tenure. Frederick Chiluba and the Movement for Multiparty Democracy succeeded Kenneth Kaunda. No election study is on this shelf yet.",
    startYear: 1991,
    dateNote: "The day most often cited is 31 October 1991. Confirm it against an official return before publishing the day. ZAMORA keeps the year as the firm part of the record.",
    placeId: "zambia",
  },
  {
    id: "muchinga-2011",
    title: "Muchinga Province is created",
    summary:
      "Muchinga Province was created in 2011, with its capital at Chinsali, from territory previously administered in Northern and Eastern provinces.",
    startYear: 2011,
    dateNote: "Year-level. Earlier documents about Chinsali will not say Muchinga.",
    placeId: "muchinga",
  },
];
