export const MAX_CHAT_MESSAGE_LENGTH = 4000;
export const MAX_CHAT_HISTORY_TURNS = 20;
export const MAX_CHAT_HISTORY_ITEM_LENGTH = 8000;

export type ValidChatHistoryMessage = { role: "user" | "assistant"; content: string };

export function sanitizeChatMessage(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_CHAT_MESSAGE_LENGTH);
}

export function sanitizeChatHistory(raw: unknown): ValidChatHistoryMessage[] {
  if (!Array.isArray(raw)) return [];
  const out: ValidChatHistoryMessage[] = [];
  for (const item of raw.slice(-MAX_CHAT_HISTORY_TURNS)) {
    if (!item || typeof item !== "object") continue;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if (role !== "user" && role !== "assistant") continue;
    if (typeof content !== "string") continue;
    const trimmed = content.trim().slice(0, MAX_CHAT_HISTORY_ITEM_LENGTH);
    if (!trimmed) continue;
    out.push({ role, content: trimmed });
  }
  return out;
}
