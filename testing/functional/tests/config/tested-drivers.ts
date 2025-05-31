import { InMemoryTestDriver } from './in-memory-test-driver.js';
import { PostgresqlTestDriver } from './postgresql-test-driver.js';
import { TestDriver } from './test-driver.js';

const allDrivers = [new InMemoryTestDriver(), new PostgresqlTestDriver()];

export const getTestedDriver = (): TestDriver => {
  const driverName = process.env.DRIVER ?? 'in-memory';
  const testDriver = allDrivers.find((d) => d.name() === driverName);

  if (!testDriver) {
    throw new Error(
      `Test driver "${driverName}" not found. Available drivers: ${allDrivers.map((d) => d.name()).join(', ')}`,
    );
  }

  return testDriver;
};
