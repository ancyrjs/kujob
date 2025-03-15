import { ILogger } from '../logger.js';

export class ConsoleLogger implements ILogger {
  info(message: string): void {
    console.log(message);
  }

  warn(message: string): void {
    console.warn(message);
  }
}
