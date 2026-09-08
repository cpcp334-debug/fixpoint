export type ToolResultCard = {
  id: string;
  tool: string;
  title: string;
  count?: number;
  explanation: string;
  href?: string;
  context?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function num(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function str(value: unknown) {
  return typeof value === "string" ? value : "";
}

/** Map successful tool payloads into compact UI cards. Prose replies stay separate. */
export function toolResultCards(tool: string, data: unknown): ToolResultCard[] {
  const row = asRecord(data);
  if (!row) return [];

  if (tool === "get_priority_actions") {
    const actions = Array.isArray(row.actions) ? row.actions : [];
    return actions.slice(0, 8).map((item, index) => {
      const action = asRecord(item) || {};
      return {
        id: `priority-${str(action.id) || index}`,
        tool,
        title: str(action.title) || "Priority action",
        count: num(action.count),
        explanation: str(action.explanation) || "",
        href: str(action.href) || undefined,
        context: str(action.context) || undefined,
      };
    });
  }

  if (tool === "get_followup_gaps") {
    const count = num(row.count) || 0;
    return [
      {
        id: "followup-gaps",
        tool,
        title: "HOT follow-up gaps",
        count,
        explanation: `${count} HOT lead${count === 1 ? "" : "s"} with no open follow-up task.`,
        href: "/admin/leads?class=HOT",
        context: "LeadScore HOT · no open OpsTask follow_up",
      },
    ];
  }

  if (tool === "get_daily_brief") {
    const cards: ToolResultCard[] = [];
    const sections = asRecord(row.sections);
    const pushNamed = (list: unknown, prefix: string) => {
      if (!Array.isArray(list)) return;
      for (const item of list.slice(0, 6)) {
        const kpi = asRecord(item);
        if (!kpi) continue;
        cards.push({
          id: `${prefix}-${str(kpi.id) || cards.length}`,
          tool,
          title: str(kpi.label) || str(kpi.title) || "Metric",
          count: num(kpi.count),
          explanation: str(row.window) ? `Window: ${str(row.window)}` : "From approved aggregations.",
          href: str(kpi.href) || undefined,
          context: prefix,
        });
      }
    };
    if (sections) {
      pushNamed(sections.business, "business");
      pushNamed(sections.operations, "operations");
      pushNamed(sections.finance, "finance");
      pushNamed(sections.customerExperience, "cx");
      pushNamed(sections.amc, "amc");
    } else if (Array.isArray(row.kpis)) {
      pushNamed(row.kpis, "kpi");
    }
    return cards.slice(0, 10);
  }

  if (tool === "get_amc_expiring") {
    const count = num(row.count) || 0;
    return [
      {
        id: "amc-expiring",
        tool,
        title: "AMC renewals approaching",
        count,
        explanation: `${count} contract${count === 1 ? "" : "s"} ending within ${num(row.windowDays) || 30} days.`,
        href: "/admin/amc",
        context: "AMC endDate window",
      },
    ];
  }

  if (tool === "get_quote_pipeline" || tool === "get_booking_pipeline" || tool === "get_invoice_status" || tool === "get_work_order_status") {
    const byStatus = Array.isArray(row.byStatus) ? row.byStatus : [];
    const href =
      tool === "get_quote_pipeline"
        ? "/admin/quotes"
        : tool === "get_booking_pipeline"
          ? "/admin/bookings"
          : tool === "get_invoice_status"
            ? "/admin/invoices"
            : "/admin/work-orders";
    return byStatus.slice(0, 8).map((item, index) => {
      const status = asRecord(item) || {};
      return {
        id: `${tool}-${str(status.status) || index}`,
        tool,
        title: str(status.status) || "Status",
        count: num(status.count),
        explanation: "Stored status counts only. Amounts are not summed from labels.",
        href,
        context: tool.replace("get_", "").replaceAll("_", " "),
      };
    });
  }

  if (tool === "get_hot_leads") {
    const leads = Array.isArray(row.leads) ? row.leads : Array.isArray(row) ? row : [];
    return [
      {
        id: "hot-leads",
        tool,
        title: "HOT leads",
        count: leads.length,
        explanation: `${leads.length} recent HOT lead${leads.length === 1 ? "" : "s"} from LeadScore.`,
        href: "/admin/leads?class=HOT",
        context: "LeadScore effectiveClass HOT",
      },
    ];
  }

  if (tool === "get_review_summary") {
    return [
      {
        id: "reviews",
        tool,
        title: "Reviews",
        explanation: "Review counts by status and stars from stored records.",
        href: "/admin/reviews",
        context: "Review summary",
      },
    ];
  }

  if (tool === "get_qna_summary") {
    return [
      {
        id: "qna",
        tool,
        title: "Q&A moderation",
        explanation: "Question counts by moderation status.",
        href: "/admin/questions",
        context: "Q&A summary",
      },
    ];
  }

  return [];
}
