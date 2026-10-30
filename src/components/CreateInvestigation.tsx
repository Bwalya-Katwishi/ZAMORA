"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateInvestigation() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");

  return (
    <form
      className="ruled"
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        const response = await fetch("/api/investigations", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title, question }),
        });
        const payload = (await response.json()) as { id?: string; error?: string };
        if (!response.ok || !payload.id) {
          setError(payload.error ?? "The desk did not open.");
          return;
        }
        router.push(`/desk/${payload.id}`);
      }}
    >
      <label htmlFor="desk-title">Working title</label>
      <input id="desk-title" value={title} onChange={(event) => setTitle(event.target.value)} required minLength={3} />
      <label htmlFor="desk-question">The question, limited to Zambia</label>
      <textarea id="desk-question" value={question} onChange={(event) => setQuestion(event.target.value)} required minLength={8} />
      <button className="solid" type="submit" style={{ marginTop: "0.7rem" }}>Open a desk</button>
      {error ? <p>{error}</p> : null}
    </form>
  );
}
