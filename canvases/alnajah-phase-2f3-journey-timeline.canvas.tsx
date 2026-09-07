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
  Table,
  Text,
  computeDAGLayout,
  useHostTheme,
} from "cursor/canvas";

const IDENTITY = computeDAGLayout({
  direction: "horizontal",
  nodeWidth: 118,
  nodeHeight: 34,
  rankGap: 40,
  nodeGap: 16,
  padding: 8,
  nodes: [
    { id: "visitor" },
    { id: "session" },
    { id: "events" },
    { id: "ai" },
    { id: "lead" },
    { id: "customer" },
    { id: "booking" },
    { id: "review" },
    { id: "question" },
  ],
  edges: [
    { from: "visitor", to: "session" },
    { from: "session", to: "events" },
    { from: "visitor", to: "ai" },
    { from: "visitor", to: "lead" },
    { from: "visitor", to: "customer" },
    { from: "visitor", to: "booking" },
    { from: "visitor", to: "review" },
    { from: "visitor", to: "question" },
  ],
});

const IDENTITY_LABELS: Record<string, string> = {
  visitor: "Visitor",
  session: "VisitSession",
  events: "AnalyticsEvent",
  ai: "AI conversation",
  lead: "Lead",
  customer: "Customer",
  booking: "Booking",
  review: "Review",
  question: "Question",
};

const COMMERCIAL = computeDAGLayout({
  direction: "horizontal",
  nodeWidth: 118,
  nodeHeight: 34,
  rankGap: 40,
  nodeGap: 16,
  padding: 8,
  nodes: [
    { id: "lead" },
    { id: "score" },
    { id: "customer" },
    { id: "quote" },
    { id: "booking" },
    { id: "wo" },
    { id: "invoice" },
    { id: "pay" },
    { id: "amc" },
    { id: "review" },
  ],
  edges: [
    { from: "lead", to: "score" },
    { from: "lead", to: "booking" },
    { from: "customer", to: "quote" },
    { from: "customer", to: "booking" },
    { from: "customer", to: "wo" },
    { from: "customer", to: "invoice" },
    { from: "customer", to: "amc" },
    { from: "booking", to: "wo" },
    { from: "booking", to: "review" },
    { from: "invoice", to: "pay" },
  ],
});

const COMMERCIAL_LABELS: Record<string, string> = {
  lead: "Lead",
  score: "LeadScore",
  customer: "Customer",
  quote: "Quote",
  booking: "Booking",
  wo: "WorkOrder",
  invoice: "Invoice",
  pay: "Payment",
  amc: "AMC",
  review: "Review",
};

