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
  Pill,
  Row,
  Stack,
  Stat,
  Table,
  Text,
  computeDAGLayout,
  useHostTheme,
} from "cursor/canvas";

const FUNNEL = computeDAGLayout({
  direction: "horizontal",
  nodeWidth: 100,
  nodeHeight: 34,
  rankGap: 28,
  nodeGap: 14,
  padding: 8,
  nodes: [
    { id: "visitors" },
    { id: "engaged" },
    { id: "leads" },
    { id: "qualified" },
    { id: "quotes" },
    { id: "bookings" },
    { id: "completed" },
    { id: "paid" },
  ],
  edges: [
    { from: "visitors", to: "engaged" },
    { from: "engaged", to: "leads" },
    { from: "leads", to: "qualified" },
    { from: "qualified", to: "quotes" },
    { from: "quotes", to: "bookings" },
    { from: "bookings", to: "completed" },
    { from: "completed", to: "paid" },
  ],
});

const FUNNEL_LABELS: Record<string, string> = {
  visitors: "Visitors",
  engaged: "Engaged",
  leads: "Leads",
  qualified: "Qualified",
  quotes: "Quotes",
  bookings: "Bookings",
  completed: "Completed",
  paid: "Paid",
};

export default function Phase2F4FunnelAnalytics() {
  const theme = useHostTheme();

  return (
    <Stack gap={20}>
      <Stack gap={8}>
        <H1>Phase 2F.4 — Funnel and business analytics</H1>
        <Text tone="secondary">
          Admin-only, server-aggregated dashboard over existing rows. No new tracking, no
          TimelineEvent copies, no automation. Waiting for approval before code.
        </Text>
        <Row gap={8} wrap>
          <Pill size="sm">Live queries</Pill>
          <Pill size="sm">Asia/Dubai</Pill>
          <Pill size="sm" tone="warning">
            No UTM
          </Pill>
          <Pill size="sm" tone="warning">
            Amounts are labels
          </Pill>
        </Row>
      </Stack>

      <Callout tone="success" title="Locked — still waiting to implement">
        Timezone Asia/Dubai in code. Qualified CRM and HOT/WARM are separate metrics, not
        one funnel stage. Quoted / Invoiced / Paid are status counts only. New route{" "}
        <Code>/admin/analytics</Code>; keep the operations inbox. Technician and content
        manager cannot open analytics.
      </Callout>

      <Grid columns={4} gap={12}>
        <Stat value="client|server" label="Event.source today (not traffic)" />
        <Stat value="String" label="Quote/invoice totalLabel" tone="warning" />
        <Stat value="unconfigured" label="Payment.status" tone="warning" />
        <Stat value="None" label="Business timezone in DB" />
      </Grid>

      <H2>A. Funnel definitions</H2>
      <FunnelSvg />
      <Text tone="secondary" size="small">
        Each stage is an independent count in the selected Dubai date range. Conversion is
        stage / previous stage. If the denominator is 0, show an em dash, never 0%.
      </Text>
      <Table
        headers={["Stage", "Count definition", "Excluded"]}
        rows={[
          [
            "Visitors",
            "Distinct AnalyticsEvent.visitorId with any event in range (opt-out visitors omitted)",
            "PAGE_VIEW-only is still a visitor; not engaged",
          ],
          [
            "Engaged",
            "Distinct visitorId with at least one engagement event in range (see D)",
            "PAGE_VIEW, SHARE, form SUBMIT, PHOTO_UPLOAD",
          ],
          [
            "Leads",
            "Lead.createdAt in range",
            "quarantined SPAM (shown as its own KPI, not in the funnel)",
          ],
          [
            "Qualified (CRM)",
            "Leads in range whose LeadStatus is past NEW and not LOST/CANCELLED",
            "Not the same as HOT/WARM",
          ],
          [
            "HOT / WARM (quality)",
            "LeadScore.effectiveClass in range — shown next to the funnel, not as the Qualified stage",
            "Do not replace CRM Qualified",
          ],
          ["Quotes", "Quote.createdAt in range", "None besides RBAC"],
          ["Bookings", "Booking.createdAt in range (requests)", "Cancelled still counted as requests unless filter says otherwise"],
          [
            "Completed",
            "Booking.status completed with updatedAt/createdAt in range, or WorkOrder.status completed",
            "Do not double-count; prefer booking.completed, else WO",
          ],
          [
            "Paid",
            "Invoice.status = PAID with createdAt or updatedAt in range",
            "Payment.status unconfigured is not paid",
          ],
        ]}
        striped
      />

      <H2>B. KPI definitions</H2>
      <Table
        headers={["Card", "Real source", "Empty state"]}
        rows={[
          ["Visitors / Engaged", "AnalyticsEvent distinct visitorId", "No data yet."],
          ["Leads", "Lead count in range", "No data yet."],
          ["Qualified / HOT / REVIEW / SPAM", "LeadStatus + LeadScore.effectiveClass", "No data yet."],
          ["Quotes / Booking requests / Confirmed", "Quote / Booking createdAt; confirmedAt for confirmed", "No data yet."],
          ["Completed jobs", "Booking or WorkOrder completed", "No data yet."],
          ["Invoices / Paid invoices", "Invoice.status ISSUED+ / PAID", "No data yet."],
          ["Reviews", "Review type=service and APPROVED or VERIFIED", "No data yet."],
          ["AMC", "AmcContract derived from startDate/endDate", "No data yet."],
        ]}
        striped
      />
      <Text>
        Previous-period delta only when the previous window has a non-zero count for that KPI.
        Insufficient data → hide the comparison, do not show +0% or −100% from empty.
      </Text>

      <H2>C. Database / query strategy</H2>
      <Grid columns={2} gap={12}>
        <Card>
          <CardHeader>Server aggregation</CardHeader>
          <CardBody>
            <Stack gap={6}>
              <Text>
                One server module <Code>src/lib/insights/</Code> runs Prisma{" "}
                <Code>count</Code> / <Code>groupBy</Code> with date bounds. Nothing ships raw
                event arrays to the browser.
              </Text>
              <Text>
                Funnel visitors/engaged: <Code>groupBy visitorId</Code> filtered by{" "}
                <Code>name</Code> + <Code>createdAt</Code> (existing indexes).
              </Text>
              <Text>
                Quality: <Code>LeadScore.groupBy effectiveClass</Code> joined through leads in
                range. Average score via <Code>_avg</Code>. Histogram buckets 0–19 … 80–100.
              </Text>
              <Text>No daily snapshot table in 2F.4. Live queries with indexes.</Text>
            </Stack>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>What we will not query</CardHeader>
          <CardBody>
            <Stack gap={6}>
              <Text>No public RSC pages import insights.</Text>
              <Text>No AiConversation.messages.</Text>
              <Text>No phone/email identity merge (same as 2F.3).</Text>
              <Text>No parse-float on totalLabel to fake AED totals.</Text>
            </Stack>
          </CardBody>
        </Card>
      </Grid>

      <H2>D. Date-range logic</H2>
      <Text>
        No timezone is stored today. Use a single business zone <Code>Asia/Dubai</Code> in
        code (not the browser). Presets: today, yesterday, last 7 days, last 30 days, this
        month, previous month, custom <Code>from</Code>/<Code>to</Code> (inclusive dates,
        exclusive end instant). Previous period = the immediately preceding window of the
        same length.
      </Text>

      <H2>E. Service analytics</H2>
      <Text>
        Rows are active services only. Metrics attach by <Code>serviceId</Code> on Lead /
        Quote / Booking / WorkOrder / Invoice, and by <Code>SERVICE_VIEW.entityId = slug</Code>{" "}
        for views. A service with zero attached rows in range is omitted (not shown as
        zeros that look like activity).
      </Text>
      <Table
        headers={["Metric", "Join"]}
        rows={[
          ["Visitors / views", "Distinct visitorId on SERVICE_VIEW for that slug"],
          ["Leads / qualified / HOT", "Lead.serviceId + LeadScore"],
          ["Quotes / bookings / completed", "Quote/Booking/WO.serviceId"],
          ["Invoices", "Invoice.serviceLabel or quote/booking serviceId — prefer FK path"],
          ["Reviews", "Review.type=service and Review.serviceId"],
          ["Paid amount", "Not a number today → omit amount, show paid invoice count if invoices perm"],
        ]}
        striped
      />

      <H2>F. Location analytics</H2>
      <Text>
        Emirate = <Code>locationId</Code> (Location.type emirate). City/area = stored{" "}
        <Code>city</Code>/<Code>area</Code> strings or <Code>cityId</Code>/<Code>areaId</Code>{" "}
        when present. If both are null, bucket <Code>Unknown / not captured</Code>. Never
        guess city from a URL.
      </Text>

      <H2>G. Attribution limitations</H2>
      <Callout tone="warning" title="Do not invent traffic source">
        AnalyticsEvent.source is client vs server ingest, not Google/campaign. There is no
        UTM, referrer, or campaign field. Landing path = first PAGE_VIEW.path in range (or
        visitor lifetime first view if you drill a single visitor). Lead.source is form
        channel: quote, booking, contact, ai. Dashboard Source Performance uses that form
        channel plus landing path. Everything else is Unknown / not captured. Tracking
        ingest stays unchanged.
      </Callout>

      <H2>H. Revenue logic</H2>
      <Table
        headers={["Label", "Meaning", "Not allowed"]}
        rows={[
          ["Quoted", "Count of quotes in range. totalLabel is display text only.", "Summing AED from totalLabel"],
          ["Invoiced", "Count of invoices with status ISSUED, PARTIALLY_PAID, PAID, or OVERDUE", "Treating DRAFT as invoiced"],
          ["Paid", "Count of invoices with status PAID", "Payment.status unconfigured, quote totals, invoice totals"],
        ]}
        striped
      />

      <H2>I. RBAC visibility matrix</H2>
      <Table
        headers={["Role", "/admin/analytics", "Sees"]}
        rows={[
          ["technician", "No", "Existing assigned work-order cards on /admin only"],
          ["content_manager", "No", "No financial or identifiable funnel; reviews stay on /admin"],
          ["supervisor", "Yes, operations slice", "Bookings, work orders, completion. No visitors, leads, quotes, invoices"],
          ["sales", "Yes, sales slice", "Leads, quality, quotes, bookings. No invoices, paid, AMC value"],
          ["customer_service", "Yes, CS slice", "Leads, bookings, reviews. No quotes or invoices"],
          ["manager / super_admin", "Yes, full", "All sections including invoices/paid counts and AMC"],
        ]}
        striped
      />
      <Text>Enforcement is server-side in the insights query, not CSS hiding.</Text>

      <H2>J. Performance / index strategy</H2>
      <Table
        headers={["Table", "Add"]}
        rows={[
          ["Lead", "createdAt, status, serviceId, locationId"],
          ["Booking", "createdAt, status, type, serviceId, locationId, supervisorId"],
          ["WorkOrder", "createdAt, status, supervisorId"],
          ["Quote", "createdAt, status"],
          ["Invoice", "createdAt, status"],
          ["Review", "createdAt, type, status"],
          ["AmcContract", "endDate"],
          ["AnalyticsEvent", "already has createdAt, visitorId+createdAt, name+createdAt"],
        ]}
        striped
      />
      <Text>
        Cap service/location tables (e.g. top 50 by leads). Paginate drill-down lists (existing
        take 200). Date filter is mandatory (default last 30 days).
      </Text>

      <H2>K. Admin route / UI architecture</H2>
      <Text>
        Keep <Code>/admin</Code> as the operational inbox. New <Code>/admin/analytics</Code>{" "}
        with query-string filters. KPI cards link to existing lists with the same filters
        (extend leads/bookings/quotes/invoices/reviews searchParams). Lead detail still
        hosts the 2F.3 timeline. No new nav children beyond one Analytics link, hidden when
        the role cannot view it.
      </Text>
      <Text>
        Page sections in order: Overview → Funnel → Lead quality → Service → Location →
        Source (form channel + landing path) → Operations → Reviews / AMC.
      </Text>

      <H2>L. Required database changes</H2>
      <Text>
        Indexes only. No TimelineEvent, no AnalyticsSnapshot, no UTM columns, no numeric
        money fields in this phase (amounts are not trustworthy yet).
      </Text>

      <H2>M. Files to change (after approval)</H2>
      <Table
        headers={["File", "Role"]}
        rows={[
          ["prisma/schema.prisma + migration", "Date/filter indexes"],
          ["src/lib/insights/dates.ts", "Asia/Dubai presets + previous window"],
          ["src/lib/insights/engagement.ts", "Engaged event allowlist"],
          ["src/lib/insights/query.ts", "Server aggregations + RBAC section gates"],
          ["src/lib/insights/rbac.ts", "canViewAnalytics + section visibility"],
          ["src/app/admin/analytics/page.tsx", "Dashboard UI"],
          ["src/components/admin/Ui.tsx", "Analytics nav link (not for tech/CM)"],
          ["src/app/admin/leads|bookings|quotes|invoices/page.tsx", "Filter query params for drill-down"],
          ["scripts/phase-2f4-verify.ts", "Definitions, zeros, RBAC, no PAGE_VIEW engagement"],
        ]}
        striped
      />

      <H2>N. Test strategy</H2>
      <Table
        headers={["Test", "Expect"]}
        rows={[
          ["PAGE_VIEW only", "Visitor yes, engaged no"],
          ["SERVICE_VIEW", "Engaged yes"],
          ["Zero denominator", "Conversion shows —"],
          ["Empty range", "No data yet. not fabricated zeros on service rows"],
          ["Quarantined SPAM", "KPI yes, funnel leads no"],
          ["DIY Review.type=guide", "Not in service review KPIs"],
          ["Payment unconfigured", "Not paid"],
          ["Same-phone two visitors", "Not merged"],
          ["technician / content_manager", "Forbidden on /admin/analytics"],
          ["Public pages", "insights module unused"],
        ]}
        striped
      />

      <CollapsibleSection title="Engagement event allowlist (locked proposal)" defaultOpen>
        <Text>
          Engaged visitor = distinct <Code>visitorId</Code> with ≥1 of: SERVICE_VIEW,
          LOCATION_VIEW, DIY_VIEW, AI_OPEN, AI_MESSAGE, AI_SERVICE_SUGGESTION, AI_HANDOVER,
          QUOTE_START, BOOKING_START, WHATSAPP_CLICK, PHONE_CLICK, EMAIL_CLICK. A home-page
          refresh (PAGE_VIEW only) is not engagement.
        </Text>
      </CollapsibleSection>

      <Divider />
      <Text tone="secondary" size="small">
        ALNAJAH ALDAEM · Phase 2F.4 plan · inspect-only · 7 Sep 2026
      </Text>
      <span style={{ color: theme.text.tertiary, fontSize: 12 }}>Host theme tokens</span>
    </Stack>
  );
}

function FunnelSvg() {
  const theme = useHostTheme();
  return (
    <svg
      width="100%"
      viewBox={`0 0 ${FUNNEL.width} ${FUNNEL.height}`}
      role="img"
      aria-label="Funnel from visitors through engaged, leads, qualified, quotes, bookings, completed, paid"
    >
      {FUNNEL.edges.map((edge) => (
        <line
          key={`${edge.from}-${edge.to}`}
          x1={edge.sourceX}
          y1={edge.sourceY}
          x2={edge.targetX}
          y2={edge.targetY}
          stroke={theme.stroke.secondary}
          strokeWidth={1}
        />
      ))}
      {FUNNEL.nodes.map((node) => (
        <g key={node.id}>
          <rect
            x={node.x}
            y={node.y}
            width={100}
            height={34}
            rx={4}
            fill={theme.fill.tertiary}
            stroke={theme.stroke.primary}
          />
          <text
            x={node.x + 50}
            y={node.y + 22}
            textAnchor="middle"
            fill={theme.text.primary}
            fontSize={11}
          >
            {FUNNEL_LABELS[node.id]}
          </text>
        </g>
      ))}
    </svg>
  );
}
