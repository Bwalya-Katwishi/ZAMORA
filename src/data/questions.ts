export interface ResearchQuestion {
  id: string;
  sector: string;
  question: string;
  held: string;
  notHeld: string;
}

/** Questions the current shelf can open. Each one names what is absent as well as what is held. */
export const researchQuestions: ResearchQuestion[] = [
  {
    id: "copperbelt",
    sector: "Mining",
    question: "What labor, community, and environmental record does this shelf already hold for the Copperbelt?",
    held: "Urban studies and labor histories from the 1930s through Ferguson, plus the one comparative Katanga book, which stays out of the default search.",
    notHeld: "A current environmental notice, a mining cadastre, or a rainfall series for a pit.",
  },
  {
    id: "kariba",
    sector: "Water and energy",
    question: "What was published on the Gwembe resettlement, and what does that literature not establish about a later project?",
    held: "Scudder, Colson, and the distinction between the valley and the Plateau Tonga.",
    notHeld: "A generation series, a load-shedding calendar, or a forecast of the next shortage.",
  },
  {
    id: "series",
    sector: "Prices and agriculture",
    question: "What do the stored national series say, and which food-security claims do they refuse?",
    held: "World Bank series for Zambia: inflation, real GDP growth, cereal yield, and electricity access, each with a caveat.",
    notHeld: "A district maize price, a fertilizer price, or a yield forecast.",
  },
  {
    id: "constitution",
    sector: "Governance",
    question: "Which constitutional instruments are noted here, and which dates are still only a year?",
    held: "The 1911 Order in Council, the 1963 dissolution instrument, independence in 1964, the 2016 amendment, and a 2026 index of six National Assembly sittings plus a handful of ZambiaLII judgments, one Act, one energy notice, and one gazette issue.",
    notHeld: "The text of those sittings or judgments, an OCR transcript, a budget line, or a prediction about the next election.",
  },
];
