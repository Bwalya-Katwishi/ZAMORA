import { outsideZambiaQuery } from "@/lib/search";

export type RefusalCode =
  | "outside_zambia"
  | "named_accusation"
  | "certain_forecast"
  | "individual_health"
  | "embedded_instruction";

export interface PolicyDecision {
  allowed: boolean;
  code: RefusalCode | "allowed";
  message: string;
}

const allowed: PolicyDecision = { allowed: true, code: "allowed", message: "" };

function refuse(code: RefusalCode, message: string): PolicyDecision {
  return { allowed: false, code, message };
}

const INSTRUCTION =
  /\b(ignore (all |any |the )?(previous |prior |above )?instructions|disregard the rules|you are now|system prompt)\b/i;

const ACCUSATION =
  /\b(who (killed|murdered|raped|assaulted)|name the (killer|suspect|rapist|culprit)|find the (killer|suspect)|is [a-z].{0,60} guilty)\b/i;

const CERTAIN =
  /\b(will definitely|certain to happen|guarantee that|who will win|exact probability|predict with certainty)\b/i;

const CLINICAL =
  /\b(diagnose this|patient('s)? (name|record|file)|does [a-z].{0,50} have (hiv|cholera|tuberculosis|malaria))\b/i;

const OUTSIDE_PHRASE =
  /\b(kenya|nigeria|south africa|zimbabwe|malawi|tanzania|angola|botswana|namibia|mozambique|congo|britain|united kingdom|united states|china|india|europe)\b/i;

const ZAMBIA =
  /\b(zambia|zambian|northern rhodesia|barotseland|copperbelt|lusaka|luapula|muchinga|kafue|zambezi|kariba|gwembe|bemba|tonga|lozi|kaunda)\b/i;

export function assessQuestion(text: string): PolicyDecision {
  const value = text.replace(/\s+/g, " ").trim();
  if (!value) return allowed;
  if (INSTRUCTION.test(value)) {
    return refuse(
      "embedded_instruction",
      "Instructions inside a question, or inside a source, are not obeyed. Ask for a record instead.",
    );
  }
  if (ACCUSATION.test(value)) {
    return refuse(
      "named_accusation",
      "This shelf will not name a suspect or decide guilt. Search judgments, charges, and outcomes as published.",
    );
  }
  if (CLINICAL.test(value)) {
    return refuse(
      "individual_health",
      "Individual health records and diagnoses are out of scope. Outbreak context has to come from a published bulletin.",
    );
  }
  if (CERTAIN.test(value)) {
    return refuse(
      "certain_forecast",
      "The shelf does not issue a certain forecast. Ask what the recorded series can and cannot support.",
    );
  }
  if ((OUTSIDE_PHRASE.test(value) || outsideZambiaQuery(value)) && !ZAMBIA.test(value)) {
    return refuse(
      "outside_zambia",
      "That question names a place outside Zambia. Ask a Zambian question. Comparative material is included only when Zambia is also named, and only when you ask for it.",
    );
  }
  return allowed;
}

export function asksForComparative(text: string): boolean {
  const value = text.replace(/\s+/g, " ").trim();
  if (!value) return false;
  return ZAMBIA.test(value) && (OUTSIDE_PHRASE.test(value) || outsideZambiaQuery(value));
}

export interface LicenseRow {
  rights: string;
  count: number;
  accessions: string[];
}

export function licenseLog(documents: { accession: string; rights: string }[]): LicenseRow[] {
  const groups = new Map<string, string[]>();
  for (const document of documents) {
    const rights = document.rights.trim();
    const accessions = groups.get(rights) ?? [];
    accessions.push(document.accession);
    groups.set(rights, accessions);
  }
  return [...groups.entries()]
    .map(([rights, accessions]) => ({ rights, count: accessions.length, accessions }))
    .sort((left, right) => right.count - left.count || left.rights.localeCompare(right.rights));
}
