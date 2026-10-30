"use client";

import { useState } from "react";
import { formatCitation, type CitationStyle } from "@/lib/citations";
import type { CitationInput } from "@/lib/citations";

export function CitationBar({ source }: { source: CitationInput }) {
  const [style, setStyle] = useState<CitationStyle>("chicago");
  const [copied, setCopied] = useState(false);
  const text = formatCitation(source, style);
  return (
    <div className="margin-note">
      <h2>Citation</h2>
      <div style={{ display: "flex", gap: "0.8rem", marginBottom: "0.4rem" }}>
        {(["chicago", "apa", "harvard"] as const).map((item) => (
          <button key={item} type="button" className="text-button" aria-pressed={style === item} onClick={() => setStyle(item)}>
            {item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>
      <p style={{ margin: "0 0 0.5rem" }}>{text}</p>
      <button
        type="button"
        className="text-button"
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          setCopied(true);
        }}
      >
        {copied ? "Copied" : "Copy citation"}
      </button>
    </div>
  );
}
