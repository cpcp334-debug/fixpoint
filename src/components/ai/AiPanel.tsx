"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Disclaimer, ProfessionalCtas } from "@/components/ui/Blocks";

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

export function AiPanel({
  locale,
  compact = false,
}: {
  locale: string;
  compact?: boolean;
}) {
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
        window.setTimeout(() => document.getElementById(compact ? "ai-input-compact" : "ai-input")?.focus(), 0);
      }
    }
    window.addEventListener("alnajah-ai-prefill", onPrefill);
    return () => window.removeEventListener("alnajah-ai-prefill", onPrefill);
  }, [compact]);

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
    <section className="rounded-[20px] border border-line/80 bg-white p-5 shadow-[0_8px_30px_rgba(11,31,58,0.04)] sm:p-6" aria-labelledby="ai-title">
      <h2 id="ai-title" className="text-lg font-semibold text-navy">
        {t("title")}
      </h2>
      <div className="mt-3 max-h-80 space-y-3 overflow-y-auto text-sm">
        {messages.length === 0 ? (
          <p className="text-muted">{t("placeholder")}</p>
        ) : (
          messages.map((msg, i) => (
            <p key={i} className={msg.role === "user" ? "font-medium" : "text-ink"}>
              {msg.content}
            </p>
          ))
        )}
      </div>
      {risk ? (
        <p className="mt-3 text-xs uppercase tracking-wide text-muted">
          {t("risk")}: {t(`risk_${risk}`)}
        </p>
      ) : null}
      <div className="mt-4 flex gap-2">
        <label className="sr-only" htmlFor={compact ? "ai-input-compact" : "ai-input"}>
          {t("placeholder")}
        </label>
        <input
          id={compact ? "ai-input-compact" : "ai-input"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void onSend();
          }}
          placeholder={t("placeholder")}
          className="min-h-12 flex-1 rounded-[12px] border border-line bg-white px-3"
        />
        <button
          type="button"
          onClick={() => void onSend()}
          disabled={pending}
          className="min-h-12 rounded-[12px] bg-navy px-4 font-medium text-white disabled:opacity-60"
        >
          {t("send")}
        </button>
      </div>

      {uploadHint === "needed" || photoIds.length > 0 ? (
        <div className="mt-4 rounded-md border border-line bg-white p-3 text-sm">
          <p>{t("photosHelp")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <label className="inline-flex min-h-10 cursor-pointer items-center rounded-md border border-line px-3">
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
              className="inline-flex min-h-10 items-center rounded-md border border-line px-3"
              onClick={() => setUploadHint("skipped")}
            >
              {t("skipPhotos")}
            </button>
            {meta.handover?.whatsappUrl ? (
              <a href={meta.handover.whatsappUrl} className="inline-flex min-h-10 items-center rounded-md border border-line px-3">
                {t("whatsappPhotos")}
              </a>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-muted">{t("photoCount", { count: photoIds.length })}</p>
        </div>
      ) : null}

      {meta.missingFields && meta.missingFields.length > 0 ? (
        <p className="mt-3 text-sm text-muted">{t("missing")}: {meta.missingFields.join(", ")}</p>
      ) : null}

      {meta.suggestedServiceSlug ? (
        <p className="mt-3 text-sm">
          <Link className="text-accent underline" href={`/${meta.suggestedServiceSlug}`}>
            {t("maybeService")}
          </Link>
        </p>
      ) : null}
      {meta.diySlug ? (
        <p className="mt-2 text-sm">
          <Link className="text-accent underline" href={`/diy/${meta.diySlug}`}>
            {t("diyLink")}
          </Link>
        </p>
      ) : null}

      {meta.recommendProfessional || meta.handover?.available ? (
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium">{t("handover")}</p>
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
            <p className="mt-2 text-sm">
              <Link href={meta.handover.receiptPath} className="text-accent underline">
                {t("requestReceived")}
              </Link>
            </p>
          ) : null}
          {meta.handover?.whatsappUrl ? (
            <a href={meta.handover.whatsappUrl} className="mt-2 inline-block text-sm text-accent underline">
              {t("whatsappPrefill")}
            </a>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4">
        <Disclaimer>{t("disclaimer")}</Disclaimer>
      </div>
    </section>
  );
}
