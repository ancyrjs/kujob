import { Kujob } from '../../src/index.js';
import { waitFor } from './wait-for.js';
import { Queue } from '../../src/core/queue.js';

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
    queue.startProcessing();
    await waitFor(1);
    queue.stopProcessing();
  }

  toString() {
    return this.name();
  }
}
