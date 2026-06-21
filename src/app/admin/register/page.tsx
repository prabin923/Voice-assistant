"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, UserPlus } from "lucide-react";
import { VapiAuthShell, VapiAuthHeading, VapiAuthAlert, VapiAuthField, vapiInputCls } from "@/components/VapiAuthShell";
import { getSafeRedirect } from "@/lib/safeRedirect";

function getCookie(name: string): string | null {
  const parts = document.cookie.split(";").map((entry) => entry.trim());
  const found = parts.find((entry) => entry.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirectTo, setRedirectTo] = useState("/onboarding");
  const [inviteToken, setInviteToken] = useState("");
  const [hasInvite, setHasInvite] = useState(false);

  useEffect(() => {
    void fetch("/api/auth/csrf", { credentials: "include" });
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");
    if (emailParam) setEmail(emailParam.trim().toLowerCase());
    setRedirectTo(getSafeRedirect(params.get("redirect")));
    const invite = params.get("invite");
    if (invite) { setInviteToken(invite); setHasInvite(true); }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const csrfToken = getCookie("csrf-token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (csrfToken) headers["x-csrf-token"] = csrfToken;

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          ...(inviteToken ? { inviteToken } : {}),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      router.push(redirectTo);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <VapiAuthShell>
      <VapiAuthHeading title="Create account" subtitle="Register your hotel to get started" />

      <form onSubmit={handleSubmit} className="space-y-4">
        {hasInvite && !error && (
          <div className="rounded-[5.6px] border border-mint-pulse/30 bg-mint-pulse/10 px-4 py-3 text-sm text-mint-pulse">
            You&apos;ve been invited — create your hotel account below.
          </div>
        )}
        {error ? <VapiAuthAlert>{error}</VapiAuthAlert> : null}

        <VapiAuthField label="Hotel name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={vapiInputCls}
            placeholder="The Grand Hotel"
          />
        </VapiAuthField>

        <VapiAuthField label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={vapiInputCls}
            placeholder="admin@grandhotel.com"
          />
        </VapiAuthField>

        <VapiAuthField label="Password">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={vapiInputCls}
            placeholder="Min. 8 characters"
          />
        </VapiAuthField>

        <VapiAuthField label="Confirm password">
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className={vapiInputCls}
            placeholder="Repeat your password"
          />
        </VapiAuthField>

        <button type="submit" disabled={loading} className="vapi-btn-mint w-full justify-center disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-mute">
        Already have an account?{" "}
        <Link
          href={`/admin/login?email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(redirectTo)}`}
          className="text-mint-pulse hover:underline underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </VapiAuthShell>
  );
}
