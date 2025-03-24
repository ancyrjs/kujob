import { DateProvider } from './date-provider.js';

export class CurrentDateProvider implements DateProvider {
  static INSTANCE = new CurrentDateProvider();

  private constructor() {}

  getDate(): Date {
    return new Date();
  }
}
