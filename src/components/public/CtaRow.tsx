import type { ReactNode } from "react";
import { telUrl, whatsappUrl } from "@/config/site";
import { ButtonLink } from "@/components/ui/Button";

export function CtaRow({
  labels,
  whatsappText,
  tone = "light",
  includeInspect = false,
  bookingEnabled = true,
  extra,
}: {
  labels: {
    quote: string;
    book: string;
    inspect?: string;
    whatsapp: string;
    call: string;
  };
  whatsappText?: string;
  tone?: "light" | "inverse";
  includeInspect?: boolean;
  /** When false, omit the book CTA (effective ServiceLocation ops). */
  bookingEnabled?: boolean;
  extra?: ReactNode;
}) {
  const primary = tone === "inverse" ? "inversePrimary" : "primary";
  const secondary = tone === "inverse" ? "inverse" : "secondary";

  return (
    <div className="flex flex-wrap gap-3">
      <ButtonLink href="/get-a-quote" variant={primary}>
        {labels.quote}
      </ButtonLink>
      {bookingEnabled ? (
        <ButtonLink href="/book-a-service" variant={secondary}>
          {labels.book}
        </ButtonLink>
      ) : null}
      {includeInspect && bookingEnabled && labels.inspect ? (
        <ButtonLink href="/book-a-service?type=inspection" variant={secondary}>
          {labels.inspect}
        </ButtonLink>
      ) : null}
      <ButtonLink href={whatsappUrl(whatsappText)} variant={secondary} external>
        {labels.whatsapp}
      </ButtonLink>
      <ButtonLink href={telUrl()} variant={secondary} external>
        {labels.call}
      </ButtonLink>
      {extra}
    </div>
  );
}
