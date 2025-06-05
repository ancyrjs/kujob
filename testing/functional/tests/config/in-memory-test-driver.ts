import { Kujob } from '@kujob/core';
import { InMemoryDriver } from '@kujob/in-memory';
import { BaseTestDriver } from './test-driver.js';

export class InMemoryTestDriver extends BaseTestDriver {
  // @ts-ignore
  private kujob: Kujob;

  async beforeAll() {
    this.kujob = new Kujob({
      driver: new InMemoryDriver(),
    });
  }

  getKujob() {
    return this.kujob;
  }

  name(): string {
    return 'in-memory';
  }
}
