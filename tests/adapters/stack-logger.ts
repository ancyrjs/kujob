import { Logger } from '../../src/loggers/logger.js';

export class StackLogger implements Logger {
  public infos: string[] = [];
  public warnings: string[] = [];

  info(message: string): void {
    this.infos.push(message);
  }

  warn(message: string) {
    this.warnings.push(message);
  }
}
