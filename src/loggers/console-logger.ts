import { Logger } from './logger.js';

export class ConsoleLogger implements Logger {
  warn(message: string): void {
    console.warn(message);
  }
}
