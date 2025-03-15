import { ILogger } from '../../src/logger.js';

export class StackLogger implements ILogger {
  public infos: string[] = [];
  public warnings: string[] = [];

  info(message: string): void {
    this.infos.push(message);
  }

  warn(message: string) {
    this.warnings.push(message);
  }
}
