export * from "@/lib/db/types";
export {
  interactions,
  supportTickets,
  availability,
  bookings,
  diningReservations,
  guests,
  hotels,
  authAuditLogs,
  passwordResetTokens,
  feedback,
  serviceRequests,
  spaReservations,
  reviews,
  initDb,
} from "@/lib/db/repository";

let ready: Promise<void> | null = null;

export async function ensureDbReady(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const { initDb } = await import("@/lib/db/repository");
      await initDb();
    })();
  }
  await ready;
}
