"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Mail } from "lucide-react";
import { VapiAuthShell, VapiAuthHeading, VapiAuthAlert, VapiAuthField, vapiInputCls } from "@/components/VapiAuthShell";

function getCookie(name: string): string | null {
  const parts = document.cookie.split(";").map((entry) => entry.trim());
  const found = parts.find((entry) => entry.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/auth/csrf", { credentials: "include" });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const csrfToken = getCookie("csrf-token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (csrfToken) headers["x-csrf-token"] = csrfToken;

      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Request failed");
        return;
      }
      setMessage(data.message || "If an account exists, reset instructions were sent.");
    } catch {
      setError("Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <VapiAuthShell>
      <VapiAuthHeading
        title="Reset password"
        subtitle="Enter your admin email to receive a reset link."
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? <VapiAuthAlert>{error}</VapiAuthAlert> : null}
        {message ? <VapiAuthAlert variant="success">{message}</VapiAuthAlert> : null}

        <VapiAuthField label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            maxLength={254}
            required
            className={vapiInputCls}
            placeholder="hotel@example.com"
          />
        </VapiAuthField>

        <button type="submit" disabled={loading} className="vapi-btn-ember w-full justify-center disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-mute">
        Back to{" "}
        <Link href="/admin/login" className="text-mint-pulse hover:underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </VapiAuthShell>
  );
}
