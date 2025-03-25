import { Duration } from '../../utils/duration.js';
import { LinearBackoff } from './linear-backoff.js';

test.each([
  {
    attemptsDone: 1,
    increment: Duration.minutes(1),
    expected: '2025-01-01T00:01:00.000Z',
  },
  {
    attemptsDone: 2,
    increment: Duration.minutes(1),
    expected: '2025-01-01T00:02:00.000Z',
  },
  {
    attemptsDone: 3,
    increment: Duration.minutes(1),
    expected: '2025-01-01T00:03:00.000Z',
  },
])('scheduleFor', ({ attemptsDone, increment, expected }) => {
  const now = new Date('2025-01-01T00:00:00Z');
  const strategy = new LinearBackoff({ increment: increment });

  const result = strategy.scheduleFor({ now, attemptsDone, attemptsMax: 10 });
  expect(result.toISOString()).toBe(expected);
});