export default function Phase2F3JourneyTimeline() {
  const theme = useHostTheme();

  return (
    <Stack gap={20}>
      <Stack gap={8}>
        <H1>Phase 2F.3 — Customer and order journey</H1>
        <Text tone="secondary">
          Read-time timeline over existing records. No duplicate business tables, no
          public tracking changes, no funnel / automation / notifications. Waiting for
          approval before any code.
        </Text>
        <Row gap={8} wrap>
          <Pill size="sm">Presentation layer</Pill>
          <Pill size="sm">FK identity only</Pill>
          <Pill size="sm" tone="warning">
            No UTM stored
          </Pill>
          <Pill size="sm">13-month analytics unchanged</Pill>
        </Row>
      </Stack>

      <Callout tone="success" title="Locked — still waiting to implement">
        Embed on customer, lead, booking, and work-order detail (no new top-nav).
        Identity walk is visitorId / customerId / leadId / bookingId only — never
        phone or email merge. Schema: indexes, Quote/Invoice Prisma FKs, and
        assignment audit. No TimelineEvent table and no UTM ingest. Technician:
        assigned work-order slice only. Content manager: no identifiable journey.
      </Callout>

      <Grid columns={4} gap={12}>
        <Stat value="Read-time" label="Timeline assembly" tone="info" />
        <Stat value="Not stored" label="UTM / referrer / IP" />
        <Stat value="Unindexed" label="AuditLog today" tone="warning" />
        <Stat value="Authoritative" label="humanClass override" tone="success" />
      </Grid>

      <H2>A. Timeline architecture</H2>
      <Text>
        A journey is a sorted list of <Code>TimelineItem</Code> objects produced by{" "}
        <Code>buildJourney(scope, role)</Code>. Source of truth stays on the original
        rows. The aggregator never writes a second copy of a lead, quote, booking, or
        invoice.
      </Text>
      <Grid columns={2} gap={12}>
        <Card>
          <CardHeader>In 2F.3</CardHeader>
          <CardBody>
            <Stack gap={6}>
              <Text>Resolve an identity graph from one starting entity.</Text>
              <Text>Fetch bounded slices (analytics cap, audit by entity IDs).</Text>
              <Text>Map each source row to a typed timeline item.</Text>
              <Text>Filter by RBAC, opt-out, and privacy allowlists.</Text>
              <Text>Paginate by <Code>occurredAt</Code> (newest first, 50 per page).</Text>
            </Stack>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>Explicitly not in 2F.3</CardHeader>
          <CardBody>
            <Stack gap={6}>
              <Text>No new Tracker fields, cookies, or ingest names.</Text>
              <Text>No funnel dashboard, automation, or notifications.</Text>
              <Text>No AI transcript on the timeline.</Text>
              <Text>No phone/email identity merge.</Text>
              <Text>No change to 2F.1 retention (397 days, still unscheduled).</Text>
            </Stack>
          </CardBody>
        </Card>
      </Grid>

      <H2>B. Event aggregation strategy</H2>
      <Text>
        Mix three source classes. Collapse noisy analytics. Prefer explicit timestamps
        over <Code>updatedAt</Code> when both exist.
      </Text>
      <Table
        headers={["Source class", "Examples", "How 2F.3 uses it"]}
        rows={[
          [
            "AnalyticsEvent",
            "PAGE_VIEW, SERVICE_VIEW, AI_*, *_SUBMIT",
            "First/last PAGE_VIEW only; cap 40 important events; never dump thousands of views",
          ],
          [
            "Business row",
            "Lead, LeadScore, Quote, Booking, WorkOrder, Invoice, Payment, Review, AMC",
            "createdAt / sentAt / confirmedAt / status as one item each",
          ],
          [
            "AuditLog",
            "lead.quality.override, booking.confirm, quote.update, work_order.update",
            "Staff actions and status changes that have no history table",
          ],
        ]}
        striped
      />
      <Text tone="secondary" size="small">
        Source: prisma/schema.prisma + src/lib/analytics/types.ts + admin audit writers · 7 Sep 2026
      </Text>

      <H2>C. Relationship map</H2>
      <H3>Identity (visitorId / customerId)</H3>
      <IdentitySvg />
      <Text tone="secondary" size="small">
        Solid Prisma relations. Visitor.customerId and Customer.visitorId are a dual
        pointer set by stampVisitor after a successful write.
      </Text>
      <H3>Commercial (order graph)</H3>
      <CommercialSvg />
      <Callout tone="warning" title="Loose IDs today — walk as strings, do not invent rows">
        Quote.leadId, Invoice.quoteId / bookingId / workOrderId, and
        AiConversation.leadId / bookingId are fields without Prisma relations. 2F.3
        should query them by ID. Phone matching is out of scope (can merge strangers).
        Public createLead often leaves Lead.customerId null until a booking upserts a
        Customer.
      </Callout>

      <H2>D. Timeline record types</H2>
      <Text>
        One presentation type: <Code>kind</Code>, <Code>occurredAt</Code>,{" "}
        <Code>actorKind</Code> (system / customer / staff / transaction),{" "}
        <Code>entity</Code>, <Code>title</Code>, allowlisted <Code>facts</Code>, optional
        deep-link. Human override remains a first-class item and the quality panel
        still shows live <Code>effectiveClass</Code> from LeadScore.
      </Text>
      <Table
        headers={["Kind", "Actor", "Source", "Facts allowed"]}
        rows={[
          ["visitor.first_seen", "system", "Visitor.createdAt", "opaque visitor id, optedOut flag"],
          ["visit.landing", "customer", "first PAGE_VIEW", "path only — not UTM"],
          ["visit.important_view", "customer", "SERVICE/LOCATION/DIY_VIEW", "entity slug, count if collapsed"],
          ["ai.opened", "customer", "AI_OPEN", "locale if stored"],
          ["ai.summary", "system", "AI_MESSAGE + conversation", "message count, photo count — never messages JSON"],
          ["ai.suggestion", "system", "AI_SERVICE_SUGGESTION", "slug, riskClass from allowlisted meta"],
          ["ai.handover", "system", "AI_HANDOVER", "handover occurred"],
          ["lead.created", "customer", "Lead + lead.create audit", "source, service, location"],
          ["lead.scored", "system", "LeadScore / history SYSTEM|RECOMPUTE", "score, systemClass, reasons, computedAt"],
          ["lead.override", "staff", "history OVERRIDE", "humanClass, effectiveClass, note, actor"],
          ["quote.created", "staff", "Quote.createdAt", "number, status, service/location labels"],
          ["quote.sent", "staff", "sentAt / SENT", "sentAt"],
          ["quote.decided", "customer", "ACCEPTED / REJECTED", "status, updatedAt (no dedicated history)"],
          ["booking.requested", "customer", "Booking.createdAt", "number, type"],
          ["booking.confirmed", "staff", "confirmedAt", "confirmed date/time"],
          ["booking.assigned", "staff", "technicianId + new audit", "staff codes, not private notes"],
          ["work_order.created", "staff", "WorkOrder.createdAt", "number, status"],
          ["work_order.started", "staff", "status in_progress", "from audit or current status+updatedAt"],
          ["work_order.qc", "staff", "qcResult / qc_failed", "pass/fail text, not customer finance"],
          ["work_order.completed", "staff", "status completed", "completed"],
          ["invoice.created", "transaction", "Invoice", "number, status — amounts only if invoices perm"],
          ["payment.recorded", "transaction", "Payment", "status (today: unconfigured)"],
          ["review.submitted", "customer", "Review", "stars, status — not hidden moderation internals for techs"],
          ["amc.active", "transaction", "AmcContract", "start/end, frequency — value only with invoices perm"],
        ]}
        striped
      />

      <H2>E. Data model changes</H2>
      <Text>
        No TimelineEvent table. Recommended schema work is indexes and one missing
        staff audit, not new business entities.
      </Text>
      <Table
        headers={["Change", "Need", "2F.3?"]}
        rows={[
          ["AuditLog indexes (entity, entityId, createdAt)", "Timeline queries", "Yes"],
          ["Index Quote.leadId, Invoice.customerId / quoteId / bookingId", "Graph walk", "Yes"],
          ["Audit on assignBookingStaff", "Item 14 has no audit today", "Yes"],
          ["Prisma FK Quote→Lead / Invoice→Quote/Booking/WorkOrder", "Integrity", "Yes — locked"],
          ["UTM/referrer columns or ingest keys", "True source attribution", "No — would change 2F.1 tracking"],
          ["Status history tables", "Perfect quote/WO diffs", "No — derive from audit + timestamps"],
          ["TimelineEvent copy table", "Duplicates source of truth", "No"],
        ]}
        striped
      />

      <H2>F. Admin routes / UI</H2>
      <Text>
        Recommended: no new top-nav item. Shared <Code>JourneyTimeline</Code> on
        existing detail pages. Customer is the hub; lead/booking/WO show the same
        aggregator scoped to that starting entity.
      </Text>
      <Table
        headers={["Route", "Who", "What"]}
        rows={[
          ["/admin/customers/[id]", "customers perm", "Full allowed journey + quality summary"],
          ["/admin/leads/[id]", "leads perm", "Same panel; keep 2F.2 quality + visitor summary"],
          ["/admin/bookings/[id]", "bookings perm", "Order-centric journey, still RBAC-filtered"],
          ["/admin/work-orders/[id]", "work_orders perm", "Operational slice; technicians assigned-only"],
        ]}
        striped
      />

      <H2>G. RBAC behavior</H2>
      <Table
        headers={["Role", "May open identifiable journey?", "Hidden"]}
        rows={[
          ["super_admin / manager", "Yes, full", "Nothing in this slice"],
          ["sales", "Yes via customers/leads", "Invoices, payments, pricing, AMC value, QC internals"],
          ["customer_service", "Yes via customers/leads", "Quotes totals, invoices, payments"],
          ["supervisor", "Booking/WO they can already open", "Visitor analytics, lead quality, quotes, invoices"],
          ["technician", "Assigned work order only", "Visitor, AI, lead, quote, invoice, unrelated jobs"],
          ["content_manager", "No", "All identifiable journey / finance"],
        ]}
        striped
      />
      <Text>
        Reuse existing <Code>can(role, permission)</Code>. Filter item kinds, not just
        the page. Quality override UI stays on the lead page with 2F.2 rules (human
        class still wins).
      </Text>

      <H2>H. Privacy model</H2>
      <Grid columns={2} gap={12}>
        <Card>
          <CardHeader>Never on the timeline</CardHeader>
          <CardBody>
            <Stack gap={6}>
              <Text>IP, user-agent, fingerprint, cookie values.</Text>
              <Text>Analytics meta outside slug / count / riskClass.</Text>
              <Text>AiConversation.messages and aiSummary dumps.</Text>
              <Text>Analytics events when Visitor.optedOut (same as 2F.2).</Text>
            </Stack>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>AI facts that are allowed</CardHeader>
          <CardBody>
            <Stack gap={6}>
              <Text>AI opened, message count, photo count.</Text>
              <Text>Suggested service slug, risk class, handover.</Text>
              <Text>Staff must already have the parent entity permission.</Text>
              <Text>Public Tracker / ingest / cookies unchanged.</Text>
            </Stack>
          </CardBody>
        </Card>
      </Grid>

      <H2>I. Performance strategy</H2>
      <Text>
        Identity resolution first (small ID sets), then parallel bounded queries. Cap
        analytics at 40 non-PAGE_VIEW events plus first and last PAGE_VIEW. Collapse
        repeat SERVICE_VIEW / LOCATION_VIEW / DIY_VIEW into count items. Timeline page
        size 50. Never <Code>findMany</Code> all events for a busy visitor.
      </Text>

      <H2>J. Query / index strategy</H2>
      <Table
        headers={["Query", "Existing index", "Add"]}
        rows={[
          ["AnalyticsEvent by visitorId, createdAt", "Yes", "No"],
          ["LeadScoreHistory by leadId, createdAt", "Yes", "No"],
          ["AuditLog by entity+entityId+createdAt", "None", "Yes"],
          ["Quote by leadId / customerId", "None", "Yes"],
          ["Invoice by customerId / quoteId / bookingId", "None", "Yes"],
          ["WorkOrder by bookingId / technicianId", "None on technicianId", "Yes technicianId"],
        ]}
        striped
      />

      <H2>K. Source attribution model</H2>
      <Text>
        2F.1 did not store UTM, referrer, or campaign. First-touch = earliest PAGE_VIEW
        path (landing). Last-touch = PAGE_VIEW immediately before the first conversion
        event (QUOTE_START/SUBMIT, BOOKING_START/SUBMIT, CONTACT_SUBMIT, AI_OPEN). Label
        missing attribution as unknown. Do not infer channel from locale or IP.
      </Text>

      <H2>L. Quote / booking / work-order / invoice mapping</H2>
      <Table
        headers={["Business state", "Timeline item", "Clock"]}
        rows={[
          ["Quote DRAFT", "quote.created", "createdAt"],
          ["Quote SENT / sentAt", "quote.sent", "sentAt"],
          ["Quote ACCEPTED / REJECTED", "quote.decided", "updatedAt + audit quote.update"],
          ["Booking requested", "booking.requested", "createdAt"],
          ["pending_confirmation → confirmed", "booking.confirmed", "confirmedAt"],
          ["Staff assigned", "booking.assigned", "new audit (gap today)"],
          ["WO created / assigned / in_progress", "work_order.*", "createdAt or audit"],
          ["QC result / qc_failed", "work_order.qc", "updatedAt + qcResult"],
          ["Booking/WO completed", "work_order.completed", "status + audit booking.completed"],
          ["Invoice DRAFT/ISSUED/PAID", "invoice.*", "createdAt / audit"],
          ["Payment row", "payment.recorded", "createdAt — gateway still unconfigured"],
        ]}
        striped
      />

      <H2>M. Future funnel integration</H2>
      <Text>
        Funnel, automation, notifications, and revenue attribution should count the same
        <Code>kind</Code> vocabulary later. 2F.3 only needs stable kind names and the
        identity graph. Do not pre-compute funnel tables now.
      </Text>
      <Row gap={8} wrap>
        <Pill size="sm" tone="info">
          funnel dashboard later
        </Pill>
        <Pill size="sm" tone="info">
          automation later
        </Pill>
        <Pill size="sm" tone="info">
          notifications later
        </Pill>
        <Pill size="sm" tone="info">
          revenue attribution later
        </Pill>
      </Row>

      <H2>N. Files to change (after approval)</H2>
      <Table
        headers={["File", "Role"]}
        rows={[
          ["prisma/schema.prisma + migration", "Indexes only (optional FKs if locked)"],
          ["src/lib/journey/types.ts", "TimelineItem, kinds, actorKind"],
          ["src/lib/journey/graph.ts", "Identity expansion via FKs / loose IDs"],
          ["src/lib/journey/aggregate.ts", "Read-time merge, caps, pagination"],
          ["src/lib/journey/rbac.ts", "Kind filters per role"],
          ["src/lib/journey/privacy.ts", "Opt-out + AI/analytics allowlist"],
          ["src/components/admin/JourneyTimeline.tsx", "Shared admin UI"],
          ["src/app/admin/customers/[id]/page.tsx", "Hub timeline"],
          ["src/app/admin/leads/[id]/page.tsx", "Add timeline; keep 2F.2 quality"],
          ["src/app/admin/bookings/[id]/page.tsx", "Order timeline"],
          ["src/app/admin/work-orders/[id]/page.tsx", "Operational slice"],
          ["src/lib/bookings.ts", "Audit assignment only — no public booking change"],
          ["scripts/phase-2f3-verify.ts", "RBAC, opt-out, caps, no transcript"],
        ]}
        striped
      />

      <CollapsibleSection title="Current gaps that affect completeness" defaultOpen={false}>
        <Stack gap={6}>
          <Text>
            assignBookingStaff writes technicianId but no AuditLog. Timeline item 14
            needs that audit added.
          </Text>
          <Text>
            Quote and work-order status history is the current row plus generic
            update audits, not from/to snapshots.
          </Text>
          <Text>
            Payment.status defaults to unconfigured — show honestly, do not fake a
            gateway.
          </Text>
          <Text>
            Question.customerId has no Prisma Customer relation. Include questions via
            visitorId when present.
          </Text>
        </Stack>
      </CollapsibleSection>

      <Divider />
      <Text tone="secondary" size="small">
        ALNAJAH ALDAEM · Phase 2F.3 plan · inspect-only · 7 Sep 2026
      </Text>
      <span style={{ color: theme.text.tertiary, fontSize: 12 }}>
        Colors from host theme tokens
      </span>
    </Stack>
  );
}

