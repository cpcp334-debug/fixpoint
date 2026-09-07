import {
  Callout,
  Card,
  CardBody,
  CardHeader,
  Code,
  CollapsibleSection,
  Divider,
  Grid,
  H1,
  H2,
  H3,
  Pill,
  Row,
  Stack,
  Stat,
  Swatch,
  Table,
  Text,
  TodoListCard,
  UsageBar,
  computeDAGLayout,
  useCanvasState,
  useHostTheme,
} from "cursor/canvas";

type SectionId =
  | "overview"
  | "stack"
  | "folders"
  | "data"
  | "routes"
  | "components"
  | "ai"
  | "seo"
  | "catalog"
  | "reviews"
  | "diy"
  | "security"
  | "phase1";

const SECTIONS: Array<{ id: SectionId; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "stack", label: "A. Stack" },
  { id: "folders", label: "B. Folders" },
  { id: "data", label: "C. Data" },
  { id: "routes", label: "D. Routes" },
  { id: "components", label: "E. UI" },
  { id: "ai", label: "F. AI" },
  { id: "seo", label: "G. SEO" },
  { id: "catalog", label: "H. Catalog" },
  { id: "reviews", label: "I. Reviews" },
  { id: "diy", label: "J. DIY" },
  { id: "security", label: "K. Security" },
  { id: "phase1", label: "L. Phase 1" },
];

const FLOW_LABELS: Record<string, string> = {
  search: "Search / AI",
  page: "SEO page",
  ai: "ALNAJAH AI",
  suggest: "Suggest",
  diy: "DIY guide",
  pro: "Professional",
  lead: "Quote / book",
};

export default function AlnajahArchitecture() {
  const [section, setSection] = useCanvasState<SectionId>("section", "overview");

  return (
    <Stack gap={20}>
      <Stack gap={8}>
        <H1>ALNAJAH ALDAEM architecture</H1>
        <Text tone="secondary">
          Production platform plan for cleaning and building maintenance in the UAE.
          Status: architecture only. No application code until you approve Phase 1.
        </Text>
        <Row gap={8} wrap>
          <Pill active>Next.js App Router</Pill>
          <Pill active>Prisma + PostgreSQL</Pill>
          <Pill active>OpenAI</Pill>
          <Pill>Waiting for approval</Pill>
        </Row>
      </Stack>

      <Grid columns={4} gap={12}>
        <Stat value="Help first" label="Product philosophy" />
        <Stat value="Phase 1" label="Next build after approval" tone="info" />
        <Stat value="2 licenses" label="Public credentials only" />
        <Stat value="0 files" label="Empty workspace today" tone="warning" />
      </Grid>

      <Callout tone="warning" title="Do not invent business facts">
        No years of experience, customer counts, 24/7 claims, awards, fake reviews,
        or UAE-wide licensing. Public facts: trading name ALNAJAH ALDAEM, phone
        +971 54 344 7959, email alnajahaldaem42@gmail.com, Sharjah cleaning license
        925212, Ajman maintenance license 132954.
      </Callout>

      <Row gap={6} wrap>
        {SECTIONS.map((item) => (
          <span key={item.id}>
            <Pill
              active={section === item.id}
              onClick={() => setSection(item.id)}
            >
              {item.label}
            </Pill>
          </span>
        ))}
      </Row>

      {section === "overview" && <Overview />}
      {section === "stack" && <StackSection />}
      {section === "folders" && <FoldersSection />}
      {section === "data" && <DataSection />}
      {section === "routes" && <RoutesSection />}
      {section === "components" && <ComponentsSection />}
      {section === "ai" && <AiSection />}
      {section === "seo" && <SeoSection />}
      {section === "catalog" && <CatalogSection />}
      {section === "reviews" && <ReviewsSection />}
      {section === "diy" && <DiySection />}
      {section === "security" && <SecuritySection />}
      {section === "phase1" && <Phase1Section />}
    </Stack>
  );
}

