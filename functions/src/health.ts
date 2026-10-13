// The Health page (ADMIN-14): each Cloud Function's runs and errors in the last 24 hours, from Cloud Monitoring. Pure,
// so it's unit-tested (tests/health.test.ts); index.ts asks Monitoring. Second-generation functions run on Cloud Run
// (one service each, named in lower case); the first-generation signedUp trigger reports as a Cloud Function.

export const RUN_METRIC = 'run.googleapis.com/request_count';
export const GEN1_METRIC = 'cloudfunctions.googleapis.com/function/execution_count';

export interface HealthRow { name: string; runs: number; errors: number; logs: string }

type Series = { metric?: { labels?: Record<string, string> }; resource?: { labels?: Record<string, string> }; points?: { value?: { int64Value?: string; doubleValue?: number } }[] };
type Answer = { timeSeries?: Series[] };

const total = (s: Series) => (s.points ?? []).reduce((a, p) => a + Number(p.value?.int64Value ?? p.value?.doubleValue ?? 0), 0);

/**
 * Rows from the two Monitoring answers, one per function, errors first, then busiest; a function with no runs isn't
 * listed. Monitoring reports a second-generation function twice, as a Cloud Run service (lower case) and as a Cloud
 * Function (camel case): they're merged under the readable name, using Cloud Run's counts (4xx and 5xx responses are
 * errors). The first-generation signedUp trigger has only the Cloud Function counts (any status but ok is an error).
 */
export function healthRows(run: Answer, gen1: Answer, project: string, region = 'asia-south1'): HealthRow[] {
  type Counts = { runs: number; errors: number };
  const byKey = new Map<string, { name?: string; service?: string; run?: Counts; fn?: Counts }>();
  const entry = (name: string) => byKey.get(name.toLowerCase()) ?? byKey.set(name.toLowerCase(), {}).get(name.toLowerCase())!;
  const add = (c: Counts | undefined, n: number, error: boolean): Counts => ({ runs: (c?.runs ?? 0) + n, errors: (c?.errors ?? 0) + (error ? n : 0) });
  for (const s of run.timeSeries ?? []) {
    const name = s.resource?.labels?.service_name;
    if (!name) continue;
    const cls = s.metric?.labels?.response_code_class ?? '';
    const e = entry(name);
    e.service = name;
    e.run = add(e.run, total(s), cls === '4xx' || cls === '5xx');
  }
  for (const s of gen1.timeSeries ?? []) {
    const name = s.resource?.labels?.function_name;
    if (!name) continue;
    const e = entry(name);
    e.name = name;
    e.fn = add(e.fn, total(s), (s.metric?.labels?.status ?? 'ok') !== 'ok');
  }
  const rows: HealthRow[] = [];
  for (const e of byKey.values()) {
    const counts = e.run ?? e.fn!;
    const name = e.name ?? e.service!;
    const logs = e.service
      ? `https://console.cloud.google.com/run/detail/${region}/${e.service}/logs?project=${project}`
      : `https://console.cloud.google.com/functions/details/${region}/${name}?project=${project}&tab=logs`;
    rows.push({ name, runs: counts.runs, errors: counts.errors, logs });
  }
  return rows.filter(r => r.runs > 0).sort((a, b) => b.errors - a.errors || b.runs - a.runs || a.name.localeCompare(b.name));
}

/** The Monitoring query for one metric over the last 24 hours, summed per function and outcome. */
export function healthQuery(metric: string, now: Date): URLSearchParams {
  const groupBy = metric === RUN_METRIC ? ['resource.label.service_name', 'metric.label.response_code_class'] : ['resource.label.function_name', 'metric.label.status'];
  const q = new URLSearchParams({
    filter: `metric.type = "${metric}"`,
    'interval.startTime': new Date(now.getTime() - 86_400_000).toISOString(), 'interval.endTime': now.toISOString(),
    'aggregation.alignmentPeriod': '86400s', 'aggregation.perSeriesAligner': 'ALIGN_SUM', 'aggregation.crossSeriesReducer': 'REDUCE_SUM',
  });
  for (const f of groupBy) q.append('aggregation.groupByFields', f);
  return q;
}
