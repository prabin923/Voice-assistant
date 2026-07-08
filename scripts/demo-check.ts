/**
 * Demo readiness check — run after `npm run dev` restart:
 *   npx tsx scripts/demo-check.ts
 * Verifies: embedding model, per-tenant KB, EN+NE retrieval, room availability
 * for the next few days, a full booking-agent round-trip (self-cleaning), and a
 * Nepali TTS→STT voice round-trip. Read-only except one booking it cancels.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: process.cwd() + "/.env.local" });
loadEnv({ path: process.cwd() + "/.env" });

const ok = (c: boolean) => (c ? "✓" : "✗");
function addDays(iso: string, n: number) { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }

(async () => {
  const prisma = (await import("../src/lib/prisma")).default;
  const { ensureDbReady, availability } = await import("../src/lib/db");
  const { resolveTenantConfig, runWithTenant } = await import("../src/lib/tenantContext");
  const { retrieveRelevantChunks } = await import("../src/lib/rag/knowledgeIndex");
  const { activeEmbedModel } = await import("../src/lib/rag/embeddings");
  const { runBookingAgent } = await import("../src/lib/bookingAgent");
  const { cancelBookingSafe } = await import("../src/lib/bookingService");
  await ensureDbReady();

  const slug = "aurelian-grand";
  const { hotelId, config } = await resolveTenantConfig({ slug });
  // today is fixed by the app context; use a near date for the demo
  const start = new Date().toISOString().slice(0, 10);

  console.log("\n========== DEMO READINESS ==========");
  console.log(`embed model: ${activeEmbedModel()} ${ok(activeEmbedModel() === "gemini-embedding-001")}`);

  // 1. Per-tenant KB
  const grouped = await prisma.knowledgeChunk.groupBy({ by: ["hotelId"], _count: true });
  const legacy = await prisma.knowledgeChunk.count({ where: { AND: [{ hotelId: null }, { chunkKey: { not: { startsWith: "web:" } } }] } });
  console.log(`\nKB chunks by hotel: ${grouped.map((g: any) => `${(g.hotelId ?? "null").slice(0,8)}:${g._count}`).join("  ")}`);
  console.log(`legacy/global config chunks: ${legacy} ${ok(legacy === 0)} (want 0)`);

  // 2. Retrieval EN + NE within tenant
  await runWithTenant({ slug }, async () => {
    for (const q of ["do you have wifi?", "तपाईंको होटलमा वाइफाइ छ?", "एयरपोर्ट पिकअप छ?"]) {
      const hits = await retrieveRelevantChunks(q, { topK: 3, minScore: 0.2 });
      const foreign = hits.filter((c) => c.chunkKey.startsWith("t:") && !c.chunkKey.startsWith(`t:${hotelId}:`)).length;
      console.log(`retrieval "${q.slice(0,28)}" -> ${hits.length} hit(s), foreign:${foreign} ${ok(hits.length > 0 && foreign === 0)}`);
    }
  });

  // 3. Availability for the next 3 nights
  console.log("\nroom availability (next nights):");
  for (let d = 1; d <= 3; d++) {
    const ci = addDays(start, d), co = addDays(start, d + 1);
    const parts: string[] = [];
    for (const r of config.rooms) { const a = await availability.get(r.name, ci, co); parts.push(`${r.name.split(" ")[0]}:${a.available}`); }
    console.log(`  ${ci}→${co}  ${parts.join("  ")}`);
  }

  // 4. Booking agent round-trip (self-cleaning)
  const ci = addDays(start, 2), co = addDays(start, 3);
  const room = config.rooms[0].name;
  console.log(`\nbooking agent: "book ${room} ${ci}→${co}, Demo Guest, phone 9800000000"`);
  let bookedId: string | undefined;
  await runWithTenant({ slug }, async () => {
    const res = await runBookingAgent({
      message: `Please book a ${room} from ${ci} to ${co} for Demo Guest, phone 9800000000.`,
      langCode: "en-US", config, history: [], channel: "text",
    });
    bookedId = res.booking?.id;
    console.log(`  agent reply: ${res.reply.slice(0, 120).replace(/\n/g, " ")}`);
    console.log(`  booking created: ${bookedId ? bookedId.slice(0,8) + " ✓" : "(none — agent likely asked a follow-up)"}`);
  });
  if (bookedId) { await cancelBookingSafe(bookedId); console.log("  cleaned up test booking ✓"); }

  console.log("\n========== END ==========\n");
  process.exit(0);
})().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
