import { InMemoryTester } from './in-memory-tester.js';
import { Tester } from './tester.js';

const allDrivers = [new InMemoryTester()];

export const getTestedDrivers = (props?: { isolate?: any }): Tester[] => {
  if (props?.isolate) {
    const klass = props.isolate;
    return allDrivers.filter((driver) => driver instanceof klass);
  }

  return allDrivers;
};
