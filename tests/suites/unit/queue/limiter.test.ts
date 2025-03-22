import { DefaultLimitSpecification } from '../../../../src/queue/limit-spec.js';

describe('default limiter', () => {
  test('limit', () => {
    const limiter = new DefaultLimitSpecification({
      max: 10,
      every: 10,
    });

    expect(limiter.jobsPerMinute()).toBe(60);
  });
});
