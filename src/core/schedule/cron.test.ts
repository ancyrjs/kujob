import { CronSchedule } from './cron-schedule.js';

const NOW = new Date('2025-01-01T00:00:00Z');

test.each([
  {
    pattern: '* * * * *',
    expected: '2025-01-01T00:01:00.000Z',
  },
  {
    pattern: '0 0 * * *',
    expected: '2025-01-02T00:00:00.000Z',
  },
  {
    pattern: '0 0 1 * *',
    expected: '2025-02-01T00:00:00.000Z',
  },
  {
    pattern: '0 0 1 1 *',
    expected: '2026-01-01T00:00:00.000Z',
  },
  {
    pattern: '0 0 1 1 0',
    expected: '2025-01-05T00:00:00.000Z',
  },
])('$pattern', ({ pattern, expected }) => {
  const cron = new CronSchedule({
    pattern,
    timezone: 'utc',
  });

  expect(
    cron.firstRunAt({
      now: NOW,
    }),
  ).toEqual(new Date(expected));
});
