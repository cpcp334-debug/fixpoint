/** Role-aware suggested prompts for the Co-Founder UI (Phase 2G.5). */

const SHARED_FOCUS = "What should I focus on today?";

export function suggestedPromptsForRole(role: string): string[] {
  if (role === "sales") {
    return [
      SHARED_FOCUS,
      "Which HOT leads need attention?",
      "Which HOT leads need follow-up?",
      "Which quotes need follow-up?",
      "Today's Business",
      "Propose follow-ups for HOT leads without tasks",
    ];
  }
  if (role === "supervisor") {
    return [
      SHARED_FOCUS,
      "What jobs need attention?",
      "Today's jobs and assignments",
      "Open work orders needing QC",
      "Pending bookings",
      "What is the process after a work order is completed?",
    ];
  }
  if (role === "technician") {
    return [
      SHARED_FOCUS,
      "What jobs are assigned to me?",
      "What is our SOP for a site visit?",
      "What is the process after a work order is completed?",
      "Relevant SOP for my assigned work",
    ];
  }
  if (role === "customer_service") {
    return [
      SHARED_FOCUS,
      "Summarize customer complaints",
      "Pending reviews and low ratings",
      "Unanswered Q&A",
      "Pending bookings",
      "What is our SOP for handling a customer complaint?",
    ];
  }
  if (role === "content_manager") {
    return [
      SHARED_FOCUS,
      "Unanswered Q&A needing moderation",
      "Pending reviews for content",
      "Q&A summary",
      "What content items need attention?",
    ];
  }
  if (role === "manager" || role === "super_admin" || role === "admin") {
    return [
      "Today's Business",
      SHARED_FOCUS,
      "Which HOT leads need attention?",
      "Which quotes need follow-up?",
      "What jobs need attention?",
      "Which invoices are overdue?",
      "Which AMC renewals are approaching?",
      "Summarize customer complaints",
    ];
  }
  return [
    SHARED_FOCUS,
    "Today's Business",
    "What jobs need attention?",
    "Summarize customer complaints",
  ];
}

export function dashboardPromptsForRole(role: string): Array<{ label: string; q: string }> {
  return suggestedPromptsForRole(role)
    .slice(0, 5)
    .map((q) => ({ label: q, q }));
}