function Overview() {
  return (
    <Stack gap={16}>
      <H2>What we are building</H2>
      <Text>
        Not a brochure site. A crawlable public knowledge and lead platform, with
        operations architecture ready for CRM, quotes, work orders, and AMC later.
      </Text>

      <H3>Locked decisions</H3>
      <Table
        headers={["Decision", "Choice", "Implication"]}
        rows={[
          [
            "Framework",
            "Next.js App Router + TypeScript",
            "Server-rendered HTML for Google, Bing, and AI crawlers",
          ],
          [
            "Data",
            "Prisma + PostgreSQL",
            "Typed catalog, locations, leads, and future CRM",
          ],
          [
            "UI",
            "Tailwind + design tokens",
            "Premium UAE service look, mobile-first, RTL-ready",
          ],
          [
            "AI",
            "OpenAI behind a provider adapter",
            "English + Arabic now; Urdu/Bengali later without rewrite",
          ],
          [
            "This turn",
            "Architecture only",
            "No files in the project until you approve Phase 1",
          ],
          [
            "Locations",
            "7 emirate hubs Active; communities draft",
            "No thin community doorway pages in Phase 1",
          ],
          [
            "Languages",
            "English + Arabic together",
            "RTL layout and localized routes from day one",
          ],
          [
            "Legal",
            "Brand ALNAJAH ALDAEM as Organization",
            "Both licenses listed on About, not claimed as one license",
          ],
          [
            "Site URL",
            "Placeholder SITE_URL in env",
            "Canonical/sitemap stay configurable",
          ],
        ]}
        striped
      />

      <H3>Customer flow</H3>
      <Text tone="secondary" size="small">
        Search or AI discovery lands on a useful page. The assistant classifies
        the problem, then routes to DIY when safe or to a professional quote/booking.
      </Text>
      <FlowDiagram />

      <H3>Build sequence</H3>
      <UsageBar
        total={5}
        topLeftLabel="Five phases"
        topRightLabel="Phase 1 is the only approved candidate after this plan"
        segments={[
          { id: "p1", value: 1, color: "blue" },
          { id: "p2", value: 1, color: "purple" },
          { id: "p3", value: 1, color: "green" },
          { id: "p4", value: 1, color: "orange" },
          { id: "p5", value: 1, color: "gray" },
        ]}
      />
      <Table
        headers={["Phase", "Public outcome", "Internal outcome"]}
        rows={[
          [
            "1 Foundation",
            "Homepage, services, locations, DIY shell, quote, contact, WhatsApp, SEO",
            "Schema, seed catalog, AI adapter, lead capture",
          ],
          [
            "2 Acquisition",
            "Service+location engine, live AI, DIY guides, reviews, Q&A, booking, projects",
            "Lead scoring, inspection requests",
          ],
          [
            "3 Operations",
            "Customer account later if needed",
            "Admin, CRM, quotes, work orders, staff, dispatch",
          ],
          [
            "4 Commercial",
            "AMC enquiry, invoices when provider is configured",
            "AMC, payments, receipts, analytics",
          ],
          [
            "5 Scale",
            "More services, areas, languages",
            "Automation, SOP linking, accounting adapters",
          ],
        ]}
        rowTone={["info", undefined, undefined, undefined, undefined]}
        striped
      />
    </Stack>
  );
}

function FlowDiagram() {
  const theme = useHostTheme();
  const layout = computeDAGLayout({
    direction: "horizontal",
    nodeWidth: 108,
    nodeHeight: 34,
    rankGap: 36,
    nodeGap: 18,
    padding: 8,
    nodes: [
      { id: "search" },
      { id: "page" },
      { id: "ai" },
      { id: "suggest" },
      { id: "diy" },
      { id: "pro" },
      { id: "lead" },
    ],
    edges: [
      { from: "search", to: "page" },
      { from: "page", to: "ai" },
      { from: "ai", to: "suggest" },
      { from: "suggest", to: "diy" },
      { from: "suggest", to: "pro" },
      { from: "diy", to: "pro" },
      { from: "pro", to: "lead" },
    ],
  });

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      role="img"
      aria-label="Customer acquisition flow from search to quote"
    >
      {layout.edges.map((edge) => (
        <line
          key={`${edge.from}-${edge.to}`}
          x1={edge.sourceX}
          y1={edge.sourceY}
          x2={edge.targetX}
          y2={edge.targetY}
          stroke={theme.stroke.primary}
          strokeWidth={1}
        />
      ))}
      {layout.nodes.map((node) => (
        <g key={node.id}>
          <rect
            x={node.x}
            y={node.y}
            width={108}
            height={34}
            rx={6}
            fill={theme.fill.secondary}
            stroke={theme.stroke.secondary}
          />
          <text
            x={node.x + 54}
            y={node.y + 22}
            textAnchor="middle"
            fill={theme.text.primary}
            fontSize={11}
          >
            {FLOW_LABELS[node.id]}
          </text>
        </g>
      ))}
    </svg>
  );
}

