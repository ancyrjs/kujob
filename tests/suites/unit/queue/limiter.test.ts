import { DefaultLimiter } from '../../../../src/queue/limiter.js';

describe('default limiter', () => {
  test('limit', () => {
    const limiter = new DefaultLimiter({
      max: 10,
      every: 10,
    });

    expect(limiter.jobsPerMinute()).toBe(60);
  });
});
