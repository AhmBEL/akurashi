"use client";

import { useState, useTransition } from "react";
import { sendMagicLinkAction } from "./actions";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await sendMagicLinkAction(email);
      if (result.error) {
        setError(result.error);
        setStatus("error");
      } else {
        setStatus("sent");
      }
    });
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 340 }}>
        <h1 style={{ fontSize: 22, marginBottom: 4 }}>Se connecter</h1>
        {status === "sent" ? (
          <p>Un lien de connexion vient d&rsquo;être envoyé à {email}. Ouvre-le pour continuer.</p>
        ) : (
          <>
            <input
              type="email"
              required
              placeholder="ton@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ padding: 12, borderRadius: 12, border: "1px solid #ccc" }}
            />
            <button type="submit" disabled={isPending} style={{ padding: 12, borderRadius: 12, cursor: "pointer" }}>
              {isPending ? "Envoi…" : "Recevoir un lien de connexion"}
            </button>
            {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
          </>
        )}
      </form>
    </div>
  );
}