function StackSection() {
  return (
    <Stack gap={16}>
      <H2>A. Recommended technology stack</H2>
      <Text>
        Chosen for crawlable HTML, typed data, UAE bilingual layout, and a clean
        path from marketing site to operations platform.
      </Text>
      <Table
        headers={["Layer", "Choice", "Why"]}
        rows={[
          ["App", "Next.js 15 App Router, React 19, TypeScript strict", "SSR/SSG, nested routes, Server Actions"],
          ["Style", "Tailwind CSS 4 + CSS design tokens", "Mobile-first, RTL via dir=rtl, no CSS-in-JS tax"],
          ["Data", "PostgreSQL + Prisma", "Relational catalog, locations, CRM-ready"],
          ["Validation", "Zod on client, server, and AI tool args", "One schema language"],
          ["Auth later", "Auth.js (NextAuth) + RBAC", "Admin in Phase 3; schema prepared in Phase 1"],
          ["AI", "OpenAI Responses/Chat + adapter interface", "Swappable; never called from the browser"],
          ["i18n", "next-intl, locales en and ar", "Localized routes; Urdu/Bengali later"],
          ["SEO", "next-sitemap pattern + JSON-LD builders", "Sitemap index, canonical, schema"],
          ["Email later", "Server-side provider via env (Resend or SMTP)", "No provider hardcoded"],
          ["Files", "Private object storage adapter (local disk first)", "Public only after approval"],
          ["Hosting later", "Vercel or equivalent Node host + managed Postgres", "CDN, HTTPS, ISR"],
        ]}
        striped
      />
      <Callout tone="info" title="What we will not do in Phase 1">
        No live payments, no WhatsApp Cloud API, no full admin UI, no mass city
        pages, no accounting vendor lock-in, no public license PDFs.
      </Callout>
    </Stack>
  );
}

function FoldersSection() {
  return (
    <Stack gap={16}>
      <H2>B. Project and folder structure</H2>
      <Text>
        Single Next.js app at the repo root. One product, not a premature monorepo.
      </Text>
      <Table
        headers={["Path", "Owns"]}
        rows={[
          ["prisma/schema.prisma", "Canonical data model and enums"],
          ["prisma/seed.ts", "Approved public services, locations, FAQs only"],
          ["src/app/[locale]/", "All public pages, SSR HTML"],
          ["src/app/[locale]/admin/", "Admin shell later; noindex, auth-gated"],
          ["src/app/api/", "Webhooks, AI stream, private APIs"],
          ["src/app/robots.ts", "Allow public, disallow admin/account/private"],
          ["src/app/sitemap.ts", "Sitemap index of indexable URLs only"],
          ["src/components/layout/", "Header, footer, skip link, locale switch"],
          ["src/components/marketing/", "Hero, CTAs, trust, how-it-works"],
          ["src/components/catalog/", "Service and location blocks"],
          ["src/components/diy/", "Guide layout, safety, voting"],
          ["src/components/ai/", "Assistant widget, transcript UI"],
          ["src/components/forms/", "Quote, book, contact, review"],
          ["src/components/seo/", "JSON-LD, breadcrumbs, meta"],
          ["src/lib/seo/", "Title, canonical, quality gates"],
          ["src/lib/ai/", "Provider adapter, safety gate, tools"],
          ["src/lib/leads/", "Lead create, scoring hooks"],
          ["src/lib/pricing/", "Rule engine; AI never invents prices"],
          ["src/server/db.ts", "Prisma client"],
          ["src/server/auth.ts", "Session helpers"],
          ["src/server/rate-limit.ts", "Form and AI limits"],
          ["src/config/", "Public company profile, reserved slugs"],
          [".env.example", "Required keys, no secrets committed"],
        ]}
        striped
      />
    </Stack>
  );
}

