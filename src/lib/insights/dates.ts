export const BUSINESS_TZ = "Asia/Dubai";
export const DUBAI_OFFSET = "+04:00";

export const RANGE_PRESETS = ["today", "yesterday", "7d", "30d", "month", "prev_month", "custom"] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number];

export const RANGE_LABELS: Record<RangePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  month: "This month",
  prev_month: "Previous month",
  custom: "Custom",
};

export type DateWindow = {
  preset: RangePreset;
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
  label: string;
  fromDate: string;
  toDate: string;
};

function dubaiYmd(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function startOfDubaiDate(ymd: string) {
  return new Date(`${ymd}T00:00:00${DUBAI_OFFSET}`);
}

function addDays(ymd: string, days: number) {
  const [year, month, day] = ymd.split("-").map(Number);
  const utc = Date.UTC(year, month - 1, day + days);
  return dubaiYmd(new Date(utc));
}

function monthStart(ymd: string) {
  return `${ymd.slice(0, 7)}-01`;
}

function nextMonthStart(ymd: string) {
  const [year, month] = ymd.slice(0, 7).split("-").map(Number);
  const next = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  return next;
}

export function isRangePreset(value: string | undefined): value is RangePreset {
  return (RANGE_PRESETS as readonly string[]).includes(value || "");
}

export function resolveWindow(opts: { preset?: string; range?: string; from?: string; to?: string }, now = new Date()): DateWindow {
  const today = dubaiYmd(now);
  const tomorrow = addDays(today, 1);
  const requested = opts.preset || opts.range;
  let preset: RangePreset = isRangePreset(requested) ? requested : "30d";
  let fromDate = today;
  let toExclusive = tomorrow;
  let label = "Today";

  if (preset === "custom" && opts.from && opts.to) {
    fromDate = opts.from;
    toExclusive = addDays(opts.to, 1);
    label = `${opts.from} to ${opts.to}`;
  } else if (preset === "yesterday") {
    fromDate = addDays(today, -1);
    toExclusive = today;
    label = "Yesterday";
  } else if (preset === "7d") {
    fromDate = addDays(today, -6);
    label = "Last 7 days";
  } else if (preset === "30d") {
    fromDate = addDays(today, -29);
    label = "Last 30 days";
  } else if (preset === "month") {
    fromDate = monthStart(today);
    toExclusive = nextMonthStart(today);
    label = "This month";
  } else if (preset === "prev_month") {
    const thisMonth = monthStart(today);
    toExclusive = thisMonth;
    fromDate = monthStart(addDays(thisMonth, -1));
    label = "Previous month";
  } else {
    preset = "today";
    fromDate = today;
    toExclusive = tomorrow;
    label = "Today";
  }

  const start = startOfDubaiDate(fromDate);
  const end = startOfDubaiDate(toExclusive);
  const ms = end.getTime() - start.getTime();
  const previousEnd = start;
  const previousStart = new Date(start.getTime() - ms);
  const toDate = addDays(toExclusive, -1);
  return { preset, start, end, previousStart, previousEnd, label, fromDate, toDate };
}

export function createdAtRange(start: Date, end: Date) {
  return { gte: start, lt: end };
}
