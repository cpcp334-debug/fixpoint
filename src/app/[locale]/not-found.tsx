import { ButtonLink } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { PageShell } from "@/components/public/PageShell";

export default function NotFound() {
  return (
    <PageShell>
      <Section className="text-center">
        <h1 className="text-[2rem] font-semibold text-navy">Not found</h1>
        <p className="mt-3 text-muted">This page is not published or does not exist.</p>
        <p className="mt-8">
          <ButtonLink href="/">Home</ButtonLink>
        </p>
      </Section>
    </PageShell>
  );
}
