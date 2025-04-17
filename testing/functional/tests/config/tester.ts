import { Kujob, Queue, StepLooper } from '@racyn/kujob-core';
import { waitEndOfLoop } from '@racyn/kujob-testutils';

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
  async beforeAll(): Promise<void> {
    await this.getKujob().getDriver().start();
  }

  async beforeEach(): Promise<void> {
    await this.getKujob().getDriver().purge();
  }

  async afterAll(): Promise<void> {
    await this.getKujob().getDriver().end();
  }

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
