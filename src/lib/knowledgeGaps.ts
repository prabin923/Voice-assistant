import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";

export type KnowledgeGapRow = {
  id: string;
  question: string;
  guest_message: string;
  language: string;
  status: string;
  created_at: string;
};

function normalizeQuestion(q: string): string {
  return q.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

export const knowledgeGaps = {
  async create(input: {
    question: string;
    guestMessage: string;
    language: string;
  }): Promise<KnowledgeGapRow> {
    const normalized = normalizeQuestion(input.question);

    // Dedup: if an open gap with the same normalized question exists, skip insert
    const existing = await prisma.knowledgeGap.findFirst({
      where: { status: "open" },
      orderBy: { createdAt: "desc" },
      take: 100,
    }).then((rows) => {
      // findFirst only returns one — use findMany with take for dedup window
      return null; // handled below
    }).catch(() => null);
    void existing; // suppress unused warning — using findMany below

    const recentOpen = await prisma.knowledgeGap.findMany({
      where: { status: "open" },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, question: true },
    }).catch(() => []);

    const duplicate = recentOpen.find(
      (r) => normalizeQuestion(r.question) === normalized
    );
    if (duplicate) {
      // Return the existing gap row instead of creating a duplicate
      const row = await prisma.knowledgeGap.findUnique({ where: { id: duplicate.id } });
      if (row) {
        return {
          id: row.id,
          question: row.question,
          guest_message: row.guestMessage,
          language: row.language,
          status: row.status,
          created_at: row.createdAt.toISOString(),
        };
      }
    }

    const row = await prisma.knowledgeGap.create({
      data: {
        id: randomUUID(),
        question: input.question.slice(0, 500),
        guestMessage: input.guestMessage.slice(0, 2000),
        language: input.language.slice(0, 12),
        status: "open",
      },
    });
    return {
      id: row.id,
      question: row.question,
      guest_message: row.guestMessage,
      language: row.language,
      status: row.status,
      created_at: row.createdAt.toISOString(),
    };
  },

  async listOpen(limit = 50): Promise<KnowledgeGapRow[]> {
    const rows = await prisma.knowledgeGap.findMany({
      where: { status: "open" },
      orderBy: { createdAt: "desc" },
      take: Math.max(1, Math.floor(limit)),
    });
    return rows.map((row) => ({
      id: row.id,
      question: row.question,
      guest_message: row.guestMessage,
      language: row.language,
      status: row.status,
      created_at: row.createdAt.toISOString(),
    }));
  },

  async updateStatus(id: string, status: "open" | "added_to_faq" | "dismissed"): Promise<void> {
    await prisma.knowledgeGap.update({ where: { id }, data: { status } });
  },
};
