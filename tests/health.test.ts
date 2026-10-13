import { describe, expect, it } from 'vitest';
import { GEN1_METRIC, healthQuery, healthRows, RUN_METRIC } from '../functions/src/health';

const run = (service: string, cls: string, n: number) => ({ resource: { labels: { service_name: service } }, metric: { labels: { response_code_class: cls } }, points: [{ value: { int64Value: String(n) } }] });

describe('function health (ADMIN-14)', () => {
  it('adds up runs and 4xx/5xx errors per function, errors first, then busiest', () => {
    const rows = healthRows({ timeSeries: [
      run('reminderssend', '2xx', 900), run('weeklyrecap', '2xx', 1), run('recapsend', '2xx', 40), run('recapsend', '5xx', 3),
      run('understandvoice', '4xx', 2), run('understandvoice', '2xx', 50), run('idle', '2xx', 0),
    ] }, { timeSeries: [
      { resource: { labels: { function_name: 'signedUp' } }, metric: { labels: { status: 'ok' } }, points: [{ value: { int64Value: '5' } }] },
      { resource: { labels: { function_name: 'signedUp' } }, metric: { labels: { status: 'error' } }, points: [{ value: { int64Value: '1' } }] },
    ] }, 'tiktym');
    expect(rows.map(r => [r.name, r.runs, r.errors])).toEqual([
      ['recapsend', 43, 3], ['understandvoice', 52, 2], ['signedUp', 6, 1], ['reminderssend', 900, 0], ['weeklyrecap', 1, 0],
    ]);
    expect(rows[0].logs).toBe('https://console.cloud.google.com/run/detail/asia-south1/recapsend/logs?project=tiktym');
    expect(rows[2].logs).toBe('https://console.cloud.google.com/functions/details/asia-south1/signedUp?project=tiktym&tab=logs');
  });

  it('is empty when nothing ran', () => {
    expect(healthRows({}, {}, 'tiktym')).toEqual([]);
  });

  it('asks Monitoring for the last 24 hours, summed per function and outcome', () => {
    const q = healthQuery(RUN_METRIC, new Date('2026-10-13T12:00:00Z'));
    expect(q.get('filter')).toBe('metric.type = "run.googleapis.com/request_count"');
    expect(q.get('interval.startTime')).toBe('2026-10-12T12:00:00.000Z');
    expect(q.getAll('aggregation.groupByFields')).toEqual(['resource.label.service_name', 'metric.label.response_code_class']);
    expect(healthQuery(GEN1_METRIC, new Date()).getAll('aggregation.groupByFields')).toEqual(['resource.label.function_name', 'metric.label.status']);
  });

  it('lists a second-generation function once, under its readable name, with Cloud Run\'s counts (ADMIN-14)', () => {
    const fn = (name: string, status: string, n: number) => ({ resource: { labels: { function_name: name } }, metric: { labels: { status } }, points: [{ value: { int64Value: String(n) } }] });
    const rows = healthRows(
      { timeSeries: [run('remindersend', '2xx', 10), run('remindersend', '5xx', 7), run('adminmetrics', '2xx', 11)] },
      { timeSeries: [fn('reminderSend', 'ok', 10), fn('reminderSend', 'error', 6), fn('adminMetrics', 'ok', 11), fn('signedUp', 'ok', 2)] },
      'tiktym',
    );
    expect(rows.map(r => [r.name, r.runs, r.errors])).toEqual([['reminderSend', 17, 7], ['adminMetrics', 11, 0], ['signedUp', 2, 0]]);
    expect(rows[0].logs).toBe('https://console.cloud.google.com/run/detail/asia-south1/remindersend/logs?project=tiktym');
    expect(rows[2].logs).toContain('/functions/details/asia-south1/signedUp?');
  });
});
