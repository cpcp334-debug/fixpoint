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
}: {
  title: string;
  body: string;
  quote: string;
  ai: string;
  whatsapp: string;
  whatsappText?: string;
  aiHref?: string;
}) {
  return (
    <Section tone="sand">
      <h2 className="max-w-xl text-2xl font-semibold tracking-tight text-navy sm:text-3xl">{title}</h2>
      <p className="mt-3 max-w-xl text-muted">{body}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href="/get-a-quote">{quote}</ButtonLink>
        <ButtonLink href={aiHref} variant="secondary" external>
          {ai}
        </ButtonLink>
        <ButtonLink href={whatsappUrl(whatsappText)} variant="ghost" external>
          {whatsapp}
        </ButtonLink>
      </div>
    </Section>
  );
}
