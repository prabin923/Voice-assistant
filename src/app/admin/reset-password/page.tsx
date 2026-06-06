"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, Lock } from "lucide-react";
import { VapiAuthShell, VapiAuthHeading, VapiAuthAlert, VapiAuthField, vapiInputCls } from "@/components/VapiAuthShell";

function getCookie(name: string): string | null {
  const parts = document.cookie.split(";").map((entry) => entry.trim());
  const found = parts.find((entry) => entry.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const token = searchParams.get("token") || "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Invalid reset link");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const csrfToken = getCookie("csrf-token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (csrfToken) headers["x-csrf-token"] = csrfToken;

      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Reset failed");
        return;
      }
      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
    } catch {
      setError("Reset failed");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="space-y-5">
        <VapiAuthAlert variant="success">
          <span className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            Password updated successfully. Please sign in with your new password.
          </span>
        </VapiAuthAlert>
        <Link href="/admin/login" className="vapi-btn-mint w-full justify-center">
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <VapiAuthHeading title="Set new password" subtitle="Choose a strong password for your admin account." />

      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? <VapiAuthAlert>{error}</VapiAuthAlert> : null}

        <VapiAuthField label="New password">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            required
            className={vapiInputCls}
            placeholder="At least 8 characters"
          />
        </VapiAuthField>

        <VapiAuthField label="Confirm password">
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            required
            className={vapiInputCls}
            placeholder="Repeat new password"
          />
        </VapiAuthField>

        <button type="submit" disabled={loading} className="vapi-btn-ember w-full justify-center disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
          {loading ? "Updating..." : "Update password"}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  useEffect(() => {
    void fetch("/api/auth/csrf", { credentials: "include" });
  }, []);

  return (
    <VapiAuthShell>
      <Suspense
        fallback={
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-ember-orange" />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </VapiAuthShell>
  );
}
