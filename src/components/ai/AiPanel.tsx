"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { ProfessionalCtas } from "@/components/ui/Blocks";
import { AiMark } from "@/components/ui/AiMark";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

type ChatResponse = {
  reply: string;
  riskClass?: "green" | "yellow" | "red";
  suggestedServiceSlug?: string;
  diySlug?: string;
  photosUseful?: boolean;
  missingFields?: string[];
  handover?: {
    available: boolean;
    leadId?: string;
    bookingNumber?: string;
    receiptPath?: string;
    whatsappUrl: string;
  };
  conversationId?: string;
  uploadToken?: string;
  photoCount?: number;
  recommendProfessional?: boolean;
  error?: string;
};

export function AiPanel({ locale }: { locale: string }) {
  const t = useTranslations("Ai");
  const cta = useTranslations("Cta");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [conversationId, setConversationId] = useState("");
  const [uploadToken, setUploadToken] = useState("");
  const [photoIds, setPhotoIds] = useState<string[]>([]);
  const [meta, setMeta] = useState<ChatResponse>({ reply: "" });
  const [uploadHint, setUploadHint] = useState<"idle" | "needed" | "skipped" | "done">("idle");

  useEffect(() => {
    function onPrefill(event: Event) {
      const prompt = (event as CustomEvent<string>).detail;
      if (typeof prompt === "string" && prompt.trim()) {
        setInput(prompt.trim());
        window.setTimeout(() => document.getElementById("ai-input")?.focus(), 0);
      }
    }
    window.addEventListener("alnajah-ai-prefill", onPrefill);
    return () => window.removeEventListener("alnajah-ai-prefill", onPrefill);
  }, []);

  async function send(nextMessages: Msg[]): Promise<ChatResponse | null> {
    setPending(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          messages: nextMessages,
          conversationId: conversationId || undefined,
          uploadToken: uploadToken || undefined,
          photoIds,
        }),
      });
      const data = (await res.json()) as ChatResponse;
      if (!res.ok) {
        setMessages([...nextMessages, { role: "assistant", content: t("error") }]);
        return null;
      }
      if (data.conversationId) setConversationId(data.conversationId);
      if (data.uploadToken) setUploadToken(data.uploadToken);
      setMessages([...nextMessages, { role: "assistant", content: data.reply }]);
      setMeta(data);
      if (data.photosUseful && photoIds.length === 0 && uploadHint === "idle") {
        setUploadHint("needed");
      }
      return data;
    } catch {
      setMessages([...nextMessages, { role: "assistant", content: t("error") }]);
      return null;
    } finally {
      setPending(false);
    }
  }

  async function onSend() {
    const text = input.trim();
    if (!text || pending) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    await send(next);
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    let id = conversationId;
    let token = uploadToken;
    if (!id || !token) {
      const primed = await send(
        messages.length
          ? messages
          : [{ role: "user", content: locale === "ar" ? "أرغب برفع صور." : "I would like to upload photos." }],
      );
      id = primed?.conversationId || "";
      token = primed?.uploadToken || "";
    }
    if (!id || !token) return;
    setPending(true);
    try {
      for (const file of Array.from(files).slice(0, 5 - photoIds.length)) {
        const form = new FormData();
        form.set("conversationId", id);
        form.set("token", token);
        form.set("file", file);
        const res = await fetch("/api/ai/uploads", { method: "POST", body: form });
        const data = await res.json();
        if (res.ok && data.id) {
          setPhotoIds((prev) => [...prev, data.id]);
          setUploadHint("done");
        }
      }
    } finally {
      setPending(false);
    }
  }

  const risk = meta.riskClass;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3 text-sm">
        {messages.length === 0 ? (
          <p className="px-1 text-muted">{t("placeholder")}</p>
        ) : (
          messages.map((msg, i) => {
            const user = msg.role === "user";
            return (
              <div key={i} className={cn("flex items-end gap-2", user && "flex-row-reverse")}>
                {user ? (
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-[0.65rem] font-semibold text-white">
                    {locale === "ar" ? "أ" : "You"}
                  </span>
                ) : (
                  <AiMark id={`ai-bubble-${i}`} size={32} />
                )}
                <p
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3 py-2 leading-relaxed",
                    user ? "rounded-br-md bg-navy text-white" : "rounded-bl-md bg-sand text-ink",
                  )}
                >
                  {msg.content}
                </p>
              </div>
            );
          })
        )}
        {pending ? <p className="px-1 text-xs text-muted">…</p> : null}
        {risk ? (
          <p className="px-1 text-[0.7rem] uppercase tracking-wide text-muted">
            {t("risk")}: {t(`risk_${risk}`)}
          </p>
        ) : null}
        {uploadHint === "needed" || photoIds.length > 0 ? (
          <div className="rounded-xl border border-line bg-white p-3">
            <p className="text-xs text-muted">{t("photosHelp")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <label className="inline-flex min-h-9 cursor-pointer items-center rounded-lg border border-line px-2.5 text-xs">
                {t("upload")}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="sr-only"
                  onChange={(e) => void onFiles(e.target.files)}
                />
              </label>
              <button
                type="button"
                className="inline-flex min-h-9 items-center rounded-lg border border-line px-2.5 text-xs"
                onClick={() => setUploadHint("skipped")}
              >
                {t("skipPhotos")}
              </button>
              {meta.handover?.whatsappUrl ? (
                <a href={meta.handover.whatsappUrl} className="inline-flex min-h-9 items-center rounded-lg border border-line px-2.5 text-xs">
                  {t("whatsappPhotos")}
                </a>
              ) : null}
            </div>
            <p className="mt-2 text-xs text-muted">{t("photoCount", { count: photoIds.length })}</p>
          </div>
        ) : null}
        {meta.missingFields && meta.missingFields.length > 0 ? (
          <p className="text-xs text-muted">
            {t("missing")}: {meta.missingFields.join(", ")}
          </p>
        ) : null}
        {meta.suggestedServiceSlug ? (
          <p>
            <Link className="text-sm font-medium text-accent" href={`/${meta.suggestedServiceSlug}`}>
              {t("maybeService")}
            </Link>
          </p>
        ) : null}
        {meta.diySlug ? (
          <p>
            <Link className="text-sm font-medium text-accent" href={`/diy/${meta.diySlug}`}>
              {t("diyLink")}
            </Link>
          </p>
        ) : null}
        {meta.recommendProfessional || meta.handover?.available ? (
          <div>
            <p className="mb-2 text-xs font-medium text-navy">{t("handover")}</p>
            <ProfessionalCtas
              labels={{
                quote: cta("quote"),
                book: cta("book"),
                inspect: cta("inspect"),
                whatsapp: cta("whatsapp"),
                call: cta("call"),
              }}
              whatsappText={undefined}
            />
            {meta.handover?.receiptPath ? (
              <p className="mt-2">
                <Link href={meta.handover.receiptPath} className="text-sm text-accent">
                  {t("requestReceived")}
                </Link>
              </p>
            ) : null}
            {meta.handover?.whatsappUrl ? (
              <a href={meta.handover.whatsappUrl} className="mt-2 inline-block text-sm text-accent">
                {t("whatsappPrefill")}
              </a>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="border-t border-line p-3">
        <div className="flex gap-2">
          <label className="sr-only" htmlFor="ai-input">
            {t("placeholder")}
          </label>
          <input
            id="ai-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void onSend();
            }}
            placeholder={t("placeholder")}
            className="min-h-10 flex-1 rounded-xl border border-line bg-white px-3 text-sm"
          />
          <button
            type="button"
            onClick={() => void onSend()}
            disabled={pending}
            className="min-h-10 rounded-xl bg-navy px-3 text-sm font-medium text-white disabled:opacity-60"
          >
            {t("send")}
          </button>
        </div>
        <p className="mt-2 text-[0.65rem] leading-relaxed text-muted">{t("disclaimer")}</p>
      </div>
    </div>
  );
}
