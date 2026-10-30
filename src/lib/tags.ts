export const tagKinds = ["place", "sector", "entity"] as const;
export const tagActions = ["add", "remove", "withdraw"] as const;

export type TagKind = (typeof tagKinds)[number];
export type TagAction = (typeof tagActions)[number];

export interface AppliedTag {
  id: string;
  name: string;
  origin: "catalog" | "editor";
  removed: boolean;
  note: string | null;
  author: string | null;
}

export interface TagMark {
  action: "add" | "remove";
  targetId: string;
  name: string;
  note: string;
  author: string;
}

export function parseTagOverride(input: {
  kind?: string;
  action?: string;
  targetId?: string;
  note?: string;
}): { ok: true; kind: TagKind; action: TagAction; targetId: string; note: string } | { ok: false; error: string } {
  const kind = (input.kind ?? "").trim();
  const action = (input.action ?? "").trim();
  const targetId = (input.targetId ?? "").trim();
  const note = (input.note ?? "").replace(/\s+/g, " ").trim();
  if (!tagKinds.includes(kind as TagKind)) return { ok: false, error: "Choose a place, a sector, or an entity." };
  if (!tagActions.includes(action as TagAction)) return { ok: false, error: "Choose add, remove, or withdraw." };
  if (targetId.length < 2 || targetId.length > 80) return { ok: false, error: "Name the tag that already exists." };
  if (note.length < 12 || note.length > 400) return { ok: false, error: "Say why, in at least a sentence." };
  return { ok: true, kind: kind as TagKind, action: action as TagAction, targetId, note };
}

export function applyTags(catalog: { id: string; name: string }[], marks: TagMark[]): AppliedTag[] {
  const tags = new Map<string, AppliedTag>();
  for (const item of catalog) {
    tags.set(item.id, { id: item.id, name: item.name, origin: "catalog", removed: false, note: null, author: null });
  }
  for (const mark of marks) {
    if (mark.action === "remove") {
      const existing = tags.get(mark.targetId);
      if (!existing || existing.origin !== "catalog") continue;
      existing.removed = true;
      existing.note = mark.note;
      existing.author = mark.author;
      continue;
    }
    if (tags.has(mark.targetId)) continue;
    tags.set(mark.targetId, {
      id: mark.targetId,
      name: mark.name,
      origin: "editor",
      removed: false,
      note: mark.note,
      author: mark.author,
    });
  }
  return [...tags.values()];
}
