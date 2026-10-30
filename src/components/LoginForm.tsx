"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  return (
    <button
      type="button"
      className="text-button"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/";
      }}
    >
      Leave the desk
    </button>
  );
}

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");

  return (
    <form
      className="ruled"
      style={{ maxWidth: "28rem" }}
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setError("");
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
        });
        const payload = (await response.json()) as { error?: string };
        if (!response.ok) {
          setError(payload.error ?? "Sign-in failed.");
          return;
        }
        router.push("/desk/files");
        router.refresh();
      }}
    >
      <label htmlFor="email">Desk address</label>
      <input id="email" name="email" type="email" autoComplete="username" required />
      <label htmlFor="password">Password</label>
      <input id="password" name="password" type="password" autoComplete="current-password" required />
      <button className="solid" type="submit" style={{ marginTop: "0.8rem" }}>Enter the desk</button>
      {error ? <p>{error}</p> : null}
    </form>
  );
}
