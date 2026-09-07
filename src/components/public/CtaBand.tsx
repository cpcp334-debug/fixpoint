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
    <Section tone="navy">
      <h2 className="max-w-xl text-[1.75rem] font-semibold leading-tight text-white">{title}</h2>
      <p className="mt-3 max-w-xl text-white/75">{body}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href="/get-a-quote" variant="inversePrimary">
          {quote}
        </ButtonLink>
        <ButtonLink href={aiHref} variant="inverse" external>
          {ai}
        </ButtonLink>
        <ButtonLink href={whatsappUrl(whatsappText)} variant="inverse" external>
          {whatsapp}
        </ButtonLink>
      </div>
    </Section>
  );
}