function DataSection() {
  return (
    <Stack gap={16}>
      <H2>C. Database and entity model</H2>
      <Text>
        PostgreSQL is the system of record. Content, operations, and AI memory
        share IDs. Public APIs expose only published, non-sensitive fields.
      </Text>

      <H3>Content and SEO</H3>
      <Table
        headers={["Entity", "Key fields", "Publication"]}
        rows={[
          ["ServiceCategory", "slug, status, sortOrder, sopCode", "draft/published/archived"],
          ["Service", "slug, type, riskLevel, diyAvailable, quoteMethod, bookingEnabled, emergencyAvailable, amcAvailable, indexable", "draft/active/requires_approval/subcontracted/unavailable/archived"],
          ["ServiceI18n", "locale, name, descriptions, seo, faq, safetyNotes, professionalFallback", "inherits service status"],
          ["Location", "type country/emirate/city/community, parentId, slug, serves, indexable", "draft/active/archived"],
          ["ServiceLocation", "unique content, localFaqs, qualityScore, indexable", "only if service+location active, served, unique, quality-passed"],
          ["DiyGuide", "slug, category, difficulty, riskLevel, indexable", "draft/review/published/archived"],
          ["Article", "blog posts, same CMS statuses", "same"],
          ["Project", "real work only, media, location, service", "unpublished until real assets exist"],
          ["Faq", "relates to service, location, or global", "published independently"],
          ["MediaAsset", "alt, caption, visibility public/private, randomized key", "private by default"],
        ]}
        striped
      />

      <H3>Demand and operations (schema now, UI later)</H3>
      <Table
        headers={["Entity", "Purpose"]}
        rows={[
          ["Customer", "CRM identity, language, consent, properties"],
          ["Property", "type, location, access notes — never public"],
          ["Lead", "source, service, location, urgency, AI summary, status NEW→LOST"],
          ["Quote", "line items, exclusions, validity, humanApprovalRequired"],
          ["Booking", "request only until confirmed; statuses Requested→Completed"],
          ["Inspection", "checklist, photos, findings, quotation request"],
          ["WorkOrder", "assignment, PPE, QC, customer sign-off"],
          ["AmcContract", "coverage, SLA, schedule, renewal"],
          ["Invoice / Payment", "architecture only; provider off until configured"],
          ["Staff / Skill / Coverage", "dispatch matrix; never public"],
          ["Subcontractor", "approval and cost internal-only"],
          ["AiConversation", "scoped to PUBLIC knowledge; no private retrieval"],
          ["AuditLog", "auth, quotes, reviews, deletions"],
        ]}
        striped
      />

      <Callout tone="danger" title="Never stored in public content tables">
        Passport numbers, Emirates IDs, personal addresses, private contracts,
        employee personal data, subcontractor cost, or raw license PDFs.
      </Callout>
    </Stack>
  );
}

function RoutesSection() {
  return (
    <Stack gap={16}>
      <H2>D. Route structure</H2>
      <Text>
        Localized prefix. Static marketing routes win over dynamic service slugs.
        Reserved slugs are blocked in the service model.
      </Text>
      <Table
        headers={["URL", "Page", "Index default"]}
        rows={[
          ["/{locale}", "Homepage", "index"],
          ["/{locale}/about", "Company + public licenses", "index"],
          ["/{locale}/services", "Catalog index, Active only", "index"],
          ["/{locale}/cleaning-services", "Cleaning hub", "index if content-ready"],
          ["/{locale}/building-maintenance", "Maintenance hub / service", "index if Active"],
          ["/{locale}/[service]", "Service page", "index if Active + quality"],
          ["/{locale}/[service]/[location]", "Service + area", "index only if ServiceLocation passes gates"],
          ["/{locale}/locations", "Area directory", "index"],
          ["/{locale}/locations/[location]", "Location hub", "index if Active + useful"],
          ["/{locale}/diy", "DIY help center", "index"],
          ["/{locale}/diy/[slug]", "Guide", "index if published + safety-reviewed"],
          ["/{locale}/projects", "Case studies", "noindex until real projects"],
          ["/{locale}/reviews", "Approved reviews only", "noindex until genuine reviews exist"],
          ["/{locale}/faq", "Public FAQ", "index"],
          ["/{locale}/get-a-quote", "Quote request", "index"],
          ["/{locale}/book-a-service", "Booking request", "index"],
          ["/{locale}/contact", "Contact", "index"],
          ["/{locale}/blog", "Articles", "noindex until real posts"],
          ["Legal routes", "privacy, terms, cancellation, cookies", "index"],
          ["/{locale}/admin/*", "Operations", "noindex, auth, robots disallow"],
        ]}
        striped
      />
      <Callout tone="info" title="Collision rule">
        Reserved: about, services, diy, projects, reviews, faq, locations, contact,
        blog, admin, api, login, account, get-a-quote, book-a-service, privacy-policy,
        terms, cancellation-policy, cookie-policy, en, ar.
      </Callout>
    </Stack>
  );
}

