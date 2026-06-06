"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, LogIn } from "lucide-react";
import { VapiAuthShell, VapiAuthHeading, VapiAuthAlert, VapiAuthField, vapiInputCls } from "@/components/VapiAuthShell";
import { getSafeRedirect } from "@/lib/safeRedirect";

function getCookie(name: string): string | null {
  const parts = document.cookie.split(";").map((entry) => entry.trim());
  const found = parts.find((entry) => entry.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [redirectTo, setRedirectTo] = useState("/settings");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSessionExpired(params.get("reason") === "session-expired");
    const emailParam = params.get("email");
    if (emailParam) setEmail(emailParam.trim().toLowerCase());
    setRedirectTo(getSafeRedirect(params.get("redirect")));
    void fetch("/api/auth/csrf", { credentials: "include" });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const csrfToken = getCookie("csrf-token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (csrfToken) headers["x-csrf-token"] = csrfToken;

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      router.push(redirectTo);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <VapiAuthShell>
      <VapiAuthHeading title="Welcome back" subtitle="Sign in to your hotel admin panel" />

      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? <VapiAuthAlert>{error}</VapiAuthAlert> : null}
        {sessionExpired && !error ? (
          <VapiAuthAlert variant="warning">Session expired, please sign in again.</VapiAuthAlert>
        ) : null}

        <VapiAuthField label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            maxLength={254}
            className={vapiInputCls}
            placeholder="hotel@example.com"
          />
        </VapiAuthField>

        <VapiAuthField label="Password">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            minLength={8}
            maxLength={128}
            className={vapiInputCls}
            placeholder="Enter your password"
          />
        </VapiAuthField>

        <button type="submit" disabled={loading} className="vapi-btn-ember w-full justify-center disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-mute">
        Don&apos;t have an account?{" "}
        <Link
          href={`/admin/register?email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(redirectTo)}`}
          className="text-mint-pulse hover:underline underline-offset-4"
        >
          Register your hotel
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-zinc-mute">
        <Link href="/admin/forgot-password" className="text-mint-pulse hover:underline underline-offset-4">
          Forgot password?
        </Link>
      </p>
    </VapiAuthShell>
  );
}
