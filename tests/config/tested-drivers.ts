import { InMemoryTester } from './in-memory-tester.js';
import { Tester } from './tester.js';

export const getTestedDrivers = (props?: { isolate?: any }): Tester[] => {
  const drivers = [new InMemoryTester()];

  if (props?.isolate) {
    const klass = props.isolate;
    return drivers.filter((driver) => driver instanceof klass);
  }

  return drivers;
};
