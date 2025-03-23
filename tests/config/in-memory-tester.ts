import { Kujob } from '../../src/index.js';
import { BaseTester } from './tester.js';
import { InMemoryDriver } from '../../src/drivers/in-memory/in-memory-driver.js';

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
