import { Kujob, Queue, StepLooper } from '@ancyrjs/kujob-core';
import { waitEndOfLoop } from '@ancyrjs/kujob-testing';

export interface Tester {
  beforeAll(): Promise<void>;

  beforeEach(): Promise<void>;

  afterAll(): Promise<void>;

  afterEach(): Promise<void>;

  getKujob(): Kujob;

  runOneBatch(queue: Queue): Promise<void>;

  name(): string;
}

export abstract class BaseTester implements Tester {
  async beforeAll(): Promise<void> {}

  async beforeEach(): Promise<void> {}

  async afterAll(): Promise<void> {}

  async afterEach(): Promise<void> {}

  abstract getKujob(): Kujob;

  abstract name(): string;

  async runOneBatch(queue: Queue): Promise<void> {
    const looper = new StepLooper();
    queue.setLooper(looper);
    await looper.forward();
    await waitEndOfLoop();
  }

  toString() {
    return this.name();
  }
}
