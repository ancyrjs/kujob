import { InMemoryTester } from './in-memory-tester.js';
import { Tester } from './tester.js';

export const getTestedDrivers = (): Tester[] => [new InMemoryTester()];
