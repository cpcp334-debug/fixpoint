import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/server/db";

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function newUploadToken() {
  return randomBytes(32).toString("hex");
}

export function tokensMatch(token: string, tokenHash: string) {
  const hashed = hashToken(token);
  const a = Buffer.from(hashed);
  const b = Buffer.from(tokenHash);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function createConversation(locale: string) {
  const token = newUploadToken();
  const row = await prisma.aiConversation.create({
    data: {
      locale,
      tokenHash: hashToken(token),
      messages: "[]",
      photoIds: "[]",
    },
  });
  return { conversation: row, uploadToken: token };
}

export async function getAuthorizedConversation(id: string, token: string) {
  const row = await prisma.aiConversation.findUnique({ where: { id } });
  if (!row || !row.tokenHash || !tokensMatch(token, row.tokenHash)) return null;
  return row;
}
