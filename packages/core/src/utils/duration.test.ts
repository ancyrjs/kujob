import { Duration } from './duration.js';

test('defaults to milliseconds', () => {
  expect(new Duration(60).toMilliseconds()).toBe(60);
});

test('conversions to milliseconds', () => {
  expect(Duration.milliseconds(60).toMilliseconds()).toBe(60);
  expect(Duration.seconds(1).toMilliseconds()).toBe(1_000);
  expect(Duration.minutes(1).toMilliseconds()).toBe(60_000);
  expect(Duration.hours(1).toMilliseconds()).toBe(3_600_000);
  expect(Duration.days(1).toMilliseconds()).toBe(86_400_000);
});

test('add duration to date', () => {
  const now = new Date('2025-01-01T00:00:00Z');
  const expected = new Date('2025-01-01T00:00:01Z');
  expect(Duration.seconds(1).addToDate(now)).toEqual(expected);
});
