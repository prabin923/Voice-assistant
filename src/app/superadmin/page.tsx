"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { SiteShellBackdrop } from "@/components/SiteShellBackdrop";
import { vapiInputCls } from "@/lib/vapiUi";

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // If already authenticated, go straight to dashboard
    fetch("/api/superadmin/auth", { method: "GET", credentials: "include" })
      .then((r) => { if (r.ok) router.replace("/superadmin/dashboard"); })
      .catch(() => {});
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/superadmin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ key }),
      });
      if (!res.ok) {
        setError("Invalid key. Check your SUPER_ADMIN_KEY environment variable.");
        return;
      }
      router.push("/superadmin/dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-void-canvas text-cream-text">
      <SiteShellBackdrop />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6">
          {/* Logo / heading */}
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-iron-border bg-carbon-surface">
              <ShieldCheck className="w-7 h-7 text-ember-orange" strokeWidth={1.5} />
            </div>
            <h1 className="text-xl font-semibold text-cream-text">Super Admin</h1>
            <p className="text-sm text-zinc-mute">Enter your <code className="rounded bg-neutral-800 px-1 text-amber-300">SUPER_ADMIN_KEY</code> to continue.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-[5.6px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Enter super-admin key"
                required
                autoFocus
                className={vapiInputCls + " pr-10"}
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-mute hover:text-cream-text"
                tabIndex={-1}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || !key.trim()}
              className="vapi-btn-ember w-full justify-center disabled:opacity-40"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {loading ? "Verifying…" : "Access dashboard"}
            </button>
          </form>

          <p className="text-center text-xs text-zinc-mute">
            Not configured?{" "}
            Set <code className="rounded bg-neutral-800 px-1 text-amber-300">SUPER_ADMIN_KEY=your-secret</code> in your environment.
          </p>
        </div>
      </div>
    </div>
  );
}
