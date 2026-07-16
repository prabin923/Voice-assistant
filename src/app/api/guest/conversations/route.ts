import { NextResponse } from "next/server";
import { getGuestSession } from "@/lib/guestAuth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getGuestSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // Fetch interactions/chat messages for this guest
  const interactions = await prisma.interaction.findMany({
    where: { guestId: session.guestId },
    orderBy: { createdAt: "asc" },
  });

  if (!interactions.length) {
    return new Response("No conversation history found.", {
      headers: {
        "Content-Type": "text/plain",
        "Content-Disposition": 'attachment; filename="chat-history.txt"',
      },
    });
  }

  // Generate markdown export
  let markdown = `# StayNep Conversation History\n`;
  markdown += `Generated on: ${new Date().toLocaleString()}\n`;
  markdown += `Guest ID: ${session.guestId}\n\n`;
  markdown += `---\n\n`;

  for (const record of interactions) {
    const time = new Date(record.createdAt).toLocaleString();
    markdown += `### [${time}] User (${record.language}):\n> ${record.guestMessage}\n\n`;
    markdown += `### [${time}] AI Concierge:\n> ${record.aiResponse}\n\n`;
    markdown += `---\n\n`;
  }

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": 'attachment; filename="staynep-chat-history.md"',
    },
  });
}