function ComponentsSection() {
  return (
    <Stack gap={16}>
      <H2>E. Component architecture</H2>
      <Grid columns={2} gap={12}>
        <Card>
          <CardHeader>Design tokens</CardHeader>
          <CardBody>
            <Text>
              White / light surfaces, deep navy, one accent, strong type scale,
              large CTAs, restrained motion. Tokens: color, space, type, radius,
              shadow-none on UI chrome, focus rings, contrast AA.
            </Text>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>Layout chrome</CardHeader>
          <CardBody>
            <Text>
              Skip link, header (logo, nav, Get a Quote, Ask ALNAJAH AI), mobile
              bar (menu, WhatsApp, Quote), footer (company, services, areas, DIY,
              legal, phone, email). Arabic flips to RTL.
            </Text>
          </CardBody>
        </Card>
      </Grid>
      <H3>Shared blocks</H3>
      <Table
        headers={["Component", "Used on"]}
        rows={[
          ["Hero", "Home, service, location"],
          ["ServiceGrid", "Home, services, location"],
          ["AiEntry / AiPanel", "Every key page"],
          ["TrustStrip", "Licenses, process, AI/DIY disclaimers"],
          ["HowItWorks", "Home, service"],
          ["ProfessionalFallbackCtas", "Service, DIY, AI end-state"],
          ["FaqList + FAQ schema", "Service, location, DIY"],
          ["ReviewList", "Service, home — empty until real"],
          ["QuoteForm / BookingForm / ContactForm", "Dedicated pages + drawers"],
          ["JsonLd", "All indexable pages"],
        ]}
        striped
      />
    </Stack>
  );
}

function AiSection() {
  return (
    <Stack gap={16}>
      <H2>F. ALNAJAH AI architecture</H2>
      <Text>
        Server-only. Public assistant may retrieve only PUBLIC knowledge: Active
        services, Active locations, published DIY, public FAQs, public policies.
      </Text>
      <Table
        headers={["Layer", "Responsibility"]}
        rows={[
          ["UiWidget", "Chat UI, language, photo upload, handoff CTAs"],
          ["SessionStore", "Preserve answers so customers do not repeat themselves"],
          ["Orchestrator", "Intent, service classify, location, property, urgency"],
          ["SafetyGate", "GREEN / YELLOW / RED by service risk; refuse hazardous how-to"],
          ["SuggestionLayer", "May need X — never You definitely have X"],
          ["Tooling", "searchServices, getDiy, createLead, startQuote, startBooking, handoff"],
          ["Pricing", "Returns configured bands or inspection-required; never invented"],
          ["Handoff", "WhatsApp / call / quote with prefilled context"],
          ["Failsafe", "If uncertain, say so and recommend inspection"],
        ]}
        striped
      />
      <Callout tone="warning" title="Safety over leads">
        Electrical panel, live wiring, gas, refrigerant, structural demolition,
        dangerous height, major waterproofing, and hazardous chemicals: symptoms
        and stop-now advice only, then professional booking.
      </Callout>
      <Text>
        Model: OpenAI, env OPENAI_API_KEY. Interface AiProvider so the model can
        change without rewriting product logic. Languages: en and ar in Phase 1
        runtime; ur and bn locale slots later.
      </Text>
    </Stack>
  );
}

