import { prisma } from "@/server/db";
import { MAX_TURNS, MAX_USER_MESSAGE, type CofounderMessage } from "@/lib/cofounder/types";

function parseMessages(raw: string): CofounderMessage[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row): row is CofounderMessage => {
      if (!row || typeof row !== "object") return false;
      const item = row as CofounderMessage;
      return (item.role === "user" || item.role === "assistant" || item.role === "tool") && typeof item.content === "string";
    });
  } catch {
    return [];
  }
}

function clipTurns(messages: CofounderMessage[]) {
  const max = MAX_TURNS * 2;
  return messages.length > max ? messages.slice(-max) : messages;
}

export async function createStaffConversation(userId: string, frozenRole: string) {
  return prisma.staffAiConversation.create({
    data: { userId, frozenRole, messagesJson: "[]" },
  });
}

export async function loadStaffConversation(id: string, userId: string) {
  const row = await prisma.staffAiConversation.findFirst({ where: { id, userId } });
  if (!row) return null;
  return { ...row, messages: parseMessages(row.messagesJson) };
}

export function clipUserMessage(text: string) {
  return text.trim().slice(0, MAX_USER_MESSAGE);
}

export async function appendStaffMessages(id: string, userId: string, next: CofounderMessage[]) {
  const row = await loadStaffConversation(id, userId);
  if (!row) return null;
  const messages = clipTurns([...row.messages, ...next]);
  await prisma.staffAiConversation.update({
    where: { id },
    data: { messagesJson: JSON.stringify(messages) },
  });
  return messages;
}
