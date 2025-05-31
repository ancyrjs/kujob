import { expect, test } from 'vitest';
import { CronSchedule } from '../../src/schedule/cron-schedule.js';

test.each([
  {
    pattern: '* * * * *',
    now: '2025-01-01T00:00:00.000Z',
    expected: '2025-01-01T00:01:00.000Z',
  },
  {
    pattern: '0 0 * * *',
    now: '2025-01-01T00:00:00.000Z',

    expected: '2025-01-02T00:00:00.000Z',
  },
  {
    pattern: '0 0 1 * *',
    now: '2025-01-01T00:00:00.000Z',
    expected: '2025-02-01T00:00:00.000Z',
  },
  {
    pattern: '0 0 1 1 *',
    now: '2025-01-01T00:00:00.000Z',
    expected: '2026-01-01T00:00:00.000Z',
  },
  {
    pattern: '0 0 1 1 0',
    now: '2025-01-01T00:00:00.000Z',
    expected: '2025-01-05T00:00:00.000Z',
  },
])('$pattern', ({ pattern, now, expected }) => {
  const cron = new CronSchedule({
    pattern,
    timezone: 'utc',
  });

  expect(
    cron.firstRunAt({
      now: new Date(now),
    }),
  ).toEqual(new Date(expected));
});