function SeoSection() {
  return (
    <Stack gap={16}>
      <H2>G. SEO and discoverability</H2>
      <Text>
        Eligibility for search and AI systems, not promised rankings or citations.
        Critical content is HTML, not chatbot-only.
      </Text>
      <Grid columns={2} gap={12}>
        <Card>
          <CardHeader>On every indexable page</CardHeader>
          <CardBody>
            <Text>
              Unique title, unique meta description, one H1, canonical, OG, X cards,
              robots, breadcrumbs, internal links, image alt, JSON-LD. No keyword stuffing.
            </Text>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>Schema set</CardHeader>
          <CardBody>
            <Text>
              Organization + LocalBusiness where accurate, Service, BreadcrumbList,
              FAQPage, HowTo for safe DIY, Article, Review/AggregateRating only from
              genuine eligible reviews.
            </Text>
          </CardBody>
        </Card>
      </Grid>
      <H3>Publication quality gate</H3>
      <Table
        headers={["Check", "Fail action"]}
        rows={[
          ["Service not Active or location not served", "noindex / unpublished"],
          ["Thin or city-name-swap content", "keep draft"],
          ["Duplicate canonical cluster", "do not publish"],
          ["Missing H1, CTA, or local usefulness", "block indexable=true"],
          ["Fake review or unsupported claim detected", "block publish"],
        ]}
        striped
      />
      <H3>robots and sitemaps</H3>
      <Text>
        Allow Googlebot, Bingbot, OAI-SearchBot, and other legitimate crawlers on
        public HTML. Disallow /admin, /login, /account, /api/internal, private
        uploads. Sitemap index: pages, services, locations, service-locations,
        diy, articles, projects — indexable URLs only.
      </Text>
    </Stack>
  );
}

function CatalogSection() {
  return (
    <Stack gap={16}>
      <H2>H. Service and location data architecture</H2>
      <Text>
        Catalog is data-driven. Do not hand-build 90+ pages. Do not publish
        thousands of thin area pages.
      </Text>
      <CollapsibleSection title="Location tree" count={4} defaultOpen leading={<Swatch color="blue" />}>
        <Text>
          UAE country → 7 emirates → city → community. Al Ain is a city under
          Abu Dhabi, not an emirate. Each node has servesCompany flag. Indexable
          location pages require Active + genuine service coverage + unique copy.
        </Text>
      </CollapsibleSection>
      <CollapsibleSection title="Service catalog" count={2} leading={<Swatch color="green" />}>
        <Text>
          Categories 01–23 exist in the model. Expansion categories (pest, glass,
          landscaping, etc.) are draft until approved. Only Active services are
          customer-facing. Each service carries risk, DIY flag, quote method,
          AI intake questions, schema, and professional fallback.
        </Text>
      </CollapsibleSection>
      <CollapsibleSection title="ServiceLocation join" count={1} leading={<Swatch color="purple" />}>
        <Text>
          Unique local intro, property types, nearby areas, local FAQs, related
          services, and quality score. URL pattern: /service-slug/location-slug.
          Generated, not mass-copied.
        </Text>
      </CollapsibleSection>
      <Callout tone="warning" title="Location seed is locked; service seed is not">
        Phase 1 publishes emirate hub pages for Dubai, Abu Dhabi, Sharjah, Ajman,
        Umm Al Quwain, Ras Al Khaimah, and Fujairah. Community pages stay draft.
        Active services are still waiting for your exact list.
      </Callout>
    </Stack>
  );
}

function ReviewsSection() {
  return (
    <Stack gap={16}>
      <H2>I. Review architecture</H2>
      <Table
        headers={["Type", "Fields", "Public label"]}
        rows={[
          [
            "Service review",
            "1–5 stars, title, body, name, optional photo, service, location, workOrderId",
            "Verified Customer only if linked to completed work order",
          ],
          [
            "Article / DIY feedback",
            "stars, helpful yes/no, comment, suggestions",
            "Reader Feedback — never implied purchase",
          ],
        ]}
        striped
      />
      <Text>
        Statuses: PENDING, APPROVED, REJECTED, HIDDEN, FLAGGED, VERIFIED. Moderation
        queue, rate limits, CAPTCHA later, duplicate detection, report button.
        AI may flag spam; AI must not auto-delete negative but legitimate reviews.
        Analysis dashboards are internal-only. Empty review UI until real reviews exist.
      </Text>
    </Stack>
  );
}

