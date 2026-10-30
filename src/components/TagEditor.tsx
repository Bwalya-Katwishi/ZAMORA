const messages: Record<string, string> = {
  saved: "The override is stored beside the catalog tag.",
  withdrawn: "The editor mark is withdrawn. The catalog tag remains.",
  already: "That tag is already on the catalog record.",
  missing: "That tag is not on this record.",
  target: "That name is not in the gazetteer, the sector index, or the entity list.",
  note: "Say why, in at least a sentence.",
  editors: "Editors only.",
};

export function TagEditor({
  documentId,
  message,
  options,
}: {
  documentId: string;
  message?: string;
  options: { id: string; name: string; kind: string }[];
}) {
  return (
    <form action={`/api/documents/${documentId}/tags`} method="post" className="ruled">
      <p className="kicker">Editor override</p>
      <p>Add or remove a place, a sector, or an entity that already exists. The publication year stays the year on the record.</p>
      {message ? <p>{messages[message] ?? "The override was not stored."}</p> : null}
      <label>Kind
        <select name="kind" defaultValue="place">
          <option value="place">Place</option>
          <option value="sector">Sector</option>
          <option value="entity">Entity</option>
        </select>
      </label>
      <label>Action
        <select name="action" defaultValue="add">
          <option value="add">Add</option>
          <option value="remove">Remove a catalog tag</option>
          <option value="withdraw">Withdraw an editor mark</option>
        </select>
      </label>
      <label>Existing tag
        <input name="targetId" list="tag-targets" required placeholder="Id or exact name" />
      </label>
      <datalist id="tag-targets">
        {options.map((option) => <option key={`${option.kind}-${option.id}`} value={option.id}>{option.name}</option>)}
      </datalist>
      <label>Why
        <textarea name="note" required minLength={12} maxLength={400} placeholder="Why this tag changes" />
      </label>
      <button className="solid" type="submit">Store the override</button>
    </form>
  );
}
