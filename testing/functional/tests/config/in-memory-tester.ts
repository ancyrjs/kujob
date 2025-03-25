import { Kujob } from '@ancyrjs/kujob-core';
import { InMemoryDriver } from '@ancyrjs/kujob-in-memory';
import { BaseTester } from './tester.js';

export class InMemoryTester extends BaseTester {
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
