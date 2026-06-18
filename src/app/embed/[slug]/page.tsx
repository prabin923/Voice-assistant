import VoiceAssistant from "@/app/assistant/page";
import { TenantSlugProvider } from "@/hooks/useTenantSlug";

export const dynamic = "force-dynamic";

export default async function EmbedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <TenantSlugProvider slug={slug}>
      <div className="min-h-screen bg-void-canvas">
        <VoiceAssistant />
      </div>
    </TenantSlugProvider>
  );
}
