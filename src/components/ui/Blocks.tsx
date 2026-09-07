import { mailUrl, siteConfig, telUrl, whatsappUrl } from "@/config/site";
import { ButtonLink } from "@/components/ui/Button";

export function ProfessionalCtas({
  labels,
  whatsappText,
}: {
  labels: {
    quote: string;
    book: string;
    inspect: string;
    whatsapp: string;
    call: string;
  };
  whatsappText?: string;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <ButtonLink href="/get-a-quote">{labels.quote}</ButtonLink>
      <ButtonLink href="/book-a-service" variant="secondary">
        {labels.book}
      </ButtonLink>
      <ButtonLink href="/book-a-service?type=inspection" variant="secondary">
        {labels.inspect}
      </ButtonLink>
      <ButtonLink href={whatsappUrl(whatsappText)} variant="secondary" external>
        {labels.whatsapp}
      </ButtonLink>
      <ButtonLink href={telUrl()} variant="secondary" external>
        {labels.call}
      </ButtonLink>
      <a className="sr-only" href={mailUrl()}>
        {siteConfig.email}
      </a>
    </div>
  );
}

export function FaqList({ items }: { items: Array<{ q: string; a: string }> }) {
  if (!items.length) return null;
  return (
    <dl className="grid gap-3">
      {items.map((item) => (
        <div key={item.q} className="rounded-[16px] border border-line/80 bg-white p-5">
          <dt className="font-semibold text-navy">{item.q}</dt>
          <dd className="mt-2 text-sm leading-relaxed text-muted">{item.a}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Disclaimer({ children }: { children: string }) {
  return <p className="rounded-[12px] bg-sand px-4 py-3 text-sm text-muted">{children}</p>;
}
