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
  UsageBar,
  computeDAGLayout,
  useHostTheme,
} from "cursor/canvas";

const FLOW = computeDAGLayout({
  direction: "horizontal",
  nodeWidth: 132,
  nodeHeight: 36,
  rankGap: 36,
  nodeGap: 20,
  padding: 8,
  nodes: [
    { id: "form" },
    { id: "lead" },
    { id: "stamp" },
    { id: "signals" },
    { id: "score" },
    { id: "gates" },
    { id: "inbox" },
    { id: "review" },
    { id: "quarantine" },
  ],
  edges: [
    { from: "form", to: "lead" },
    { from: "lead", to: "stamp" },
    { from: "stamp", to: "signals" },
    { from: "signals", to: "score" },
    { from: "score", to: "gates" },
    { from: "gates", to: "inbox" },
    { from: "gates", to: "review" },
    { from: "gates", to: "quarantine" },
  ],
});

const LABELS: Record<string, string> = {
  form: "Form / AI / book",
  lead: "Lead row saved",
  stamp: "Stamp visitorId",
  signals: "Collect signals",
  score: "Score 0–100",
  gates: "Classify",
  inbox: "HOT/WARM/NORMAL",
  review: "REVIEW queue",
  quarantine: "SPAM quarantine",
};

export default function Phase2F2LeadQuality() {
  const theme = useHostTheme();

  return (
    <Stack gap={20}>
      <Stack gap={8}>
        <H1>Phase 2F.2 — Lead quality architecture</H1>
        <Text tone="secondary">
          Explainable 0–100 score and HOT / WARM / NORMAL / REVIEW / SPAM. No code until
          approval. Does not change LeadScore runtime until this plan is approved.
        </Text>
        <Row gap={8} wrap>
          <Pill size="sm">2F.1 events only as support</Pill>
          <Pill size="sm">No fingerprinting</Pill>
          <Pill size="sm">No public IP</Pill>
          <Pill size="sm">Never auto-delete</Pill>
        </Row>
      </Stack>

      <Callout tone="success" title="Locked decisions — still waiting to implement">
        Auto-SPAM only with 3 independent spam signals; 1–2 signals go to REVIEW. Any staff
        with leads permission may override to HOT/WARM/NORMAL/REVIEW; only manager or
        super_admin may set or restore SPAM. Recompute on lead create and again if a booking
        is later attached; a human override still wins for effectiveClass.
      </Callout>

      <Grid columns={4} gap={12}>
        <Stat value="Unused" label="LeadScore rows today" />
        <Stat value="After write" label="visitorId stamped" tone="info" />
        <Stat value="Not stored" label="Client IP on leads" />
        <Stat value="CRM pipeline" label="LeadStatus stays" tone="success" />
      </Grid>

      <H2>A. Architecture</H2>
      <Text>
        Quality is a parallel layer on Lead. It does not replace LeadStatus (NEW →
        QUALIFIED → …). A HOT lead can still be NEW. Scoring runs after the business
        write, same isolation as 2F.1 analytics: failure never fails quote, booking, or AI.
      </Text>
      <FlowSvg />
      <Text tone="secondary" size="small">
        Source: current Prisma Lead / LeadScore / Visitor / AnalyticsEvent · 7 Sep 2026
      </Text>

      <Grid columns={2} gap={12}>
        <Card>
          <CardHeader>What 2F.1 already gives</CardHeader>
          <CardBody>
            <Stack gap={6}>
              <Text>Visitor + VisitSession + AnalyticsEvent (13-month retention).</Text>
              <Text>
                Opaque cookies <Code>alnajah_vid</Code> / <Code>alnajah_sid</Code>, opt-out
                respected.
              </Text>
              <Text>
                After success: stamp <Code>Lead.visitorId</Code>, emit QUOTE_SUBMIT /
                BOOKING_SUBMIT / AI_* / PHOTO_UPLOAD.
              </Text>
              <Text>Honeypot field <Code>website</Code> never creates a lead.</Text>
              <Text>2-minute identical phone+requirement is treated as duplicate.</Text>
              <Text>Rate limit 5 leads / 10 min per IP is in-memory only — IP is not persisted.</Text>
            </Stack>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>What 2F.2 will not do</CardHeader>
          <CardBody>
            <Stack gap={6}>
              <Text>No funnel KPIs, automation engine, or notifications.</Text>
              <Text>No public UI, sitemap, robots, or Tracker changes.</Text>
              <Text>No device fingerprint, canvas ID, or third-party fraud script.</Text>
              <Text>No locale/name/ethnicity/gender as quality features.</Text>
              <Text>No automatic deletion. Unusual ≠ fake.</Text>
              <Text>LeadScore stays unread until this plan is approved and built.</Text>
            </Stack>
          </CardBody>
        </Card>
      </Grid>

      <H2>B. Scoring model</H2>
      <Text>
        Additive integer 0–100, versioned as <Code>2f2.1</Code>. Start at 40 (center of
        NORMAL). Add documented positive points, subtract documented suspicion points, clamp
        0–100. Classification then applies gates (REVIEW / SPAM) before score bands.
      </Text>
      <UsageBar
        total={100}
        topLeftLabel="Score bands after gates (not including REVIEW/SPAM overrides)"
        topRightLabel="0–100"
        segments={[
          { id: "normal", value: 20, color: "gray" },
          { id: "warm", value: 20, color: "yellow" },
          { id: "hot", value: 21, color: "green" },
        ]}
      />
      <Text tone="secondary" size="small">
        Visual: NORMAL 40–59 occupies the first filled span after the 0–39 remainder; WARM
        60–79; HOT 80–100. Remainder on the right of the bar is unused capacity above HOT.
        Source: proposed 2F.2 model · not live data.
      </Text>

      <Table
        striped
        headers={["Component", "Rule", "Points"]}
        columnAlign={["left", "left", "right"]}
        rows={[
          ["Base", "Every created lead (honeypot never reaches here)", "40"],
          ["Valid phone", "UAE-shaped: +971 or 05x, 8–20 digits after strip", "+12"],
          ["Valid email", "Contains @ and a dot; missing email is 0, not a penalty", "+8"],
          ["Clear requirement", "≥ 20 trimmed chars, not a single repeated character", "+10"],
          ["Service identified", "Active serviceId on the lead", "+8"],
          ["Emirate", "locationId present", "+6"],
          ["City", "city string present", "+4"],
          ["Area", "area string present", "+4"],
          ["Property type", "propertyType present", "+4"],
          ["Quote source", "source = quote", "+8"],
          ["Booking request", "source = booking or a Booking.leadId link exists", "+10"],
          ["Photo", "photos JSON array length ≥ 1", "+6"],
          ["AI interaction", "≥ 2 AI_MESSAGE and an AI_HANDOVER on this visitor", "+8"],
          ["Journey", "SERVICE_VIEW or LOCATION_VIEW before submit", "+6"],
          ["Contact click", "WHATSAPP_CLICK or PHONE_CLICK in session", "+4"],
          ["Invalid phone", "Fails UAE-shaped check", "−8"],
          ["Near-duplicate text", "Same requirement hash on ≥ 2 other leads in 24 h", "−10"],
          ["Burst", "≥ 4 leads same visitorId or same phone in 10 min", "−15"],
          ["Spam lexicon", "URL/crypto/SEO blast patterns in EN or AR", "−12"],
        ]}
      />
      <Text tone="secondary" size="small">
        Source: proposed 2F.2.1 weights. Reasons stored as code + points + human label, never
        as a free-text LLM guess.
      </Text>

      <H2>C. Signal list</H2>
      <Grid columns={2} gap={16}>
        <Stack gap={8}>
          <H3>Positive (form + events)</H3>
          <Table
            headers={["Signal", "From"]}
            rows={[
              ["valid_phone", "Lead.phone"],
              ["valid_email", "Lead.email (optional)"],
              ["clear_requirement", "Lead.requirement"],
              ["service_identified", "Lead.serviceId"],
              ["emirate_city_area", "Lead location/city/area"],
              ["property_info", "Lead.propertyType"],
              ["quote_request", "source=quote"],
              ["booking_request", "source=booking or Booking"],
              ["photo_submitted", "Lead.photos / Booking.photos"],
              ["ai_meaningful", "AI_MESSAGE count + AI_HANDOVER"],
              ["repeat_engagement", "views before submit"],
              ["contact_intent", "WHATSAPP_CLICK / PHONE_CLICK"],
            ]}
          />
        </Stack>
        <Stack gap={8}>
          <H3>Suspicious (never sole proof of fake)</H3>
          <Table
            headers={["Signal", "From"]}
            rows={[
              ["invalid_phone", "Lead.phone shape"],
              ["identical_requirement", "hash of requirement, 24 h"],
              ["submission_burst", "count by visitorId or phone"],
              ["spam_lexicon", "requirement text only"],
              ["honeypot", "website field — currently no row"],
              ["empty_requirement_quality", "too short / repeated char"],
            ]}
          />
          <Callout tone="info" title="Not signals">
            Locale, name, Arabic vs English, first-touch submit, missing email, missing
            visitor (opt-out), IP, user-agent, screen size, or “unusual path.”
          </Callout>
        </Stack>
      </Grid>

      <H2>D. Classification thresholds</H2>
      <Table
        striped
        headers={["Class", "Rule", "Staff meaning"]}
        rowTone={["success", "info", "neutral", "warning", "danger"]}
        rows={[
          ["HOT", "No REVIEW/SPAM gate and score ≥ 80", "Prioritize; still unconfirmed until staff"],
          ["WARM", "No gate and score 60–79", "Good completeness; follow in order"],
          ["NORMAL", "No gate and score 40–59 (or &lt; 40 without a gate)", "Ordinary inbox"],
          ["REVIEW", "1–2 spam signals, or burst without lexicon, or invalid phone + duplicate text", "Human must look; not hidden"],
          ["SPAM", "≥ 3 independent spam signals (recommended)", "Quarantine/archive; never delete"],
        ]}
      />
      <Text>
        Gates win over score. A 90-point lead with three spam signals is SPAM, not HOT. A
        35-point lead with no spam signals stays NORMAL, not SPAM — incomplete is not fake.
      </Text>

      <H2>E. Data model changes</H2>
      <Text>
        Evolve the unused <Code>LeadScore</Code> row (already 1:1 with Lead) and add history.
        Do not overload <Code>Lead.status</Code>.
      </Text>
      <Table
        headers={["Object", "Fields", "Notes"]}
        rows={[
          [
            "LeadScore",
            "score, systemClass, humanClass, effectiveClass, reasonsJson, modelVersion, computedAt, overrideAt, overrideBy, overrideNote, quarantined",
            "Keep model name; expand unused stub (score/band/explanation)",
          ],
          [
            "LeadScoreHistory",
            "leadId, score, systemClass, effectiveClass, reasonsJson, actor, cause, createdAt",
            "Every recompute and every human override",
          ],
          [
            "Enums",
            "LeadQualityClass HOT|WARM|NORMAL|REVIEW|SPAM; HistoryCause SYSTEM|OVERRIDE|RECOMPUTE",
            "New; LeadStatus unchanged",
          ],
          [
            "Indexes",
            "LeadScore.effectiveClass, LeadScore.quarantined, History.leadId+createdAt",
            "Admin list filters",
          ],
        ]}
      />

      <H2>F. Visitor events → leads</H2>
      <Text>
        Join is <Code>Lead.visitorId → Visitor.id → AnalyticsEvent</Code>. If visitor is
        missing or opted out, score form fields only and record reason{" "}
        <Code>no_journey</Code> at 0 points (not negative). Fetch at most the last 200 events
        for that visitor, using existing <Code>@@index([visitorId, createdAt])</Code>. Summarize
        counts by event name for admin: first visit = Visitor.createdAt, last visit =
        Visitor.lastSeenAt. Do not attach raw event rows to the public site. Do not show IP.
      </Text>

      <H2>G. Human override</H2>
      <Grid columns={3} gap={12}>
        <Card>
          <CardHeader>Preserve both decisions</CardHeader>
          <CardBody>
            <Text>
              <Code>systemClass</Code> is immutable for that computation.{" "}
              <Code>humanClass</Code> is the override. <Code>effectiveClass</Code> is what
              the inbox uses (human if set, else system).
            </Text>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>Required note</CardHeader>
          <CardBody>
            <Text>
              Override requires a short reason stored on the row and in history + AuditLog
              (<Code>lead.quality.override</Code>).
            </Text>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>Recompute vs lock</CardHeader>
          <CardBody>
            <Text>
              If humanClass is set, later recomputes update score and systemClass only;
              effectiveClass stays the human choice until cleared.
            </Text>
          </CardBody>
        </Card>
      </Grid>

      <H2>H. Spam / review handling</H2>
      <Table
        headers={["Case", "Action"]}
        rows={[
          ["Honeypot filled", "Keep current behavior: no lead row (already not in inbox)"],
          ["REVIEW", "Visible in default inbox with a REVIEW badge; staff works it"],
          ["SPAM (recommended 3-signal rule)", "quarantined=true; hidden from default list; not deleted"],
          ["Staff restore", "Clear quarantine, set humanClass to NORMAL/WARM/HOT/REVIEW"],
          ["Duplicate 2-minute window", "No second row; do not score a duplicate as spam"],
        ]}
      />

      <H2>I. Privacy</H2>
      <Callout tone="neutral" title="Quality must not punish privacy">
        Opt-out and missing visitorId must not lower the score. Do not persist IP, user-agent,
        or fingerprint on LeadScore. Reasons shown to staff are codes like invalid_phone, not
        raw fraud internals on any public page. AI transcripts stay out of analytics meta
        (2F.1) and out of reasons JSON. Scoring reads requirement length/lexicon only, not
        the full chat log.
      </Callout>

      <H2>J. Performance</H2>
      <Text>
        Run <Code>scoreLead(id)</Code> after stampVisitor, in a try/catch, never blocking
        the HTTP 200. One extra indexed event query (capped) plus lead field reads. Admin
        list reads denormalized LeadScore only — no event scan per row. No scoring on
        PAGE_VIEW. No analytics queries on public SSR.
      </Text>

      <H2>K. Admin integration (2F.2 only)</H2>
      <Text>
        Extend existing <Code>/admin/leads</Code> and <Code>/admin/leads/[id]</Code>. Roles
        with <Code>leads</Code> permission (super_admin, manager, customer_service, sales)
        see score/class. Default list excludes quarantined SPAM; filter chip to show them.
        Detail shows: score, system vs human class, reasons, source, service, location,
        linked bookings/quotes by leadId, visitor first/last, journey event counts. No
        funnel dashboard in this slice.
      </Text>

      <H2>L. Files to change (after approval)</H2>
      <CollapsibleSection title="Proposed file list" defaultOpen>
        <Table
          headers={["File", "Change"]}
          rows={[
            ["prisma/schema.prisma", "Expand LeadScore; add LeadScoreHistory + enums"],
            ["prisma/migrations/…_phase2f2_lead_quality", "Migrate unused stub columns"],
            ["src/lib/quality/signals.ts", "Pure signal extractors"],
            ["src/lib/quality/score.ts", "0–100 + reasons + version"],
            ["src/lib/quality/classify.ts", "Gates then bands"],
            ["src/lib/quality/run.ts", "Load lead, events, upsert score, history"],
            ["src/lib/leads.ts", "Fire-and-forget score after create"],
            ["src/lib/bookings.ts", "Same after booking lead"],
            ["src/app/admin/leads/page.tsx", "Score, class, hide quarantined"],
            ["src/app/admin/leads/[id]/page.tsx", "Reasons, journey, override form"],
            ["src/app/admin/actions.ts", "overrideLeadQualityAction"],
            ["scripts/phase-2f2-verify.ts", "Score fixtures; analytics still isolated"],
          ]}
        />
      </CollapsibleSection>

      <Divider />
      <Text tone="secondary" size="small">
        ALNAJAH ALDAEM · Phase 2F.2 plan · inspect-only · 7 Sep 2026
      </Text>
    </Stack>
  );
}

function FlowSvg() {
  const theme = useHostTheme();
  return (
    <svg
      width="100%"
      viewBox={`0 0 ${FLOW.width} ${FLOW.height}`}
      role="img"
      aria-label="Lead quality pipeline from form save to inbox, review, or quarantine"
    >
      {FLOW.edges.map((edge) => (
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
      {FLOW.nodes.map((node) => (
        <g key={node.id}>
          <rect
            x={node.x}
            y={node.y}
            width={132}
            height={36}
            rx={4}
            fill={theme.fill.tertiary}
            stroke={theme.stroke.primary}
          />
          <text
            x={node.x + 66}
            y={node.y + 23}
            textAnchor="middle"
            fill={theme.text.primary}
            fontSize={11}
          >
            {LABELS[node.id]}
          </text>
        </g>
      ))}
    </svg>
  );
}