function IdentitySvg() {
  const theme = useHostTheme();
  return (
    <svg
      width="100%"
      viewBox={`0 0 ${IDENTITY.width} ${IDENTITY.height}`}
      role="img"
      aria-label="Visitor identity relationships to session, events, AI, lead, customer, booking, review, and question"
    >
      {IDENTITY.edges.map((edge) => (
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
      {IDENTITY.nodes.map((node) => (
        <g key={node.id}>
          <rect
            x={node.x}
            y={node.y}
            width={118}
            height={34}
            rx={4}
            fill={theme.fill.tertiary}
            stroke={theme.stroke.primary}
          />
          <text
            x={node.x + 59}
            y={node.y + 22}
            textAnchor="middle"
            fill={theme.text.primary}
            fontSize={11}
          >
            {IDENTITY_LABELS[node.id]}
          </text>
        </g>
      ))}
    </svg>
  );
}

function CommercialSvg() {
  const theme = useHostTheme();
  return (
    <svg
      width="100%"
      viewBox={`0 0 ${COMMERCIAL.width} ${COMMERCIAL.height}`}
      role="img"
      aria-label="Commercial relationships from lead and customer to quote, booking, work order, invoice, payment, AMC, and review"
    >
      {COMMERCIAL.edges.map((edge) => (
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
      {COMMERCIAL.nodes.map((node) => (
        <g key={node.id}>
          <rect
            x={node.x}
            y={node.y}
            width={118}
            height={34}
            rx={4}
            fill={theme.fill.tertiary}
            stroke={theme.stroke.primary}
          />
          <text
            x={node.x + 59}
            y={node.y + 22}
            textAnchor="middle"
            fill={theme.text.primary}
            fontSize={11}
          >
            {COMMERCIAL_LABELS[node.id]}
          </text>
        </g>
      ))}
    </svg>
  );
}