function DiySection() {
  return (
    <Stack gap={16}>
      <H2>J. DIY architecture</H2>
      <Text>
        Public education hub at /diy. Help even when the visitor does not buy.
      </Text>
      <Table
        headers={["Guide block", "Rule"]}
        rows={[
          ["Quick answer", "Answer-first, factual"],
          ["Difficulty / time / tools / materials", "Configurable; no fake precision"],
          ["Safety first", "Mandatory; stop conditions explicit"],
          ["Steps", "GREEN only for actionable repair; YELLOW limited; RED none"],
          ["Check your work / when to stop", "Always"],
          ["Professional fallback + CTAs", "Quote, book, inspect, WhatsApp, call"],
          ["AI + related + vote + FAQ", "On every published guide"],
        ]}
        striped
      />
      <Callout tone="danger" title="Red topics">
        No detailed live electrical, gas, refrigerant, structural demolition,
        dangerous height, or hazardous chemical procedures. Symptom + safe stop
        + book a professional.
      </Callout>
    </Stack>
  );
}

function SecuritySection() {
  return (
    <Stack gap={16}>
      <H2>K. Security architecture</H2>
      <Table
        headers={["Control", "Phase 1"]}
        rows={[
          ["Secrets", "Env only; never in client bundles"],
          ["Auth", "No public account required; admin route stubbed/noindex"],
          ["RBAC model", "admin, cs, sales, technician, supervisor, manager, subcontractor, customer"],
          ["Validation", "Zod client + server; sanitize rich text"],
          ["CSRF", "Next.js Server Actions same-origin"],
          ["Rate limit", "Quote, contact, AI, review endpoints"],
          ["Uploads", "MIME, size, randomized names, authz, private default"],
          ["AI isolation", "PUBLIC vs INTERNAL vs PRIVATE knowledge scopes"],
          ["Logging", "Structured logs; no PII in log bodies by default"],
          ["Headers", "HTTPS, referrer policy, frame deny, HSTS on host"],
        ]}
        striped
      />
      <Text>
        Public JSON APIs return only published fields. Pricing rules, staff, SOP
        internals, and customer records never leak to the public assistant.
      </Text>
    </Stack>
  );
}

function Phase1Section() {
  return (
    <Stack gap={16}>
      <H2>L. Phase 1 implementation plan</H2>
      <Text>
        After you approve, implement in this order. Still will not invent reviews,
        projects, prices, or coverage.
      </Text>
      <TodoListCard
        defaultExpanded
        todos={[
          { id: "1", content: "Scaffold Next.js + Tailwind tokens + next-intl en/ar + env example", status: "pending" },
          { id: "2", content: "Prisma schema (full platform) + seed Active catalog only", status: "pending" },
          { id: "3", content: "SEO utilities: metadata, canonical, JSON-LD, robots, sitemap index", status: "pending" },
          { id: "4", content: "Header, footer, homepage sections, legal pages, contact", status: "pending" },
          { id: "5", content: "Reusable service + location + service-location templates", status: "pending" },
          { id: "6", content: "DIY hub + 1–2 safety-reviewed sample guides if you approve copy", status: "pending" },
          { id: "7", content: "Quote + contact forms → Lead table, WhatsApp deep links, rate limits", status: "pending" },
          { id: "8", content: "ALNAJAH AI adapter + safety gate + public-knowledge tools", status: "pending" },
          { id: "9", content: "Trust disclaimers, license display, empty states for reviews/projects", status: "pending" },
          { id: "10", content: "Verify homepage, service, location, quote, WhatsApp in the browser", status: "pending" },
        ]}
      />
      <Divider />
      <H3>Still blocked until you answer</H3>
      <Table
        headers={["Question", "Why it blocks code"]}
        rows={[
          [
            "Exact Active service list for Phase 1",
            "Stops publishing unlicensed or unready trades",
          ],
        ]}
      />
      <Callout tone="success" title="Ready when you are">
        Approve this architecture, answer the remaining questions, then say
        implement Phase 1. No application files will be created before that.
      </Callout>
    </Stack>
  );
}
