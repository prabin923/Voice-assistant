import Link from "next/link";
import { SiteShellBackdrop, siteHeaderChrome } from "@/components/SiteShellBackdrop";
import { vapiInputCls, vapiLabelCls } from "@/lib/vapiUi";

type Props = {
  children: React.ReactNode;
  headerRight?: React.ReactNode;
};

export function VapiAuthShell({ children, headerRight }: Props) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-void-canvas text-cream-text">
      <SiteShellBackdrop />
      <div className="relative z-10 flex min-h-screen flex-col">
        <header className={`sticky top-0 z-20 border-b ${siteHeaderChrome()}`}>
          <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-4 sm:px-6">
            <Link href="/" className="text-lg font-semibold tracking-tight text-cream-text">
              STAYNEP
            </Link>
            {headerRight ?? (
              <Link href="/assistant" className="vapi-nav-label">
                Voice assistant
              </Link>
            )}
          </div>
        </header>
        <div className="flex flex-1 items-center justify-center px-4 py-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function VapiAuthHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-8 text-center">
      <h1 className="vapi-headline text-3xl">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-mute">{subtitle}</p>
    </div>
  );
}

export function VapiAuthAlert({ children, variant = "error" }: { children: React.ReactNode; variant?: "error" | "success" | "warning" }) {
  const styles =
    variant === "error"
      ? "border-red-500/30 bg-red-500/10 text-red-300"
      : variant === "success"
        ? "border-mint-pulse/30 bg-mint-pulse/10 text-mint-pulse"
        : "border-ember-orange/30 bg-ember-orange/10 text-bone-text";
  return (
    <div role="alert" className={`rounded-[5.6px] border px-4 py-3 text-sm ${styles}`}>
      {children}
    </div>
  );
}

export function VapiAuthField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={vapiLabelCls}>{label}</label>
      {children}
    </div>
  );
}

export { vapiInputCls, vapiLabelCls };
