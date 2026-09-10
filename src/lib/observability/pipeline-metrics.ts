/**
 * Lightweight observability hooks for content generation / publication pipeline.
 * Emits structured counters for logs/metrics adapters. No external vendor required.
 */
export type PipelineMetric =
  | "generation_job_failed"
  | "generation_job_succeeded"
  | "generation_queue_backlog"
  | "generation_stale_reaped"
  | "publication_quality_failed"
  | "publication_quality_review"
  | "publication_quality_publishable"
  | "sitemap_build_error"
  | "image_resolve_fallback"
  | "db_error";

export type MetricEvent = {
  metric: PipelineMetric;
  value?: number;
  tags?: Record<string, string | number | boolean | null | undefined>;
  at?: string;
};

/** Pluggable sink — default is console structured log. */
let sink: (event: MetricEvent) => void = (event) => {
  // eslint-disable-next-line no-console
  console.info(
    JSON.stringify({
      type: "alnajah_pipeline_metric",
      at: event.at || new Date().toISOString(),
      metric: event.metric,
      value: event.value ?? 1,
      tags: event.tags || {},
    }),
  );
};

export function setPipelineMetricSink(next: (event: MetricEvent) => void) {
  sink = next;
}

export function recordPipelineMetric(event: MetricEvent) {
  try {
    sink(event);
  } catch {
    // never throw from metrics
  }
}
