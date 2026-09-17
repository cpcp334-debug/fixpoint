import { whatsappUrl } from "@/config/site";
import { ButtonLink } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";

export function CtaBand({
  title,
  body,
  quote,
  ai,
  whatsapp,
  whatsappText,
  aiHref = "#alnajah-ai",
  className,
  compact = false,
}: {
  title: string;
  body: string;
  quote: string;
  ai: string;
  whatsapp: string;
  whatsappText?: string;
  aiHref?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <Section tone="sand" className={className}>
      <h2 className="max-w-xl text-2xl font-semibold tracking-tight text-navy sm:text-3xl">{title}</h2>
      <p className={compact ? "mt-2 max-w-xl text-muted" : "mt-3 max-w-xl text-muted"}>{body}</p>
      <div className={compact ? "mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap" : "mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap"}>
        <ButtonLink href="/get-a-quote" className="w-full sm:w-auto">
          {quote}
        </ButtonLink>
        <ButtonLink href={aiHref} variant="secondary" external className="w-full sm:w-auto">
          {ai}
        </ButtonLink>
        <ButtonLink href={whatsappUrl(whatsappText)} variant="ghost" external className="w-full sm:w-auto">
          {whatsapp}
        </ButtonLink>
      </div>
    </Section>
  );
}
